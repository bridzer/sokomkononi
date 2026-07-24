const express = require('express');
const { query } = require('../db');
const { DEFAULT_SELLER_NAME } = require('../constants/delivery');

const router = express.Router();

const SELLER_SELECT = `
  s.name AS seller_name,
  s.phone AS seller_phone,
  s.email AS seller_email,
  s.whatsapp AS seller_whatsapp,
  s.location AS seller_location,
  COALESCE(s.name, '${DEFAULT_SELLER_NAME}') AS seller_display_name
`;

// Allowed sort keys → SQL ORDER BY clauses. Anything else falls back to the
// default (featured first, then newest). Keeping this as an explicit map
// prevents any risk of injection via the `sort` query param.
const SORT_MAP = {
  price_asc: 'p.price ASC, p.created_at DESC',
  price_desc: 'p.price DESC, p.created_at DESC',
  newest: 'p.created_at DESC',
  oldest: 'p.created_at ASC',
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
};

router.get('/', async (req, res, next) => {
  try {
    const { category, search, featured, sort, limit = 50, offset = 0 } = req.query;
    const params = [];
    const where = ['p.is_active = TRUE'];

    if (category) {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.breed ILIKE $${params.length})`
      );
    }
    if (featured === 'true') {
      where.push('p.is_featured = TRUE');
    }

    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const orderBy = SORT_MAP[sort] || 'p.is_featured DESC, p.created_at DESC';

    const sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
             ${SELLER_SELECT}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
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
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              ${SELLER_SELECT}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
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
