const express = require('express');
const { query } = require('../db');

const router = express.Router();

/** Public: book an out-of-stock product */
router.post('/', async (req, res, next) => {
  try {
    const {
      product_id,
      customer_name,
      customer_phone,
      customer_email,
      quantity,
      notes,
    } = req.body || {};

    if (!product_id || !customer_name || !customer_phone) {
      return res.status(400).json({
        error: 'product_id, customer_name and customer_phone are required',
      });
    }

    const productRes = await query(
      `SELECT id, name, stock, is_active FROM products WHERE id = $1`,
      [Number(product_id)]
    );
    if (!productRes.rowCount || !productRes.rows[0].is_active) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (Number(productRes.rows[0].stock) > 0) {
      return res.status(400).json({
        error: 'This product is in stock — add it to your cart instead of booking',
      });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const r = await query(
      `INSERT INTO product_bookings
        (product_id, customer_name, customer_phone, customer_email, quantity, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        productRes.rows[0].id,
        customer_name.trim(),
        customer_phone.trim(),
        customer_email?.trim() || null,
        qty,
        notes?.trim() || null,
      ]
    );

    res.status(201).json({
      booking: r.rows[0],
      message:
        'Booking received. We will contact you on WhatsApp when this product is available.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
