const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const loopPayment = require('../services/loopPayment');
const {
  RELATED_PRODUCT_MODES,
  normalizeRelatedMode,
} = require('../constants/relatedProducts');
const {
  clampCommissionPct,
  DEFAULT_MARKETPLACE_COMMISSION_PCT,
} = require('../constants/commerce');
const {
  parseCorridorCounties,
  DEFAULT_CORRIDOR,
} = require('../utils/proximity');

const router = express.Router();

function withMeta(settings) {
  if (!settings) return null;
  const corridor = parseCorridorCounties(settings.corridor_counties);
  return {
    ...settings,
    related_products_mode: normalizeRelatedMode(settings.related_products_mode),
    marketplace_commission_pct: clampCommissionPct(
      settings.marketplace_commission_pct,
      DEFAULT_MARKETPLACE_COMMISSION_PCT
    ),
    featured_listing_price_kes: Number(settings.featured_listing_price_kes) || 0,
    featured_listing_days: Math.max(1, Number(settings.featured_listing_days) || 30),
    corridor_counties: corridor.length ? corridor : [...DEFAULT_CORRIDOR],
    reserve_hold_hours: Math.max(1, Number(settings.reserve_hold_hours) || 24),
    market_pulse_min_listings: Math.max(
      1,
      Number(settings.market_pulse_min_listings) || 5
    ),
    loop_configured: loopPayment.isConfigured(),
    loop_callback_url: loopPayment.callbackUrl(),
    related_products_modes: RELATED_PRODUCT_MODES,
  };
}

/** Public settings safe for storefront (no secrets) */
router.get('/public', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT business_name, whatsapp_number, phone_number, email, location, about,
              loop_payments_enabled, related_products_mode, corridor_counties,
              reserve_hold_hours, market_pulse_min_listings
       FROM settings ORDER BY id ASC LIMIT 1`
    );
    const row = result.rows[0] || {};
    const corridor = parseCorridorCounties(row.corridor_counties);
    res.json({
      settings: {
        ...row,
        related_products_mode: normalizeRelatedMode(row.related_products_mode),
        loop_payments_enabled:
          Boolean(row.loop_payments_enabled) && loopPayment.isConfigured(),
        corridor_counties: corridor.length ? corridor : [...DEFAULT_CORRIDOR],
        reserve_hold_hours: Math.max(1, Number(row.reserve_hold_hours) || 24),
        market_pulse_min_listings: Math.max(
          1,
          Number(row.market_pulse_min_listings) || 5
        ),
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Full settings including callback URL — admin only */
router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY id ASC LIMIT 1');
    res.json({ settings: withMeta(result.rows[0] || null) });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      business_name,
      whatsapp_number,
      phone_number,
      email,
      location,
      about,
      loop_payments_enabled,
      related_products_mode,
      marketplace_commission_pct,
      featured_listing_price_kes,
      featured_listing_days,
      corridor_counties,
      reserve_hold_hours,
      market_pulse_min_listings,
    } = req.body || {};

    if (loop_payments_enabled && !loopPayment.isConfigured()) {
      return res.status(400).json({
        error:
          'Cannot enable Loop payments — server credentials are missing (LOOP_CLIENT_ID, LOOP_CLIENT_SECRET, APP_BASE_URL)',
      });
    }

    const relatedMode =
      related_products_mode !== undefined
        ? normalizeRelatedMode(related_products_mode)
        : undefined;

    const hasCommission = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'marketplace_commission_pct'
    );
    const hasFeaturedPrice = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'featured_listing_price_kes'
    );
    const hasFeaturedDays = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'featured_listing_days'
    );
    const hasCorridor = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'corridor_counties'
    );
    const hasHoldHours = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'reserve_hold_hours'
    );
    const hasPulseMin = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'market_pulse_min_listings'
    );

    const nextCommission = hasCommission
      ? clampCommissionPct(marketplace_commission_pct, DEFAULT_MARKETPLACE_COMMISSION_PCT)
      : undefined;
    const nextFeaturedPrice = hasFeaturedPrice
      ? Math.max(0, Number(featured_listing_price_kes) || 0)
      : undefined;
    const nextFeaturedDays = hasFeaturedDays
      ? Math.max(1, Number(featured_listing_days) || 30)
      : undefined;
    const nextCorridor = hasCorridor
      ? JSON.stringify(parseCorridorCounties(corridor_counties))
      : undefined;
    const nextHoldHours = hasHoldHours
      ? Math.max(1, Number(reserve_hold_hours) || 24)
      : undefined;
    const nextPulseMin = hasPulseMin
      ? Math.max(1, Number(market_pulse_min_listings) || 5)
      : undefined;

    const existing = await query('SELECT id FROM settings ORDER BY id ASC LIMIT 1');
    if (existing.rowCount) {
      const upd = await query(
        `UPDATE settings SET
          business_name = COALESCE($1, business_name),
          whatsapp_number = COALESCE($2, whatsapp_number),
          phone_number = COALESCE($3, phone_number),
          email = COALESCE($4, email),
          location = COALESCE($5, location),
          about = COALESCE($6, about),
          loop_payments_enabled = COALESCE($7, loop_payments_enabled),
          related_products_mode = COALESCE($8, related_products_mode),
          marketplace_commission_pct = CASE WHEN $9::boolean THEN $10 ELSE marketplace_commission_pct END,
          featured_listing_price_kes = CASE WHEN $11::boolean THEN $12 ELSE featured_listing_price_kes END,
          featured_listing_days = CASE WHEN $13::boolean THEN $14 ELSE featured_listing_days END,
          corridor_counties = CASE WHEN $15::boolean THEN $16::jsonb ELSE corridor_counties END,
          reserve_hold_hours = CASE WHEN $17::boolean THEN $18 ELSE reserve_hold_hours END,
          market_pulse_min_listings = CASE WHEN $19::boolean THEN $20 ELSE market_pulse_min_listings END,
          updated_at = NOW()
         WHERE id = $21
         RETURNING *`,
        [
          business_name,
          whatsapp_number,
          phone_number,
          email,
          location,
          about,
          loop_payments_enabled,
          relatedMode,
          hasCommission,
          nextCommission ?? DEFAULT_MARKETPLACE_COMMISSION_PCT,
          hasFeaturedPrice,
          nextFeaturedPrice ?? 0,
          hasFeaturedDays,
          nextFeaturedDays ?? 30,
          hasCorridor,
          nextCorridor ?? JSON.stringify(DEFAULT_CORRIDOR),
          hasHoldHours,
          nextHoldHours ?? 24,
          hasPulseMin,
          nextPulseMin ?? 5,
          existing.rows[0].id,
        ]
      );
      return res.json({ settings: withMeta(upd.rows[0]) });
    }
    const ins = await query(
      `INSERT INTO settings
        (business_name, whatsapp_number, phone_number, email, location, about,
         loop_payments_enabled, related_products_mode, marketplace_commission_pct,
         featured_listing_price_kes, featured_listing_days, corridor_counties,
         reserve_hold_hours, market_pulse_min_listings)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, FALSE),COALESCE($8, 'closest'),
               COALESCE($9, 10), COALESCE($10, 0), COALESCE($11, 30),
               COALESCE($12::jsonb, $13::jsonb), COALESCE($14, 24), COALESCE($15, 5))
       RETURNING *`,
      [
        business_name,
        whatsapp_number,
        phone_number,
        email,
        location,
        about,
        loop_payments_enabled,
        relatedMode || 'closest',
        nextCommission ?? DEFAULT_MARKETPLACE_COMMISSION_PCT,
        nextFeaturedPrice ?? 0,
        nextFeaturedDays ?? 30,
        nextCorridor,
        JSON.stringify(DEFAULT_CORRIDOR),
        nextHoldHours ?? 24,
        nextPulseMin ?? 5,
      ]
    );
    res.json({ settings: withMeta(ins.rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
