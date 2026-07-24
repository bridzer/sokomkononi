/** Countrywide delivery window shown across the storefront. */
export const DELIVERY_MIN_DAYS = 3;
export const DELIVERY_MAX_DAYS = 7;

export function deliveryLabel(min = DELIVERY_MIN_DAYS, max = DELIVERY_MAX_DAYS) {
  return `${min}–${max} working days`;
}

export const DEFAULT_SELLER_NAME = 'Kalro Farm Kenya';

export function getSellerDisplayName(product) {
  return product?.seller_display_name || product?.seller_name || DEFAULT_SELLER_NAME;
}
