const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { category, search, featured, limit = 50, offset = 0 } = req.query;
    const params = [];
    const where = ['p.is_active = TRUE'];

    if (category) {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.breed ILIKE $${params.length})`);
    }
    if (featured === 'true') {
      where.push('p.is_featured = TRUE');
    }

    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;
    const result = await query(sql, params);
    res.json({ products: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1 AND p.is_active = TRUE`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
