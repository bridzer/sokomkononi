/**
 * Central Google AdSense configuration.
 *
 * All ad slots and feature flags live here so ads can be enabled, disabled,
 * or reconfigured without touching component code. Values come from REACT_APP_*
 * env vars (baked in at build time — restart dev server / redeploy after edits).
 */

const parseBool = (value) => value === 'true' || value === '1';

const adsenseConfig = {
  /** Master switch — set REACT_APP_ADSENSE_ENABLED=true to turn ads on */
  enabled: parseBool(process.env.REACT_APP_ADSENSE_ENABLED),

  /** Publisher ID, e.g. ca-pub-xxxxxxxxxxxxxxxx */
  client: (process.env.REACT_APP_ADSENSE_CLIENT || '').trim(),

  /** Insert one native ad after every N products (default 10) */
  interval: Math.max(1, Number(process.env.REACT_APP_ADSENSE_INTERVAL) || 10),

  /** Optional in-feed layout key from AdSense (for fluid native units) */
  layoutKey: (process.env.REACT_APP_ADSENSE_LAYOUT_KEY || '').trim(),

  /** Ad unit slot IDs — configure per page/context */
  slots: {
    nativeProducts: (process.env.REACT_APP_ADSENSE_NATIVE_PRODUCTS_SLOT || '').trim(),
    categoryNative: (process.env.REACT_APP_ADSENSE_CATEGORY_NATIVE_SLOT || '').trim(),
    searchNative: (process.env.REACT_APP_ADSENSE_SEARCH_NATIVE_SLOT || '').trim(),
    blogNative: (process.env.REACT_APP_ADSENSE_BLOG_NATIVE_SLOT || '').trim(),
  },
};

/** Routes that must never show ads (checkout, auth, admin, etc.) */
const AD_EXCLUDED_PATTERNS = [
  /^\/cart$/,
  /^\/checkout(?:\/|$)/,
  /^\/login$/,
  /^\/register$/,
  /^\/order-success(?:\/|$)/,
  /^\/admin(?:\/|$)/,
];

/**
 * Routes eligible for native in-feed ads.
 * Home embeds Shop, so "/" is included. Add patterns here when blog/deals pages ship.
 */
const AD_ELIGIBLE_PATTERNS = [
  /^\/$/,
  /^\/shop(?:\/|$)/,
];

export function isRouteEligibleForAds(pathname = '') {
  if (AD_EXCLUDED_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return false;
  }
  return AD_ELIGIBLE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isAdsEnabled() {
  return adsenseConfig.enabled && Boolean(adsenseConfig.client);
}

/**
 * Pick the best slot for the current listing context.
 * Falls back to nativeProducts when a context-specific slot is not configured.
 */
export function resolveSlotForContext({ categorySlug, search } = {}) {
  const { slots } = adsenseConfig;
  if (search && slots.searchNative) return slots.searchNative;
  if (categorySlug && slots.categoryNative) return slots.categoryNative;
  return slots.nativeProducts;
}

export default adsenseConfig;
