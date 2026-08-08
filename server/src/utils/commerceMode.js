const { query } = require('../db');
const {
  normalizeCommerceMode,
  defaultModeForMainSlug,
} = require('../constants/commerce');

/**
 * Resolve commerce_mode for a product create/update.
 * Explicit body value wins; else inherit from category (child or parent).
 */
async function resolveCommerceMode({ commerce_mode, category_id }) {
  if (commerce_mode !== undefined && commerce_mode !== null && commerce_mode !== '') {
    return normalizeCommerceMode(commerce_mode);
  }
  if (!category_id) return 'retail';

  const r = await query(
    `SELECT c.default_commerce_mode AS child_mode,
            c.slug AS child_slug,
            pc.default_commerce_mode AS parent_mode,
            pc.slug AS parent_slug
     FROM categories c
     LEFT JOIN categories pc ON pc.id = c.parent_id
     WHERE c.id = $1`,
    [Number(category_id)]
  );
  if (!r.rowCount) return 'retail';
  const row = r.rows[0];
  if (row.parent_mode || row.child_mode) {
    return normalizeCommerceMode(row.parent_mode || row.child_mode);
  }
  return defaultModeForMainSlug(row.parent_slug || row.child_slug);
}

function parseFeaturedUntil(raw, { is_featured, featured_listing_days }) {
  if (!is_featured) return null;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  // No explicit end date → use Settings default featured period
  const days = Math.max(1, Number(featured_listing_days) || 30);
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  return until.toISOString();
}

module.exports = {
  resolveCommerceMode,
  parseFeaturedUntil,
};
