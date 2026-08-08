/**
 * Hybrid commerce model for Soko Mkononi:
 *  - marketplace: limited-supply listings (livestock, fresh produce) → commission
 *  - retail: constant-supply goods (inputs, machinery) → platform markup / store
 */

const COMMERCE_MODES = ['marketplace', 'retail'];

/** Main category slugs that default to marketplace (limited / unique supply). */
const MARKETPLACE_MAIN_SLUGS = [
  'livestock',
  'horticulture',
  'crop-production',
  'fisheries-aquaculture',
  'forestry',
];

/** Main category slugs that default to retail (replenishable supply). */
const RETAIL_MAIN_SLUGS = [
  'agricultural-engineering',
  'soil-science-inputs',
  'agribusiness',
  'food-science-technology',
  'biotechnology-genetics',
];

const DEFAULT_MARKETPLACE_COMMISSION_PCT = 10;

function normalizeCommerceMode(value, fallback = 'retail') {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  return COMMERCE_MODES.includes(v) ? v : fallback;
}

function defaultModeForMainSlug(slug) {
  const s = String(slug || '').toLowerCase();
  if (MARKETPLACE_MAIN_SLUGS.includes(s)) return 'marketplace';
  if (RETAIL_MAIN_SLUGS.includes(s)) return 'retail';
  return 'retail';
}

/** SQL predicate: product currently counts as featured (flag + optional expiry). */
const FEATURED_ACTIVE_SQL = `(
  p.is_featured = TRUE
  AND (p.featured_until IS NULL OR p.featured_until > NOW())
)`;

function clampCommissionPct(value, fallback = DEFAULT_MARKETPLACE_COMMISSION_PCT) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

function computeCommissionAmount(subtotal, pct) {
  const amount = (Number(subtotal) || 0) * (Number(pct) || 0) / 100;
  return Math.round(amount * 100) / 100;
}

module.exports = {
  COMMERCE_MODES,
  MARKETPLACE_MAIN_SLUGS,
  RETAIL_MAIN_SLUGS,
  DEFAULT_MARKETPLACE_COMMISSION_PCT,
  FEATURED_ACTIVE_SQL,
  normalizeCommerceMode,
  defaultModeForMainSlug,
  clampCommissionPct,
  computeCommissionAmount,
};
