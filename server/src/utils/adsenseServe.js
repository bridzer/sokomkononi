const fs = require('fs');
const path = require('path');

const ADS_TXT_CERT = 'f08c47fec0942fa0';

function readEnv(name) {
  return (process.env[name] || '').trim();
}

function adsenseClientId() {
  return readEnv('REACT_APP_ADSENSE_CLIENT') || readEnv('ADSENSE_CLIENT');
}

function siteVerificationCode() {
  return readEnv('REACT_APP_GOOGLE_SITE_VERIFICATION') || readEnv('GOOGLE_SITE_VERIFICATION');
}

/**
 * Build ads.txt body. Google expects: google.com, pub-XXXXXXXX, DIRECT, f08c47fec0942fa0
 */
function buildAdsTxt() {
  const client = adsenseClientId();
  if (!client) return null;
  const pubId = client.replace(/^ca-/, '');
  return `google.com, ${pubId}, DIRECT, ${ADS_TXT_CERT}\n`;
}

/**
 * Inject AdSense verification tags into HTML if not already present.
 * Google's crawler reads raw HTML — React never runs for verification.
 */
function injectAdsenseVerification(html) {
  if (!html || typeof html !== 'string') return html;

  const client = adsenseClientId();
  const verification = siteVerificationCode();

  const hasScript = html.includes('pagead/js/adsbygoogle.js');
  const hasAccountMeta = html.includes('google-adsense-account');
  const hasSiteMeta = verification && html.includes('google-site-verification');

  if ((!client || hasScript) && (!verification || hasSiteMeta)) {
    return html;
  }

  const tags = [];
  if (verification && !hasSiteMeta) {
    tags.push(`<meta name="google-site-verification" content="${verification}" />`);
  }
  if (client && !hasAccountMeta) {
    tags.push(`<meta name="google-adsense-account" content="${client}" />`);
  }
  if (client && !hasScript) {
    tags.push(
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`
    );
  }

  if (!tags.length) return html;
  return html.replace('</head>', `${tags.join('\n')}\n</head>`);
}

/**
 * Register /ads.txt and HTML injection for SPA routes.
 * @param {import('express').Express} app
 * @param {string} clientBuildDir - path to client/build
 */
function registerAdsenseRoutes(app, clientBuildDir) {
  const indexPath = path.join(clientBuildDir, 'index.html');
  let cachedIndexHtml = null;

  function loadIndexHtml() {
    if (!fs.existsSync(indexPath)) return null;
    if (!cachedIndexHtml) {
      cachedIndexHtml = fs.readFileSync(indexPath, 'utf8');
    }
    return injectAdsenseVerification(cachedIndexHtml);
  }

  app.get('/ads.txt', (_req, res) => {
    const filePath = path.join(clientBuildDir, 'ads.txt');
    if (fs.existsSync(filePath)) {
      res.type('text/plain');
      return res.sendFile(filePath);
    }

    const body = buildAdsTxt();
    if (body) {
      res.type('text/plain');
      return res.send(body);
    }

    return res.status(404).type('text/plain').send('Not found\n');
  });

  return { loadIndexHtml };
}

module.exports = {
  adsenseClientId,
  buildAdsTxt,
  injectAdsenseVerification,
  registerAdsenseRoutes,
};
