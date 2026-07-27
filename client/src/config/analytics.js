/**
 * Google Analytics 4 (GA4) configuration.
 *
 * Set REACT_APP_GA_* in client/.env (rebuild/redeploy after changes).
 * Server can also inject the gtag snippet at runtime via GA_MEASUREMENT_ID.
 */

const parseBool = (value) => value === 'true' || value === '1';

const analyticsConfig = {
  /** Master switch — REACT_APP_GA_ENABLED=true */
  enabled: parseBool(process.env.REACT_APP_GA_ENABLED),

  /** GA4 Measurement ID, e.g. G-XXXXXXXXXX */
  measurementId: (process.env.REACT_APP_GA_MEASUREMENT_ID || '').trim(),

  /** Anonymize visitor IP in GA reports (recommended) */
  anonymizeIp: process.env.REACT_APP_GA_ANONYMIZE_IP !== 'false',

  /** GA debug mode — events appear in DebugView */
  debug: parseBool(process.env.REACT_APP_GA_DEBUG),

  /** Sent as a custom user property on every event */
  businessName: (
    process.env.REACT_APP_GA_BUSINESS_NAME ||
    process.env.REACT_APP_BUSINESS_NAME ||
    'Soko Mkononi'
  ).trim(),

  /** Site / stream name for page_view page_location context */
  siteName: (process.env.REACT_APP_GA_SITE_NAME || 'Soko Mkononi').trim(),

  /** ISO 4217 currency for ecommerce events */
  currency: (process.env.REACT_APP_GA_CURRENCY || 'KES').trim().toUpperCase(),
};

/** Admin routes are never tracked */
const EXCLUDED_PATTERNS = [/^\/admin(?:\/|$)/];

export function isMeasurementIdValid(id = analyticsConfig.measurementId) {
  return /^G-[A-Z0-9]+$/i.test(String(id || '').trim());
}

export function isAnalyticsEnabled() {
  return analyticsConfig.enabled && isMeasurementIdValid();
}

export function isRouteEligibleForAnalytics(pathname = '') {
  return !EXCLUDED_PATTERNS.some((pattern) => pattern.test(pathname));
}

export default analyticsConfig;
