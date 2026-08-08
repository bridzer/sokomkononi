const express = require('express');
const { query } = require('../db');
const { DEFAULT_SELLER_NAME } = require('../constants/delivery');
const { fetchRelatedProducts } = require('../utils/relatedProducts');
const { FEATURED_ACTIVE_SQL } = require('../constants/commerce');
const {
  parseCorridorCounties,
  normalizeCountyName,
  DEFAULT_CORRIDOR,
} = require('../utils/proximity');
const { fetchMarketStats } = require('../utils/marketPulse');
const { expireStaleReserves, getActiveReserve } = require('../utils/reserves');

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
  s.county AS seller_county,
  s.service_counties AS seller_service_counties,
  s.pickup_label AS seller_pickup_label,
  s.pickup_notes AS seller_pickup_notes,
  s.latitude AS seller_latitude,
  s.longitude AS seller_longitude,
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

const PUBLIC_LOT_SQL = `(
  p.commerce_mode = 'retail'
  OR p.lot_status IN ('listed', 'reserved')
)`;

async function loadCorridorCounties() {
  const r = await query(
    `SELECT corridor_counties FROM settings ORDER BY id ASC LIMIT 1`
  );
  const parsed = parseCorridorCounties(r.rows[0]?.corridor_counties);
  return parsed.length ? parsed : [...DEFAULT_CORRIDOR];
}

/** Seller serves buyer county OR platform / nationwide. */
function countyFilterSql(paramIdx) {
  return `(
    p.seller_id IS NULL
    OR s.id IS NULL
    OR s.county IS NULL
    OR TRIM(COALESCE(s.county, '')) = ''
    OR LOWER(TRIM(s.county)) = LOWER($${paramIdx})
    OR (
      jsonb_typeof(COALESCE(s.service_counties, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(s.service_counties, '[]'::jsonb)) = 0
    )
    OR (
      jsonb_typeof(COALESCE(s.service_counties, '[]'::jsonb)) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(s.service_counties) sc
        WHERE LOWER(TRIM(sc)) = LOWER($${paramIdx})
      )
    )
  )`;
}

function corridorFilterSql(paramIdx) {
  return `(
    p.seller_id IS NULL
    OR s.county IS NULL
    OR TRIM(COALESCE(s.county, '')) = ''
    OR LOWER(TRIM(s.county)) = ANY(SELECT LOWER(TRIM(x)) FROM unnest($${paramIdx}::text[]) AS x)
  )`;
}

function proximityOrderSql(countyParamIdx, corridorParamIdx) {
  return `
    CASE
      WHEN $${countyParamIdx}::text IS NULL OR TRIM($${countyParamIdx}::text) = '' THEN 2
      WHEN s.county IS NOT NULL AND LOWER(TRIM(s.county)) = LOWER(TRIM($${countyParamIdx}::text)) THEN 0
      WHEN s.county IS NOT NULL AND LOWER(TRIM(s.county)) = ANY(
        SELECT LOWER(TRIM(x)) FROM unnest($${corridorParamIdx}::text[]) AS x
      ) THEN 1
      WHEN p.seller_id IS NULL THEN 1
      ELSE 2
    END ASC
  `;
}

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

  const activeReserve = await getActiveReserve(product.id);

  return {
    ...product,
    fulfilled_by: fulfilledBy,
    active_reserve: activeReserve
      ? {
          id: activeReserve.id,
          expires_at: activeReserve.expires_at,
          quantity: activeReserve.quantity,
        }
      : null,
    seller: {
      id: product.seller_id || null,
      name: product.seller_display_name || DEFAULT_SELLER_NAME,
      phone: product.seller_phone || null,
      email: product.seller_email || null,
      whatsapp: product.seller_whatsapp || product.seller_phone || null,
      location: product.seller_location || null,
      county: product.seller_county || null,
      service_counties: product.seller_service_counties || [],
      pickup_label: product.seller_pickup_label || null,
      pickup_notes: product.seller_pickup_notes || null,
      latitude: product.seller_latitude || null,
      longitude: product.seller_longitude || null,
      bio: product.seller_bio || null,
      avatar_url: product.seller_avatar_url || null,
      is_verified: product.seller_id
        ? Boolean(product.seller_is_verified)
        : true,
      delivered_count: product.seller_id
        ? Number(product.seller_delivered_count) || 0
        : null,
      product_count: productCount,
      is_platform: !product.seller_id,
    },
  };
}

router.get('/comps', async (req, res, next) => {
  try {
    const stats = await fetchMarketStats({
      categoryId: req.query.category_id ? Number(req.query.category_id) : undefined,
      categorySlug: req.query.category || undefined,
      breed: req.query.breed || undefined,
      county: req.query.county || undefined,
      excludeProductId: req.query.exclude_id
        ? Number(req.query.exclude_id)
        : undefined,
    });
    res.json({ comps: stats });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    await expireStaleReserves();

    const {
      category,
      search,
      featured,
      sort,
      limit = 50,
      offset = 0,
      commerce_mode: commerceMode,
      county,
      corridor,
      proximity,
    } = req.query;

    const params = [];
    const where = ['p.is_active = TRUE', PUBLIC_LOT_SQL];

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
    if (commerceMode === 'marketplace' || commerceMode === 'retail') {
      params.push(commerceMode);
      where.push(`p.commerce_mode = $${params.length}`);
    }

    const countyNorm = county ? normalizeCountyName(county) : '';
    let countyParamIdx = null;
    if (countyNorm) {
      params.push(countyNorm);
      countyParamIdx = params.length;
      where.push(countyFilterSql(countyParamIdx));
    }

    const corridorCounties = await loadCorridorCounties();
    let corridorParamIdx = null;
    if (corridor === 'true') {
      params.push(corridorCounties);
      corridorParamIdx = params.length;
      where.push(corridorFilterSql(corridorParamIdx));
    }

    const useProximity =
      (proximity === 'true' || proximity === '1' || sort === 'nearby') &&
      countyNorm;

    if (useProximity && corridorParamIdx == null) {
      params.push(corridorCounties);
      corridorParamIdx = params.length;
    }

    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    let orderBy = SORT_MAP[sort] || DEFAULT_ORDER;
    if (useProximity && countyParamIdx != null && corridorParamIdx != null) {
      orderBy = `${proximityOrderSql(countyParamIdx, corridorParamIdx)}, ${DEFAULT_ORDER}`;
    }

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
    res.json({
      products: result.rows,
      meta: {
        county: countyNorm || null,
        corridor: corridor === 'true',
        proximity: Boolean(useProximity),
        corridor_counties: corridorCounties,
      },
    });
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
       WHERE p.slug = $1 AND p.is_active = TRUE AND ${PUBLIC_LOT_SQL}`,
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
    await expireStaleReserves();
    const result = await query(
      `SELECT p.*, ${CATEGORY_SELECT}, ${SELLER_SELECT}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN sellers s ON s.id = p.seller_id AND s.is_active = TRUE
       WHERE p.slug = $1 AND p.is_active = TRUE AND ${PUBLIC_LOT_SQL}`,
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
