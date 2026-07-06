const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.is_active = TRUE) AS product_count
       FROM categories c
       WHERE c.is_active = TRUE
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories WHERE slug=$1', [req.params.slug]);
    if (!result.rowCount) return res.status(404).json({ error: 'Category not found' });
    res.json({ category: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
