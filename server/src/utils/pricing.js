/**
 * Server-side product pricing validation and normalization.
 *
 * Modes:
 *   fixed — single `price`
 *   range — `price` stores minimum, `price_max` stores maximum
 *
 * Existing products without price_type are treated as `fixed`.
 */

const PRICE_TYPES = new Set(['fixed', 'range']);
const MAX_PRICE = 9999999999.99;

function parsePriceValue(raw, label) {
  if (raw === undefined || raw === null || raw === '') {
    throw Object.assign(new Error(`${label} is required`), { status: 400, expose: true });
  }

  const str = String(raw).trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw Object.assign(
      new Error(`${label} must be a positive number (no letters or symbols)`),
      { status: 400, expose: true }
    );
  }

  const num = Number(str);
  if (!Number.isFinite(num) || num < 0) {
    throw Object.assign(new Error(`${label} must be zero or greater`), { status: 400, expose: true });
  }
  if (num > MAX_PRICE) {
    throw Object.assign(
      new Error(`${label} is too large (max ${MAX_PRICE.toLocaleString()})`),
      { status: 400, expose: true }
    );
  }

  return Math.round(num * 100) / 100;
}

/**
 * Validate and normalize pricing fields from a request body.
 * @returns {{ price_type: 'fixed'|'range', price: number, price_max: number|null }}
 */
function normalizeProductPricing(body = {}) {
  const price_type = body.price_type === 'range' ? 'range' : 'fixed';

  if (price_type === 'fixed') {
    const price = parsePriceValue(body.price, 'Price');
    return { price_type: 'fixed', price, price_max: null };
  }

  const minRaw = body.price_min !== undefined ? body.price_min : body.price;
  const price = parsePriceValue(minRaw, 'Minimum price');
  const price_max = parsePriceValue(body.price_max, 'Maximum price');

  if (price_max < price) {
    throw Object.assign(
      new Error('Maximum price must be greater than or equal to minimum price'),
      { status: 400, expose: true }
    );
  }

  return { price_type: 'range', price, price_max };
}

function formatPriceForDisplay(product) {
  if (!product) return '';
  const type = product.price_type === 'range' ? 'range' : 'fixed';
  const min = Number(product.price) || 0;
  if (type === 'range' && product.price_max != null) {
    const max = Number(product.price_max);
    return `KSh ${min.toLocaleString('en-KE')} - KSh ${max.toLocaleString('en-KE')}`;
  }
  return `KSh ${min.toLocaleString('en-KE')}`;
}

module.exports = {
  PRICE_TYPES,
  MAX_PRICE,
  parsePriceValue,
  normalizeProductPricing,
  formatPriceForDisplay,
};
