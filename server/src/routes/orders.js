const express = require('express');
const { pool, query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const {
  DELIVERY_MIN_DAYS,
  DELIVERY_MAX_DAYS,
  deliveryLabel,
} = require('../constants/delivery');

const router = express.Router();

function genOrderNumber() {
  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KF-${stamp}-${rand}`;
}

// Place order — must be logged in; order is always assigned to the current user
router.post('/', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      county,
      notes,
      items,
      payment_method: paymentMethodRaw,
    } = req.body || {};

    const payment_method = paymentMethodRaw === 'loop' ? 'loop' : 'cod';
    const user_id = req.user.id;

    if (!customer_name || !customer_phone || !delivery_address) {
      return res
        .status(400)
        .json({ error: 'customer_name, customer_phone and delivery_address are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    if (payment_method === 'loop') {
      const settingsRes = await query(
        'SELECT loop_payments_enabled FROM settings ORDER BY id ASC LIMIT 1'
      );
      const loopEnabled = settingsRes.rows[0]?.loop_payments_enabled;
      const loopPayment = require('../services/loopPayment');
      if (!loopEnabled || !loopPayment.isConfigured()) {
        return res.status(400).json({ error: 'Loop payments are not available' });
      }
    }

    const initialPaymentStatus = payment_method === 'loop' ? 'pending' : 'unpaid';
    const initialOrderStatus = 'pending';

    await client.query('BEGIN');

    const orderNumber = genOrderNumber();
    const productIds = items.map((i) => Number(i.product_id));
    const productsRes = await client.query(
      `SELECT id, name, price, price_type, price_max, stock, is_active FROM products WHERE id = ANY($1::int[])`,
      [productIds]
    );
    const productMap = new Map(productsRes.rows.map((p) => [p.id, p]));

    let total = 0;
    const insertItems = [];
    for (const item of items) {
      const p = productMap.get(Number(item.product_id));
      if (!p || !p.is_active) {
        throw Object.assign(new Error(`Product ${item.product_id} not available`), {
          status: 400,
          expose: true,
        });
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      if (Number(p.stock) <= 0) {
        throw Object.assign(
          new Error(
            `"${p.name}" is out of stock. Please book it instead of ordering.`
          ),
          { status: 400, expose: true }
        );
      }
      if (qty > Number(p.stock)) {
        throw Object.assign(
          new Error(
            `Only ${p.stock} unit(s) of "${p.name}" available (you requested ${qty}).`
          ),
          { status: 400, expose: true }
        );
      }
      const unit = Number(p.price);
      const subtotal = unit * qty;
      const rangeNote =
        p.price_type === 'range' && p.price_max != null
          ? ` [price range KSh ${unit}-KSh ${Number(p.price_max)}]`
          : '';
      total += subtotal;
      insertItems.push({
        product_id: p.id,
        product_name: p.name + rangeNote,
        unit_price: unit,
        quantity: qty,
        subtotal,
      });
    }

    const orderRes = await client.query(
      `INSERT INTO orders
        (order_number, user_id, customer_name, customer_phone, customer_email,
         delivery_address, county, notes, total_amount, status, payment_method, payment_status,
         delivery_min_days, delivery_max_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        orderNumber,
        user_id,
        customer_name,
        customer_phone,
        customer_email || null,
        delivery_address,
        county || null,
        notes || null,
        total,
        initialOrderStatus,
        payment_method,
        initialPaymentStatus,
        DELIVERY_MIN_DAYS,
        DELIVERY_MAX_DAYS,
      ]
    );
    const order = orderRes.rows[0];

    for (const it of insertItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, it.product_id, it.product_name, it.unit_price, it.quantity, it.subtotal]
      );
      await client.query(
        `UPDATE products SET stock = GREATEST(0, stock - $1), updated_at = NOW() WHERE id = $2`,
        [it.quantity, it.product_id]
      );
    }

    await client.query('COMMIT');

    const itemsRes = await query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);

    let paymentInit = null;
    if (payment_method === 'loop') {
      try {
        const loopPayment = require('../services/loopPayment');
        paymentInit = await loopPayment.initiatePayment({ order, phone: customer_phone });
        await query(
          `INSERT INTO payment_transactions
            (order_id, provider, reference, external_id, amount, currency, status, callback_payload)
           VALUES ($1, 'loop', $2, $3, $4, 'KES', 'pending', $5::jsonb)
           ON CONFLICT (reference) DO NOTHING`,
          [
            order.id,
            order.order_number,
            paymentInit.checkoutRequestId || paymentInit.merchantRequestId,
            order.total_amount,
            JSON.stringify({ initiate: paymentInit.raw }),
          ]
        );
      } catch (payErr) {
        console.error('[orders] Loop initiate failed:', payErr.message);
        if (payErr.data) {
          console.error('[orders] Loop API response:', JSON.stringify(payErr.data));
        }
        await query(
          `UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE id = $1`,
          [order.id]
        );
        return res.status(payErr.status === 401 ? 502 : payErr.status || 502).json({
          error: payErr.expose ? payErr.message : 'Could not initiate Loop payment',
          order: { ...order, items: itemsRes.rows, payment_status: 'failed' },
        });
      }
    }

    res.status(201).json({
      order: {
        ...order,
        items: itemsRes.rows,
        delivery_label: deliveryLabel(order.delivery_min_days, order.delivery_max_days),
      },
      payment:
        payment_method === 'loop' && paymentInit
          ? {
              status: 'pending',
              customerMessage: paymentInit.customerMessage,
              checkoutRequestId: paymentInit.checkoutRequestId,
              redirectUrl: paymentInit.redirectUrl,
            }
          : null,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

/** Authenticated customer: list my orders for tracking */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, order_number, total_amount, status, payment_method, payment_status,
              delivery_address, county, delivery_min_days, delivery_max_days,
              created_at, updated_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    const orders = await Promise.all(
      r.rows.map(async (o) => {
        const items = await query(
          'SELECT product_name, quantity, unit_price, subtotal FROM order_items WHERE order_id=$1',
          [o.id]
        );
        return {
          ...o,
          items: items.rows,
          delivery_label: deliveryLabel(o.delivery_min_days, o.delivery_max_days),
        };
      })
    );
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// Public order lookup by order_number (for confirmation page)
router.get('/lookup/:orderNumber', async (req, res, next) => {
  try {
    const o = await query('SELECT * FROM orders WHERE order_number=$1', [req.params.orderNumber]);
    if (!o.rowCount) return res.status(404).json({ error: 'Order not found' });
    const items = await query('SELECT * FROM order_items WHERE order_id=$1', [o.rows[0].id]);
    const order = o.rows[0];
    res.json({
      order: {
        ...order,
        items: items.rows,
        delivery_label: deliveryLabel(order.delivery_min_days, order.delivery_max_days),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
