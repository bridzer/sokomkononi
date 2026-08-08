const crypto = require('crypto');
const { deliveryLabel } = require('../constants/delivery');

/** Unpredictable order number: KF-YYYYMMDD- + 16 hex chars (~64 bits entropy). */
function genOrderNumber() {
  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(8).toString('hex');
  return `KF-${stamp}-${rand}`;
}

/** Opaque token required for unauthenticated order/payment views. */
function genViewToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Public confirmation DTO — omits internal ids, notes, email, user_id.
 * Token holders already know the order; still avoid dumping the full row.
 */
function toPublicOrder(order, items = []) {
  return {
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    delivery_address: order.delivery_address,
    county: order.county,
    country_code: order.country_code || null,
    country_name: order.country_name || null,
    address_line1: order.address_line1 || null,
    address_line2: order.address_line2 || null,
    postal_code: order.postal_code || null,
    sub_county: order.sub_county || null,
    location: order.location || null,
    sub_location: order.sub_location || null,
    latitude: order.latitude != null ? Number(order.latitude) : null,
    longitude: order.longitude != null ? Number(order.longitude) : null,
    total_amount: order.total_amount,
    status: order.status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    delivery_method: order.delivery_method || 'soko_delivery',
    delivery_min_days: order.delivery_min_days,
    delivery_max_days: order.delivery_max_days,
    delivery_label: deliveryLabel(order.delivery_min_days, order.delivery_max_days),
    items: (items || []).map((it) => ({
      id: it.id,
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
    })),
  };
}

/**
 * Allow access when:
 * - valid view_token matches the order, or
 * - authenticated owner, or
 * - authenticated admin
 */
function tokensEqual(a, b) {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function canAccessOrder(order, { viewToken, user } = {}) {
  if (!order) return false;
  const token = typeof viewToken === 'string' ? viewToken.trim() : '';
  if (token && order.view_token && tokensEqual(token, order.view_token)) {
    return true;
  }
  if (user?.role === 'admin') return true;
  if (user?.id != null && order.user_id != null && Number(user.id) === Number(order.user_id)) {
    return true;
  }
  return false;
}

module.exports = {
  genOrderNumber,
  genViewToken,
  toPublicOrder,
  canAccessOrder,
};
