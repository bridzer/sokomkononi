const express = require('express');
const { query } = require('../db');
const { DEFAULT_SELLER_NAME } = require('../constants/delivery');
const { fetchRelatedProducts } = require('../utils/relatedProducts');
const { FEATURED_ACTIVE_SQL } = require('../constants/commerce');

const router = express.Router();

const SELLER_SELECT = `
  s.id AS seller_id_join,
  s.name AS seller_name,
  s.phone AS seller_phone,
  s.email AS seller_email,
  s.whatsapp AS seller_whatsapp,
  s.location AS seller_location,
  s.bio AS seller_bio,
  s.avatar_url AS seller_avatar_url,
  s.is_verified AS seller_is_verified,
  s.delivered_count AS seller_delivered_count,
  COALESCE(s.name, '${DEFAULT_SELLER_NAME}') AS seller_display_name
`;

const CATEGORY_SELECT = `
  c.name AS category_name,
  c.slug AS category_slug,
  c.parent_id AS category_parent_id,
  pc.name AS parent_category_name,
  pc.slug AS parent_category_slug
`;

const SORT_MAP = {
  price_asc: 'p.price ASC, p.created_at DESC',
  price_desc: 'p.price DESC, p.created_at DESC',
  newest: 'p.created_at DESC',
  oldest: 'p.created_at ASC',
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
};

const DEFAULT_ORDER = `${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC`;

async function attachSellerStats(product) {
  if (!product) return product;
  const sellerId = product.seller_id;
  let productCount = 0;
  if (sellerId) {
    const r = await query(
      `SELECT COUNT(*)::int AS c FROM products WHERE seller_id = $1 AND is_active = TRUE`,
      [sellerId]
    );
    productCount = r.rows[0]?.c || 0;
  } else {
    const r = await query(
      `SELECT COUNT(*)::int AS c FROM products WHERE seller_id IS NULL AND is_active = TRUE`
    );
    productCount = r.rows[0]?.c || 0;
  }

  const fulfilledBy =
    product.fulfilled_by === 'seller' && product.seller_id ? 'seller' : 'platform';

  return {
    ...product,
    fulfilled_by: fulfilledBy,
    seller: {
      id: product.seller_id || null,
      name: product.seller_display_name || DEFAULT_SELLER_NAME,
      phone: product.seller_phone || null,
      email: product.seller_email || null,
      whatsapp: product.seller_whatsapp || product.seller_phone || null,
      location: product.seller_location || null,
      bio: product.seller_bio || null,
      avatar_url: product.seller_avatar_url || null,
      is_verified: product.seller_id
        ? Boolean(product.seller_is_verified)
        : true, // platform listings are always verified
      delivered_count: product.seller_id
        ? Number(product.seller_delivered_count) || 0
        : null,
      product_count: productCount,
      is_platform: !product.seller_id,
    },
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { category, search, featured, sort, limit = 50, offset = 0, commerce_mode } =
      req.query;
    const params = [];
    const where = ['p.is_active = TRUE'];

    if (category) {
      params.push(category);
      const idx = params.length;
      where.push(`(
        c.slug = $${idx}
        OR pc.slug = $${idx}
        OR EXISTS (
          SELECT 1 FROM categories main
          WHERE main.slug = $${idx}
            AND main.parent_id IS NULL
            AND c.parent_id = main.id
        )
      )`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.breed ILIKE $${params.length})`
      );
    }
    if (featured === 'true') {
      where.push(FEATURED_ACTIVE_SQL);
    }
    if (commerce_mode === 'marketplace' || commerce_mode === 'retail') {
      params.push(commerce_mode);
      where.push(`p.commerce_mode = $${params.length}`);
    }

    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const orderBy = SORT_MAP[sort] || DEFAULT_ORDER;

    const sql = `
      SELECT p.*, ${CATEGORY_SELECT}, ${SELLER_SELECT}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
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

router.get('/:slug/related', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, ${CATEGORY_SELECT}, ${SELLER_SELECT}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
       WHERE p.slug = $1 AND p.is_active = TRUE`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
    const product = result.rows[0];
    const related = await fetchRelatedProducts(product, {
      limit: Number(req.query.limit) || 12,
    });
    res.json(related);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, ${CATEGORY_SELECT}, ${SELLER_SELECT}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
       WHERE p.slug = $1 AND p.is_active = TRUE`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
    const product = await attachSellerStats(result.rows[0]);
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
