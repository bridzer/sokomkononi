const { query } = require('../db');
const { normalizeCountyName, countyKey } = require('./proximity');

async function getPulseMinListings() {
  const r = await query(
    `SELECT market_pulse_min_listings FROM settings ORDER BY id ASC LIMIT 1`
  );
  const n = Number(r.rows[0]?.market_pulse_min_listings);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function heatFromCount(count, minListings) {
  if (count < minListings) return null;
  if (count <= minListings + 2) return 'scarce';
  if (count <= minListings * 3) return 'balanced';
  return 'high';
}

/**
 * Comps / pulse for active listed marketplace products.
 */
async function fetchMarketStats({
  categoryId,
  categorySlug,
  breed,
  county,
  excludeProductId,
} = {}) {
  const minListings = await getPulseMinListings();
  const params = [];
  const where = [
    `p.is_active = TRUE`,
    `p.commerce_mode = 'marketplace'`,
    `p.lot_status IN ('listed', 'reserved')`,
    `(p.seller_id IS NULL OR s.is_active = TRUE)`,
  ];

  if (categoryId) {
    params.push(Number(categoryId));
    where.push(`p.category_id = $${params.length}`);
  } else if (categorySlug) {
    params.push(categorySlug);
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

  if (breed) {
    params.push(`%${breed}%`);
    where.push(`p.breed ILIKE $${params.length}`);
  }

  if (county) {
    const cty = normalizeCountyName(county);
    params.push(cty);
    const idx = params.length;
    // Platform or empty county = national; else home county or service_counties
    where.push(`(
      p.seller_id IS NULL
      OR s.county IS NULL
      OR TRIM(s.county) = ''
      OR LOWER(s.county) = LOWER($${idx})
      OR (
        jsonb_typeof(s.service_counties) = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(s.service_counties) sc
          WHERE LOWER(TRIM(sc)) = LOWER($${idx})
        )
      )
      OR (
        (s.service_counties IS NULL OR s.service_counties = '[]'::jsonb)
        AND (s.county IS NULL OR TRIM(COALESCE(s.county,'')) = '')
      )
    )`);
  }

  if (excludeProductId) {
    params.push(Number(excludeProductId));
    where.push(`p.id <> $${params.length}`);
  }

  const sql = `
    SELECT p.id, p.price::float AS price, p.breed, s.county AS seller_county
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories pc ON pc.id = c.parent_id
    LEFT JOIN sellers s ON s.id = p.seller_id
    WHERE ${where.join(' AND ')}
  `;
  const result = await query(sql, params);
  const prices = result.rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n));
  const count = prices.length;
  const insufficient = count < minListings;
  const med = median(prices);
  const heat = heatFromCount(count, minListings);

  return {
    count,
    min_listings: minListings,
    insufficient,
    min_price: prices.length ? Math.min(...prices) : null,
    max_price: prices.length ? Math.max(...prices) : null,
    median_price: med,
    heat,
    county: county ? normalizeCountyName(county) : null,
    breed: breed || null,
    category_id: categoryId || null,
    category_slug: categorySlug || null,
  };
}

function countySlugToName(slug) {
  if (!slug) return '';
  return String(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function countyNameToSlug(name) {
  return countyKey(name).replace(/\s+/g, '-');
}

module.exports = {
  getPulseMinListings,
  median,
  heatFromCount,
  fetchMarketStats,
  countySlugToName,
  countyNameToSlug,
};
