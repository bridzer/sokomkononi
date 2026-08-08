const { query } = require('../db');
const { normalizeRelatedMode } = require('../constants/relatedProducts');
const { DEFAULT_SELLER_NAME } = require('../constants/delivery');
const { FEATURED_ACTIVE_SQL } = require('../constants/commerce');

const CARD_SELECT = `
  p.id, p.name, p.slug, p.price, p.price_type, p.price_max, p.unit, p.stock,
  p.image_url, p.is_featured, p.featured_until, p.seller_id, p.fulfilled_by,
  p.commerce_mode,
  c.name AS category_name, c.slug AS category_slug,
  COALESCE(s.name, '${DEFAULT_SELLER_NAME}') AS seller_display_name
`;

async function getRelatedProductsMode() {
  const r = await query(
    `SELECT related_products_mode FROM settings ORDER BY id ASC LIMIT 1`
  );
  return normalizeRelatedMode(r.rows[0]?.related_products_mode);
}

/**
 * Fetch related products for a detail page, respecting admin mode.
 * `closest` uses a priority UNION so subcategory matches rank first.
 */
async function fetchRelatedProducts(product, { limit = 12 } = {}) {
  if (!product?.id) return { mode: 'closest', products: [] };
  const mode = await getRelatedProductsMode();
  const lim = Math.min(24, Math.max(1, Number(limit) || 12));

  let sql;
  let params;

  if (mode === 'subcategory' && product.category_id) {
    sql = `
      SELECT ${CARD_SELECT}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
      WHERE p.is_active = TRUE AND p.id <> $1 AND p.category_id = $2
      ORDER BY ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
      LIMIT $3`;
    params = [product.id, product.category_id, lim];
  } else if (mode === 'category') {
    const parentId = product.category_parent_id || product.category_id;
    sql = `
      SELECT ${CARD_SELECT}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
      WHERE p.is_active = TRUE AND p.id <> $1
        AND (
          c.id = $2 OR c.parent_id = $2 OR pc.id = $2
          OR (c.parent_id IS NOT NULL AND c.parent_id = (
            SELECT parent_id FROM categories WHERE id = $2
          ))
        )
      ORDER BY ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
      LIMIT $3`;
    params = [product.id, parentId || product.category_id, lim];
  } else if (mode === 'same_seller') {
    if (product.seller_id) {
      sql = `
        SELECT ${CARD_SELECT}
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
        WHERE p.is_active = TRUE AND p.id <> $1 AND p.seller_id = $2
        ORDER BY ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
        LIMIT $3`;
      params = [product.id, product.seller_id, lim];
    } else {
      sql = `
        SELECT ${CARD_SELECT}
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
        WHERE p.is_active = TRUE AND p.id <> $1 AND p.seller_id IS NULL
        ORDER BY ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
        LIMIT $3`;
      params = [product.id, lim];
    }
  } else if (mode === 'top_selling_category' && product.category_id) {
    sql = `
      SELECT ${CARD_SELECT},
             COALESCE(sold.qty, 0) AS sold_qty
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
      LEFT JOIN (
        SELECT oi.product_id, SUM(oi.quantity)::int AS qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status IN ('confirmed','processing','delivered')
        GROUP BY oi.product_id
      ) sold ON sold.product_id = p.id
      WHERE p.is_active = TRUE AND p.id <> $1
        AND (
          p.category_id = $2
          OR c.parent_id = (SELECT parent_id FROM categories WHERE id = $2)
          OR c.parent_id = $2
        )
      ORDER BY COALESCE(sold.qty, 0) DESC, ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
      LIMIT $3`;
    params = [product.id, product.category_id, lim];
  } else if (mode === 'featured') {
    sql = `
      SELECT ${CARD_SELECT}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
      WHERE p.is_active = TRUE AND p.id <> $1 AND ${FEATURED_ACTIVE_SQL}
      ORDER BY p.created_at DESC
      LIMIT $2`;
    params = [product.id, lim];
  } else {
    // closest — weighted priority
    sql = `
      SELECT ${CARD_SELECT},
             CASE
               WHEN p.category_id = $2 THEN 0
               WHEN $3::int IS NOT NULL AND (c.parent_id = $3 OR c.id = $3) THEN 1
               WHEN ($4::int IS NOT NULL AND p.seller_id = $4)
                 OR ($4::int IS NULL AND p.seller_id IS NULL) THEN 2
               WHEN ${FEATURED_ACTIVE_SQL} THEN 3
               ELSE 4
             END AS rel_rank
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
      WHERE p.is_active = TRUE AND p.id <> $1
      ORDER BY rel_rank ASC, ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
      LIMIT $5`;
    params = [
      product.id,
      product.category_id || null,
      product.category_parent_id || null,
      product.seller_id || null,
      lim,
    ];
  }

  const result = await query(sql, params);
  let products = result.rows;

  // Marketplace lots: prefer retail inputs / tools as linked upsells.
  if (product.commerce_mode === 'marketplace') {
    const retailLim = Math.min(6, lim);
    const retail = await query(
      `SELECT ${CARD_SELECT}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
       WHERE p.is_active = TRUE
         AND p.id <> $1
         AND p.commerce_mode = 'retail'
         AND p.lot_status IN ('listed', 'reserved')
         AND (
           pc.slug IN ('soil-science-inputs', 'agricultural-engineering', 'agribusiness')
           OR c.slug IN ('soil-science-inputs', 'agricultural-engineering', 'agribusiness')
           OR COALESCE(pc.default_commerce_mode, c.default_commerce_mode) = 'retail'
         )
       ORDER BY ${FEATURED_ACTIVE_SQL} DESC, p.created_at DESC
       LIMIT $2`,
      [product.id, retailLim]
    );
    if (retail.rowCount) {
      const seen = new Set();
      const merged = [];
      for (const row of retail.rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
      }
      for (const row of products) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
      }
      products = merged.slice(0, lim);
    }
  }

  return { mode, products };
}

module.exports = { fetchRelatedProducts, getRelatedProductsMode };
