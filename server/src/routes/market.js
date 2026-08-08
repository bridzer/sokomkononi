const express = require('express');
const { query } = require('../db');
const { fetchMarketStats, countySlugToName } = require('../utils/marketPulse');
const { getSeasonCalendar } = require('../utils/seasons');
const { parseCorridorCounties, normalizeCountyName } = require('../utils/proximity');
const { requireSeller } = require('../middleware/auth');

const router = express.Router();

router.get('/pulse', async (req, res, next) => {
  try {
    const { county, category, category_id: categoryId, breed } = req.query;
    const stats = await fetchMarketStats({
      county: county || undefined,
      categorySlug: category || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      breed: breed || undefined,
    });
    res.json({ pulse: stats });
  } catch (err) {
    next(err);
  }
});

router.get('/seasons', (_req, res) => {
  res.json({ seasons: getSeasonCalendar() });
});

router.get('/corridor', async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT corridor_counties FROM settings ORDER BY id ASC LIMIT 1`
    );
    const counties = parseCorridorCounties(r.rows[0]?.corridor_counties);
    res.json({ counties });
  } catch (err) {
    next(err);
  }
});

/** Log a search/browse event for demand signals */
router.post('/search-events', async (req, res, next) => {
  try {
    const { search_query: searchQuery, category_slug: categorySlug, county } =
      req.body || {};
    if (!searchQuery && !categorySlug && !county) {
      return res.status(400).json({ error: 'Provide search_query, category_slug, or county' });
    }
    await query(
      `INSERT INTO search_events (search_query, category_slug, county)
       VALUES ($1, $2, $3)`,
      [
        searchQuery ? String(searchQuery).slice(0, 200) : null,
        categorySlug ? String(categorySlug).slice(0, 140) : null,
        county ? normalizeCountyName(county) : null,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Seller demand alerts + expansion score from bookings, orders, search_events.
 */
router.get('/seller-insights', requireSeller, async (req, res, next) => {
  try {
    const sellerId = req.seller.id;
    const sellerCounty = req.seller.county || null;

    const listings = await query(
      `SELECT id, breed, category_id, county
       FROM (
         SELECT p.id, p.breed, p.category_id, s.county
         FROM products p
         LEFT JOIN sellers s ON s.id = p.seller_id
         WHERE p.seller_id = $1 AND p.is_active = TRUE
       ) x`,
      [sellerId]
    );

    const demandByCounty = await query(
      `SELECT county, COUNT(*)::int AS demand_count
       FROM (
         SELECT o.county
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE o.status <> 'cancelled'
           AND o.county IS NOT NULL
           AND o.created_at > NOW() - INTERVAL '90 days'
           AND (
             p.category_id IN (SELECT category_id FROM products WHERE seller_id = $1)
             OR p.seller_id = $1
           )
         UNION ALL
         SELECT se.county
         FROM search_events se
         WHERE se.county IS NOT NULL
           AND se.created_at > NOW() - INTERVAL '90 days'
         UNION ALL
         SELECT s.county
         FROM product_bookings pb
         JOIN products p ON p.id = pb.product_id
         LEFT JOIN sellers s ON s.id = p.seller_id
         WHERE pb.status = 'pending'
           AND pb.created_at > NOW() - INTERVAL '90 days'
           AND p.category_id IN (SELECT category_id FROM products WHERE seller_id = $1)
       ) d
       WHERE county IS NOT NULL AND TRIM(county) <> ''
       GROUP BY county
       ORDER BY demand_count DESC
       LIMIT 12`,
      [sellerId]
    );

    const supplyByCounty = await query(
      `SELECT COALESCE(NULLIF(TRIM(s.county), ''), 'Nationwide') AS county,
              COUNT(*)::int AS supply_count
       FROM products p
       LEFT JOIN sellers s ON s.id = p.seller_id
       WHERE p.seller_id = $1 AND p.is_active = TRUE
       GROUP BY 1`,
      [sellerId]
    );

    const supplyMap = Object.fromEntries(
      supplyByCounty.rows.map((r) => [r.county.toLowerCase(), r.supply_count])
    );

    const expansion = demandByCounty.rows
      .map((row) => {
        const supply = supplyMap[row.county.toLowerCase()] || 0;
        return {
          county: row.county,
          demand: row.demand_count,
          your_supply: supply,
          score: row.demand_count - supply,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const bookingAlerts = await query(
      `SELECT pb.id, pb.customer_name, pb.quantity, pb.created_at,
              p.name AS product_name, p.breed, p.slug
       FROM product_bookings pb
       JOIN products p ON p.id = pb.product_id
       WHERE p.seller_id = $1 AND pb.status = 'pending'
       ORDER BY pb.created_at DESC
       LIMIT 10`,
      [sellerId]
    );

    res.json({
      seller_county: sellerCounty,
      listing_count: listings.rowCount,
      demand_by_county: demandByCounty.rows,
      expansion_score: expansion,
      booking_alerts: bookingAlerts.rows,
      seasons: getSeasonCalendar(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/county/:countySlug', async (req, res, next) => {
  try {
    const county = countySlugToName(req.params.countySlug);
    const pulse = await fetchMarketStats({
      county,
      categorySlug: req.query.category || undefined,
    });
    res.json({ county, pulse });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
