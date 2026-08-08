/** Shared commerce copy & helpers for cart / checkout / product detail. */

/** Hybrid model: marketplace (limited supply) vs retail (constant supply). */
export const COMMERCE_MODES = {
  marketplace: {
    id: 'marketplace',
    label: 'Marketplace',
    short: 'Farm marketplace',
    description:
      'Limited-supply listing from farmers and producers — quality and price compete in the open market.',
  },
  retail: {
    id: 'retail',
    label: 'Store',
    short: 'Farm store',
    description:
      'Constant-supply goods (inputs, feed, tools, machinery) sold from the Soko Mkononi store.',
  },
};

export function normalizeCommerceMode(productOrMode) {
  const raw =
    typeof productOrMode === 'string'
      ? productOrMode
      : productOrMode?.commerce_mode;
  return raw === 'marketplace' ? 'marketplace' : 'retail';
}

export function isMarketplaceProduct(product) {
  return normalizeCommerceMode(product) === 'marketplace';
}

export function commerceModeLabel(product) {
  return COMMERCE_MODES[normalizeCommerceMode(product)].label;
}

/** Featured only while flag is on and optional expiry is still in the future. */
export function isEffectivelyFeatured(product) {
  if (!product?.is_featured) return false;
  if (!product.featured_until) return true;
  const until = new Date(product.featured_until);
  if (Number.isNaN(until.getTime())) return true;
  return until.getTime() > Date.now();
}

export const DELIVERY_METHODS = [
  {
    id: 'soko_delivery',
    label: 'Delivered by Soko Mkononi',
    short: 'Soko delivery',
    description:
      'We arrange insured countrywide delivery to your address. Add your shipping details below.',
  },
  {
    id: 'pickup',
    label: 'Come and pick up',
    short: 'Pickup',
    description:
      'Collect your order from the agreed farm / depot location. We’ll confirm the pickup point on WhatsApp.',
  },
  {
    id: 'own_transport',
    label: 'Arrange my own transport',
    short: 'Own transport',
    description:
      'You organise collection or a third-party transporter. We’ll coordinate timing with you.',
  },
];

export function isPlatformFulfilled(itemOrProduct) {
  const by = itemOrProduct?.fulfilled_by;
  if (by === 'seller') return false;
  if (by === 'platform') return true;
  // Legacy cart rows without fulfilled_by → treat as platform
  return !itemOrProduct?.seller_id;
}

export function fulfillmentLabel(itemOrProduct) {
  return isPlatformFulfilled(itemOrProduct)
    ? 'Fulfilled by Soko Mkononi'
    : `Fulfilled by ${itemOrProduct?.seller_display_name || itemOrProduct?.seller_name || 'seller'}`;
}

export function groupCartByFulfillment(items) {
  const platform = [];
  const seller = [];
  for (const item of items) {
    if (isPlatformFulfilled(item)) platform.push(item);
    else seller.push(item);
  }
  return { platform, seller };
}

export const INSURANCE_COPY = {
  platform:
    'Peace of mind, guaranteed: every delivery handled by Soko Mkononi is fully covered by our delivery assurance — if your order is damaged or lost in transit under our care, we make it right.',
  external:
    'Deliveries arranged by the seller, pickup, or your own transport are outside Soko Mkononi’s courier network. We can help you add optional delivery assurance on request — chat with us before dispatch.',
};

export const FRAUD_NOTICE =
  'Fraud alert: Soko Mkononi will never ask you to share your M-Pesa PIN, OTP, or banking passwords. Only pay through the official checkout / Loop prompt on this site, or confirm payment instructions with our verified WhatsApp lines. Report suspicious requests immediately.';

export const REFUND_POLICY =
  'Refund policy (Soko Mkononi payments): Orders paid through Soko Mkononi (Loop / in-app checkout) are eligible for a refund or replacement if the product is not as described, arrives damaged under our insured delivery, or cannot be fulfilled. Request within 48 hours of delivery with photos/order number. Refunds for prepaid orders are processed to the original payment method within 3–7 working days after approval. Cash-on-delivery / seller-arranged payments follow the seller’s terms with Soko Mkononi mediation available.';

export function sellerChatMessage(product) {
  const name = product?.name || 'a product';
  const slug = product?.slug ? ` (/product/${product.slug})` : '';
  return `Hi! I'm interested in "${name}"${slug} on Soko Mkononi. Can we chat?`;
}
