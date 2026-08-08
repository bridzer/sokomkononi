const { query } = require('../db');

async function getReserveHoldHours() {
  const r = await query(
    `SELECT reserve_hold_hours FROM settings ORDER BY id ASC LIMIT 1`
  );
  const hours = Number(r.rows[0]?.reserve_hold_hours);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

/** Expire active reserves past expires_at; restore lot_status when marketplace. */
async function expireStaleReserves(clientQuery = query) {
  const expired = await clientQuery(
    `UPDATE product_reserves
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active' AND expires_at <= NOW()
     RETURNING id, product_id`
  );
  for (const row of expired.rows) {
    await clientQuery(
      `UPDATE products
       SET lot_status = CASE
             WHEN commerce_mode = 'marketplace' AND lot_status = 'reserved' THEN 'listed'
             ELSE lot_status
           END,
           reserve_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1
         AND NOT EXISTS (
           SELECT 1 FROM product_reserves
           WHERE product_id = $1 AND status = 'active'
         )`,
      [row.product_id]
    );
  }
  return expired.rows;
}

async function getActiveReserve(productId, clientQuery = query) {
  await expireStaleReserves(clientQuery);
  const r = await clientQuery(
    `SELECT * FROM product_reserves
     WHERE product_id = $1 AND status = 'active' AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [productId]
  );
  return r.rows[0] || null;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').trim();
}

/** Last 9 digits — works for KE +2547… / 07… forms. */
function phoneCore(phone) {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.slice(-9);
}

function phonesMatch(a, b) {
  const ca = phoneCore(a);
  const cb = phoneCore(b);
  if (!ca || !cb) return false;
  return ca === cb;
}

/**
 * Create a soft reserve. Marketplace only, stock > 0.
 * One active reserve per product.
 */
async function createReserve({
  productId,
  customerName,
  customerPhone,
  quantity = 1,
  source = 'whatsapp_hold',
}) {
  await expireStaleReserves();

  const prod = await query(
    `SELECT id, stock, commerce_mode, lot_status, is_active
     FROM products WHERE id = $1`,
    [productId]
  );
  const product = prod.rows[0];
  if (!product || !product.is_active) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  if (product.commerce_mode !== 'marketplace') {
    const err = new Error('Soft holds are only available for marketplace lots');
    err.status = 400;
    throw err;
  }
  if (Number(product.stock) <= 0) {
    const err = new Error('Out of stock — use the waitlist booking instead');
    err.status = 400;
    throw err;
  }
  if (['sold', 'expired', 'draft'].includes(product.lot_status)) {
    const err = new Error('This lot is not available to hold');
    err.status = 400;
    throw err;
  }

  const qty = Math.max(1, Math.min(Number(quantity) || 1, Number(product.stock)));
  const existing = await getActiveReserve(productId);
  if (existing) {
    if (phonesMatch(existing.customer_phone, customerPhone)) {
      return { reserve: existing, alreadyHeld: true };
    }
    const err = new Error(
      'This lot is already on hold for another buyer. Try again after the hold expires.'
    );
    err.status = 409;
    throw err;
  }

  const hours = await getReserveHoldHours();
  const insert = await query(
    `INSERT INTO product_reserves
       (product_id, customer_name, customer_phone, quantity, source, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW() + ($6::text || ' hours')::interval)
     RETURNING *`,
    [
      productId,
      String(customerName).trim(),
      normalizePhone(customerPhone),
      qty,
      source,
      String(hours),
    ]
  );
  const reserve = insert.rows[0];

  await query(
    `UPDATE products
     SET lot_status = 'reserved',
         reserve_expires_at = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [productId, reserve.expires_at]
  );

  return { reserve, alreadyHeld: false };
}

async function cancelReserve(reserveId, { productId } = {}) {
  const r = await query(
    `UPDATE product_reserves
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [reserveId]
  );
  const reserve = r.rows[0];
  if (!reserve) return null;
  const pid = productId || reserve.product_id;
  await query(
    `UPDATE products
     SET lot_status = CASE
           WHEN commerce_mode = 'marketplace' THEN 'listed'
           ELSE lot_status
         END,
         reserve_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [pid]
  );
  return reserve;
}

module.exports = {
  getReserveHoldHours,
  expireStaleReserves,
  getActiveReserve,
  createReserve,
  cancelReserve,
  phonesMatch,
  normalizePhone,
};
