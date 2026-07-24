const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

/** Public: approved reviews for a product */
router.get('/product/:productId', async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const r = await query(
      `SELECT id, product_id, customer_name, rating, comment, created_at
       FROM product_reviews
       WHERE product_id = $1 AND is_approved = TRUE
       ORDER BY created_at DESC
       LIMIT 100`,
      [productId]
    );
    const avg = await query(
      `SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS average,
              COUNT(*)::int AS count
       FROM product_reviews
       WHERE product_id = $1 AND is_approved = TRUE`,
      [productId]
    );
    res.json({
      reviews: r.rows,
      summary: {
        average: Number(avg.rows[0].average) || 0,
        count: avg.rows[0].count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Public (optional auth): submit a review — pending approval */
router.post('/', async (req, res, next) => {
  try {
    const { product_id, customer_name, rating, comment } = req.body || {};
    const name = (customer_name || '').trim();
    const stars = Number(rating);

    if (!product_id || !name || !stars) {
      return res.status(400).json({
        error: 'product_id, customer_name and rating (1–5) are required',
      });
    }
    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const productRes = await query(
      `SELECT id FROM products WHERE id = $1 AND is_active = TRUE`,
      [Number(product_id)]
    );
    if (!productRes.rowCount) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let userId = null;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(
          header.slice(7),
          process.env.JWT_SECRET || 'dev_secret'
        );
        userId = payload.id || null;
      } catch {
        /* guest review ok */
      }
    }

    const r = await query(
      `INSERT INTO product_reviews
        (product_id, user_id, customer_name, rating, comment, is_approved)
       VALUES ($1,$2,$3,$4,$5,FALSE)
       RETURNING id, product_id, customer_name, rating, comment, is_approved, created_at`,
      [
        productRes.rows[0].id,
        userId,
        name,
        stars,
        (comment || '').trim() || null,
      ]
    );

    res.status(201).json({
      review: r.rows[0],
      message: 'Thank you! Your review will appear after approval.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
