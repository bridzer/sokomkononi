import analyticsConfig, { isAnalyticsEnabled, isMeasurementIdValid } from '../config/analytics';

const SCRIPT_SRC = 'https://www.googletagmanager.com/gtag/js';

let initialized = false;

function gtagReady() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function ensureDataLayer() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/**
 * Load gtag.js once. Skips if the server already injected the script.
 */
export function loadGtagScript(measurementId = analyticsConfig.measurementId) {
  if (typeof window === 'undefined' || !isMeasurementIdValid(measurementId)) {
    return Promise.resolve(false);
  }

  ensureDataLayer();

  const existing = document.querySelector(`script[src^="${SCRIPT_SRC}"]`);
  if (existing) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `${SCRIPT_SRC}?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[analytics] Failed to load Google Analytics script');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/** Apply GA4 config — safe to call once per session. */
export async function initAnalytics() {
  if (!isAnalyticsEnabled() || initialized) return false;

  await loadGtagScript();
  ensureDataLayer();

  window.gtag('js', new Date());
  window.gtag('config', analyticsConfig.measurementId, {
    send_page_view: false,
    anonymize_ip: analyticsConfig.anonymizeIp,
    debug_mode: analyticsConfig.debug,
    cookie_flags: 'SameSite=None;Secure',
  });

  if (analyticsConfig.businessName) {
    window.gtag('set', 'user_properties', {
      business_name: analyticsConfig.businessName,
    });
  }

  initialized = true;
  return true;
}

export function trackPageView({ path, title, location } = {}) {
  if (!isAnalyticsEnabled() || !gtagReady()) return;

  const pagePath = path || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');
  const pageLocation = location || (typeof window !== 'undefined' ? window.location.href : '');

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: pageLocation,
    site_name: analyticsConfig.siteName,
  });
}

export function trackEvent(name, params = {}) {
  if (!isAnalyticsEnabled() || !gtagReady() || !name) return;

  window.gtag('event', name, {
    site_name: analyticsConfig.siteName,
    business_name: analyticsConfig.businessName,
    ...params,
  });
}

function lineItemFromProduct(product, quantity = 1) {
  return {
    item_id: String(product.id || product.product_id || product.slug || 'unknown'),
    item_name: product.name,
    item_category: product.category_name || undefined,
    price: Number(product.price) || 0,
    quantity: Number(quantity) || 1,
  };
}

export function trackViewItem(product) {
  if (!product) return;
  const price = Number(product.price) || 0;
  trackEvent('view_item', {
    currency: analyticsConfig.currency,
    value: price,
    items: [lineItemFromProduct(product, 1)],
  });
}

export function trackViewItemList(products, listName = 'Product list') {
  if (!Array.isArray(products) || !products.length) return;
  trackEvent('view_item_list', {
    item_list_name: listName,
    items: products.slice(0, 30).map((p, index) => ({
      ...lineItemFromProduct(p, 1),
      index,
    })),
  });
}

export function trackAddToCart(product, quantity = 1) {
  if (!product) return;
  const qty = Number(quantity) || 1;
  const price = Number(product.price) || 0;
  trackEvent('add_to_cart', {
    currency: analyticsConfig.currency,
    value: price * qty,
    items: [lineItemFromProduct(product, qty)],
  });
}

export function trackRemoveFromCart(product, quantity = 1) {
  if (!product) return;
  const qty = Number(quantity) || 1;
  const price = Number(product.price || product.unit_price) || 0;
  trackEvent('remove_from_cart', {
    currency: analyticsConfig.currency,
    value: price * qty,
    items: [
      {
        item_id: String(product.product_id || product.id || 'unknown'),
        item_name: product.name,
        price,
        quantity: qty,
      },
    ],
  });
}

export function trackBeginCheckout(items, total) {
  trackEvent('begin_checkout', {
    currency: analyticsConfig.currency,
    value: Number(total) || 0,
    items: (items || []).map((item) => ({
      item_id: String(item.product_id),
      item_name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    })),
  });
}

export function trackPurchase(order) {
  if (!order) return;
  const items = (order.items || []).map((it) => ({
    item_id: String(it.product_id || it.id || 'unknown'),
    item_name: it.product_name || it.name,
    price: Number(it.unit_price || it.price) || 0,
    quantity: Number(it.quantity) || 1,
  }));

  trackEvent('purchase', {
    transaction_id: order.order_number,
    currency: analyticsConfig.currency,
    value: Number(order.total_amount) || 0,
    payment_type: order.payment_method || undefined,
    items,
  });
}

export function trackGenerateLead(source = 'contact_form') {
  trackEvent('generate_lead', { lead_source: source });
}

export function trackWhatsAppClick(context = 'general') {
  trackEvent('whatsapp_click', { click_context: context });
}

export function trackShare(contentType, itemId, method) {
  trackEvent('share', {
    content_type: contentType,
    item_id: String(itemId || ''),
    method: method || 'unknown',
  });
}

export function trackSearch(searchTerm) {
  if (!searchTerm) return;
  trackEvent('search', { search_term: String(searchTerm).slice(0, 100) });
}

/** For tests */
export function resetAnalyticsForTests() {
  initialized = false;
}
