const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool, query } = require('../db');
const loopPayment = require('../services/loopPayment');
const { optionalAuth } = require('../middleware/auth');
const { canAccessOrder } = require('../utils/orderAccess');

const router = express.Router();

const paymentActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests, try again later' },
});

async function getSettingsRow() {
  const r = await query('SELECT loop_payments_enabled FROM settings ORDER BY id ASC LIMIT 1');
  return r.rows[0] || { loop_payments_enabled: false };
}

async function isLoopEnabledForCheckout() {
  if (!loopPayment.isConfigured()) return false;
  const settings = await getSettingsRow();
  return Boolean(settings.loop_payments_enabled);
}

function viewTokenFromReq(req) {
  return (
    req.body?.view_token ||
    req.query?.t ||
    req.headers['x-order-token'] ||
    ''
  );
}

/** Public — which payment methods are available at checkout */
router.get('/options', async (_req, res, next) => {
  try {
    const loopEnabled = await isLoopEnabledForCheckout();
    res.json({
      methods: [
        { id: 'cod', label: 'Pay on delivery', description: 'Pay when your order is delivered' },
        ...(loopEnabled
          ? [
              {
                id: 'loop',
                label: 'Pay with Loop',
                description: 'Pay now via Loop mobile prompt on your phone',
              },
            ]
          : []),
      ],
      loopEnabled,
    });
  } catch (err) {
    next(err);
  }
});

/** Initiate Loop payment — owner auth or view_token required */
router.post('/loop/initiate', paymentActionLimiter, optionalAuth, async (req, res, next) => {
  try {
    if (!(await isLoopEnabledForCheckout())) {
      return res.status(403).json({ error: 'Loop payments are not enabled' });
    }

    const { order_number } = req.body || {};
    if (!order_number) {
      return res.status(400).json({ error: 'order_number is required' });
    }

    const orderRes = await query('SELECT * FROM orders WHERE order_number = $1', [order_number]);
    if (!orderRes.rowCount) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRes.rows[0];

    if (!canAccessOrder(order, { viewToken: viewTokenFromReq(req), user: req.user })) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_method !== 'loop') {
      return res.status(400).json({ error: 'Order is not a Loop payment order' });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const result = await loopPayment.initiatePayment({
      order,
      phone: order.customer_phone,
    });

    await query(
      `INSERT INTO payment_transactions
        (order_id, provider, reference, external_id, amount, currency, status, callback_payload)
       VALUES ($1, 'loop', $2, $3, $4, 'KES', 'pending', $5::jsonb)
       ON CONFLICT (reference) DO UPDATE SET
         external_id = COALESCE(EXCLUDED.external_id, payment_transactions.external_id),
         callback_payload = EXCLUDED.callback_payload,
         updated_at = NOW()`,
      [
        order.id,
        order.order_number,
        result.checkoutRequestId || result.merchantRequestId,
        order.total_amount,
        JSON.stringify({ initiate: result.raw }),
      ]
    );

    await query(
      `UPDATE orders SET payment_status = 'pending', updated_at = NOW() WHERE id = $1`,
      [order.id]
    );

    res.json({
      order_number: order.order_number,
      payment_status: 'pending',
      customerMessage: result.customerMessage,
      checkoutRequestId: result.checkoutRequestId,
      redirectUrl: result.redirectUrl,
    });
  } catch (err) {
    next(err);
  }
});

/** Poll payment status — owner auth or view_token required */
router.get(
  '/loop/status/:orderNumber',
  paymentActionLimiter,
  optionalAuth,
  async (req, res, next) => {
    try {
      const orderRes = await query(
        `SELECT order_number, view_token, user_id, payment_method, payment_status, status
         FROM orders WHERE order_number = $1`,
        [req.params.orderNumber]
      );
      if (!orderRes.rowCount) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orderRes.rows[0];
      if (!canAccessOrder(order, { viewToken: viewTokenFromReq(req), user: req.user })) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({
        order_number: order.order_number,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.status,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Loop webhook — must receive raw body for signature verification.
 * Mounted separately in index.js with express.raw().
 */
async function handleLoopCallback(req, res) {
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Invalid callback body' });
  }

  if (!loopPayment.verifyWebhookSignature(rawBody, req.headers)) {
    console.warn('[loop:callback] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const parsed = loopPayment.parseCallbackPayload(payload);
  const reference = parsed.reference;

  if (!reference) {
    console.warn('[loop:callback] Missing order reference', payload);
    return res.status(400).json({ error: 'Missing reference' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      'SELECT * FROM orders WHERE order_number = $1 FOR UPDATE',
      [reference]
    );
    if (!orderRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRes.rows[0];

    if (order.payment_status === 'paid') {
      await client.query('COMMIT');
      return res.json({ received: true, status: 'already_paid' });
    }

    const newPaymentStatus = parsed.success ? 'paid' : 'failed';

    await client.query(
      `UPDATE orders SET
         payment_status = $1,
         status = CASE WHEN $2::boolean THEN 'confirmed' ELSE status END,
         updated_at = NOW()
       WHERE id = $3`,
      [newPaymentStatus, parsed.success, order.id]
    );

    await client.query(
      `UPDATE payment_transactions SET
         status = $1,
         external_id = COALESCE($2, external_id),
         callback_payload = $3::jsonb,
         updated_at = NOW()
       WHERE reference = $4`,
      [
        parsed.success ? 'completed' : 'failed',
        parsed.checkoutRequestId || parsed.receiptNumber,
        JSON.stringify(payload),
        reference,
      ]
    );

    await client.query('COMMIT');
    console.log(`[loop:callback] ${reference} -> ${newPaymentStatus}`);
    return res.json({ received: true, status: newPaymentStatus });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[loop:callback] error:', err.message);
    return res.status(500).json({ error: 'Processing failed' });
  } finally {
    client.release();
  }
}

module.exports = router;
module.exports.handleLoopCallback = handleLoopCallback;
