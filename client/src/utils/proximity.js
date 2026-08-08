/** Client-side county / proximity helpers (mirrors server). */

export const DEFAULT_CORRIDOR = ['Nakuru', 'Nyandarua', 'Kiambu', 'Nairobi'];

export function normalizeCountyName(raw) {
  if (raw == null) return '';
  return String(raw).trim().replace(/\s+/g, ' ');
}

export function countyKey(raw) {
  return normalizeCountyName(raw).toLowerCase();
}

export function countyNameToSlug(name) {
  return countyKey(name).replace(/\s+/g, '-');
}

export function countySlugToName(slug) {
  if (!slug) return '';
  return String(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function proximityRank(sellerCounty, buyerCounty, corridorCounties = DEFAULT_CORRIDOR) {
  const buyer = countyKey(buyerCounty);
  const seller = countyKey(sellerCounty);
  if (!buyer) return 2;
  if (seller && seller === buyer) return 0;
  const corridor = (corridorCounties || DEFAULT_CORRIDOR).map(countyKey);
  if (seller && corridor.includes(seller)) return 1;
  return 2;
}

export function heatLabel(heat) {
  if (heat === 'scarce') return 'Scarce this week';
  if (heat === 'high') return 'High supply';
  if (heat === 'balanced') return 'Balanced supply';
  return null;
}

export function isLotBuyable(product) {
  if (!product) return false;
  if (product.commerce_mode === 'retail') return Number(product.stock) > 0;
  const status = product.lot_status || 'listed';
  if (!['listed', 'reserved'].includes(status)) return false;
  return Number(product.stock) > 0;
}

export function isReadyForPurchase(product, now = Date.now()) {
  if (!product?.ready_from) return true;
  const t = new Date(product.ready_from).getTime();
  if (Number.isNaN(t)) return true;
  return t <= now;
}
