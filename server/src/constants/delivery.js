/** Standard countrywide delivery window (working days). */
const DELIVERY_MIN_DAYS = 3;
const DELIVERY_MAX_DAYS = 7;

const DEFAULT_SELLER_NAME = 'Soko Mkononi';

function deliveryLabel(min = DELIVERY_MIN_DAYS, max = DELIVERY_MAX_DAYS) {
  return `${min}–${max} working days`;
}

module.exports = {
  DELIVERY_MIN_DAYS,
  DELIVERY_MAX_DAYS,
  DEFAULT_SELLER_NAME,
  deliveryLabel,
};
