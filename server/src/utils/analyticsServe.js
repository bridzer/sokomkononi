function readEnv(name) {
  return (process.env[name] || '').trim();
}

function isMeasurementIdValid(id) {
  return /^G-[A-Z0-9]+$/i.test(String(id || '').trim());
}

function isAnalyticsEnabled() {
  const enabled =
    readEnv('GA_ENABLED') === 'true' || readEnv('REACT_APP_GA_ENABLED') === 'true';
  const id = readEnv('GA_MEASUREMENT_ID') || readEnv('REACT_APP_GA_MEASUREMENT_ID');
  return enabled && isMeasurementIdValid(id);
}

/**
 * Inject GA4 gtag snippet into SPA index.html at serve time.
 * Complements the React hook — captures the first paint before JS bundles load.
 */
function injectGoogleAnalytics(html) {
  if (!html || typeof html !== 'string') return html;
  if (!isAnalyticsEnabled()) return html;
  if (html.includes('googletagmanager.com/gtag/js')) return html;

  const measurementId = (
    readEnv('GA_MEASUREMENT_ID') || readEnv('REACT_APP_GA_MEASUREMENT_ID')
  ).trim();
  const anonymizeIp = readEnv('GA_ANONYMIZE_IP') !== 'false';
  const debug = readEnv('GA_DEBUG') === 'true' || readEnv('REACT_APP_GA_DEBUG') === 'true';

  const tags = [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>`,
    `<script>`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('js', new Date());`,
    `  gtag('config', '${measurementId}', {`,
    `    send_page_view: false,`,
    `    anonymize_ip: ${anonymizeIp},`,
    `    debug_mode: ${debug},`,
    `    cookie_flags: 'SameSite=None;Secure'`,
    `  });`,
    `</script>`,
  ].join('\n    ');

  return html.replace('</head>', `    ${tags}\n  </head>`);
}

module.exports = {
  injectGoogleAnalytics,
  isAnalyticsEnabled,
};
