/** County / corridor proximity helpers for product discovery. */

const DEFAULT_CORRIDOR = ['Nakuru', 'Nyandarua', 'Kiambu', 'Nairobi'];

function normalizeCountyName(raw) {
  if (raw == null) return '';
  return String(raw).trim().replace(/\s+/g, ' ');
}

function countyKey(raw) {
  return normalizeCountyName(raw).toLowerCase();
}

function parseCorridorCounties(raw) {
  if (Array.isArray(raw)) {
    return raw.map(normalizeCountyName).filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeCountyName).filter(Boolean);
      }
    } catch {
      return raw
        .split(',')
        .map(normalizeCountyName)
        .filter(Boolean);
    }
  }
  return [...DEFAULT_CORRIDOR];
}

function parseServiceCounties(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(normalizeCountyName).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeCountyName).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Whether a seller can serve a buyer county.
 * - No seller (platform) → always
 * - Empty service_counties → nationwide
 * - Empty seller.county → nationwide (include)
 * - Otherwise match seller.county OR service_counties
 */
function sellerServesCounty(seller, buyerCounty) {
  const buyer = countyKey(buyerCounty);
  if (!buyer) return true;
  if (!seller) return true;

  const home = countyKey(seller.county);
  const services = parseServiceCounties(seller.service_counties).map(countyKey);

  if (!home && services.length === 0) return true;
  if (home && home === buyer) return true;
  if (services.length === 0) return true;
  return services.includes(buyer);
}

/**
 * Proximity rank for sort (lower = closer).
 * 0 = same county, 1 = corridor, 2 = rest / unknown
 */
function proximityRank(sellerCounty, buyerCounty, corridorCounties = DEFAULT_CORRIDOR) {
  const buyer = countyKey(buyerCounty);
  const seller = countyKey(sellerCounty);
  if (!buyer) return 2;
  if (seller && seller === buyer) return 0;
  const corridor = (corridorCounties || DEFAULT_CORRIDOR).map(countyKey);
  if (seller && corridor.includes(seller) && corridor.includes(buyer)) return 1;
  if (seller && corridor.includes(seller)) return 1;
  return 2;
}

module.exports = {
  DEFAULT_CORRIDOR,
  normalizeCountyName,
  countyKey,
  parseCorridorCounties,
  parseServiceCounties,
  sellerServesCounty,
  proximityRank,
};
