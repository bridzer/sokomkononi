const express = require('express');
const { pool, query } = require('../db');

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

// Place order (guest or authenticated)
router.post('/', async (req, res, next) => {
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
      user_id,
    } = req.body || {};

    if (!customer_name || !customer_phone || !delivery_address) {
      return res
        .status(400)
        .json({ error: 'customer_name, customer_phone and delivery_address are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    await client.query('BEGIN');

    const orderNumber = genOrderNumber();
    const productIds = items.map((i) => Number(i.product_id));
    const productsRes = await client.query(
      `SELECT id, name, price, stock, is_active FROM products WHERE id = ANY($1::int[])`,
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
      const unit = Number(p.price);
      const subtotal = unit * qty;
      total += subtotal;
      insertItems.push({
        product_id: p.id,
        product_name: p.name,
        unit_price: unit,
        quantity: qty,
        subtotal,
      });
    }

    const orderRes = await client.query(
      `INSERT INTO orders
        (order_number, user_id, customer_name, customer_phone, customer_email,
         delivery_address, county, notes, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING *`,
      [
        orderNumber,
        user_id || null,
        customer_name,
        customer_phone,
        customer_email || null,
        delivery_address,
        county || null,
        notes || null,
        total,
      ]
    );
    const order = orderRes.rows[0];

    for (const it of insertItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, it.product_id, it.product_name, it.unit_price, it.quantity, it.subtotal]
      );
    }

    await client.query('COMMIT');

    const itemsRes = await query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    res.status(201).json({ order: { ...order, items: itemsRes.rows } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// Public order lookup by order_number (for confirmation page)
router.get('/lookup/:orderNumber', async (req, res, next) => {
  try {
    const o = await query('SELECT * FROM orders WHERE order_number=$1', [req.params.orderNumber]);
    if (!o.rowCount) return res.status(404).json({ error: 'Order not found' });
    const items = await query('SELECT * FROM order_items WHERE order_id=$1', [o.rows[0].id]);
    res.json({ order: { ...o.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
