/**
 * Injects AdSense site-verification tags into public/index.html before build.
 *
 * Google's AdSense crawler reads the raw HTML — it does NOT run React.
 * The adsbygoogle.js script and meta tag must be present in <head> at crawl time.
 *
 * Run automatically via: npm run build (client)
 * Env vars (set on Railway before deploy):
 *   REACT_APP_ADSENSE_CLIENT          — ca-pub-… (required for script verification)
 *   REACT_APP_GOOGLE_SITE_VERIFICATION — optional meta-tag verification code from AdSense
 */
const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', 'public', 'index.html');
const START = '<!-- ADSENSE_VERIFICATION_START -->';
const END = '<!-- ADSENSE_VERIFICATION_END -->';

const client = (process.env.REACT_APP_ADSENSE_CLIENT || '').trim();
const siteVerification = (process.env.REACT_APP_GOOGLE_SITE_VERIFICATION || '').trim();

let html = fs.readFileSync(INDEX_PATH, 'utf8');

if (!html.includes(START) || !html.includes(END)) {
  console.error('[adsense-verification] Missing markers in public/index.html');
  process.exit(1);
}

const lines = [];
if (siteVerification) {
  lines.push(
    `    <meta name="google-site-verification" content="${siteVerification}" />`
  );
}
if (client) {
  lines.push(`    <meta name="google-adsense-account" content="${client}" />`);
  lines.push(
    `    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`
  );
}

const block = lines.length
  ? `${START}\n${lines.join('\n')}\n    ${END}`
  : `${START}\n    ${END}`;

html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
fs.writeFileSync(INDEX_PATH, html);

if (client) {
  console.log('[adsense-verification] Injected AdSense verification tags for', client);
} else {
  console.warn(
    '[adsense-verification] REACT_APP_ADSENSE_CLIENT not set — verification tags omitted'
  );
}

// Keep ads.txt in sync with the publisher id
if (client) {
  const pubId = client.replace(/^ca-/, '');
  const adsTxtPath = path.join(__dirname, '..', 'public', 'ads.txt');
  fs.writeFileSync(
    adsTxtPath,
    `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
  );
  console.log('[adsense-verification] Updated public/ads.txt');
}
