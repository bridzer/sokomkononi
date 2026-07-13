/**
 * Client-side pricing utilities: input sanitization, validation, and display.
 */

export const PRICE_MODES = {
  FIXED: 'fixed',
  RANGE: 'range',
};

const MAX_PRICE = 9999999999.99;
const MAX_INPUT_LENGTH = 14;

/**
 * Sanitize price input — digits and at most one decimal point (max 2 decimals).
 * Blocks letters, scientific notation, negatives, and symbols.
 */
export function sanitizePriceInput(value) {
  if (value == null) return '';
  let s = String(value).replace(/,/g, '');

  // Reject scientific notation outright
  if (/[eE+-]/.test(s)) {
    s = s.replace(/[eE+-].*$/, '');
  }

  // Keep only digits and dots
  s = s.replace(/[^\d.]/g, '');

  // Single decimal point
  const parts = s.split('.');
  if (parts.length > 2) {
    s = `${parts[0]}.${parts.slice(1).join('')}`;
  }

  // Max 2 decimal places
  if (s.includes('.')) {
    const [whole, frac = ''] = s.split('.');
    s = `${whole}.${frac.slice(0, 2)}`;
  }

  // Limit total digit length (excluding dot)
  const digits = s.replace(/\D/g, '');
  if (digits.length > MAX_INPUT_LENGTH) {
    return s.slice(0, -1);
  }

  return s;
}

export function parsePriceNumber(value) {
  const s = sanitizePriceInput(value);
  if (!s || s === '.') return null;
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0 || num > MAX_PRICE) return null;
  return Math.round(num * 100) / 100;
}

/**
 * Validate admin product pricing form state.
 * @returns {string|null} error message or null if valid
 */
export function validatePricingForm({ price_type, price, price_max }) {
  const mode = price_type === PRICE_MODES.RANGE ? PRICE_MODES.RANGE : PRICE_MODES.FIXED;

  if (mode === PRICE_MODES.FIXED) {
    const p = parsePriceNumber(price);
    if (p == null) return 'Enter a valid fixed price (numbers only)';
    return null;
  }

  const min = parsePriceNumber(price);
  const max = parsePriceNumber(price_max);
  if (min == null) return 'Enter a valid minimum price (numbers only)';
  if (max == null) return 'Enter a valid maximum price (numbers only)';
  if (max < min) return 'Maximum price must be at least the minimum price';
  return null;
}

/**
 * Build API payload fields for product create/update.
 */
export function buildPricingPayload({ price_type, price, price_max }) {
  const mode = price_type === PRICE_MODES.RANGE ? PRICE_MODES.RANGE : PRICE_MODES.FIXED;
  if (mode === PRICE_MODES.FIXED) {
    return {
      price_type: PRICE_MODES.FIXED,
      price: parsePriceNumber(price),
      price_max: null,
    };
  }
  return {
    price_type: PRICE_MODES.RANGE,
    price: parsePriceNumber(price),
    price_max: parsePriceNumber(price_max),
  };
}

/** Display price on storefront (fixed or range). */
export function formatProductPrice(product) {
  if (!product) return 'KSh 0';
  const type = product.price_type === PRICE_MODES.RANGE ? PRICE_MODES.RANGE : PRICE_MODES.FIXED;
  const min = Number(product.price) || 0;
  const fmt = (n) =>
    `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

  if (type === PRICE_MODES.RANGE && product.price_max != null && product.price_max !== '') {
    const max = Number(product.price_max);
    if (Number.isFinite(max) && max > min) {
      return `${fmt(min)} – ${fmt(max)}`;
    }
  }
  return fmt(min);
}

export function isRangePrice(product) {
  return (
    product?.price_type === PRICE_MODES.RANGE &&
    product.price_max != null &&
    Number(product.price_max) > Number(product.price)
  );
}

/** Normalize product from API for form editing. */
export function pricingFromProduct(product) {
  const isRange = product?.price_type === PRICE_MODES.RANGE;
  return {
    price_type: isRange ? PRICE_MODES.RANGE : PRICE_MODES.FIXED,
    price: product?.price != null ? String(product.price) : '',
    price_max:
      isRange && product?.price_max != null ? String(product.price_max) : '',
  };
}
