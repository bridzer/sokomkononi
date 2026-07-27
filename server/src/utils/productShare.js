const { query } = require('../db');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSiteBaseUrl(req) {
  const fromEnv = (process.env.APP_BASE_URL || process.env.CLIENT_URL || '')
    .trim()
    .replace(/\/+$/, '');
  // Never treat CORS "*" as a site origin.
  if (fromEnv && fromEnv !== '*') return fromEnv;

  // Production: never derive absolute URLs from Host / X-Forwarded-Host (poisoning).
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[productShare] APP_BASE_URL/CLIENT_URL unset in production — using https://kalro.store'
    );
    return 'https://kalro.store';
  }

  // Local/dev only: allow request Host so OG tags work without env.
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  return host ? `${proto}://${host}` : 'http://localhost:3000';
}

function toAbsoluteMediaUrl(url, siteBase) {
  if (!url || typeof url !== 'string') return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = siteBase.replace(/\/+$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

function formatPriceLabel(product) {
  const type = product.price_type || 'fixed';
  const min = Number(product.price);
  const max = Number(product.price_max);
  if (type === 'range' && Number.isFinite(min) && Number.isFinite(max)) {
    return `KES ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (Number.isFinite(min)) return `KES ${min.toLocaleString()}`;
  return '';
}

function buildShareDescription(product) {
  const price = formatPriceLabel(product);
  const bits = [];
  if (product.description) bits.push(String(product.description).trim());
  else {
    if (product.breed) bits.push(product.breed);
    if (product.age_stage) bits.push(product.age_stage);
    if (price) bits.push(price);
    bits.push('Free countrywide delivery from Soko Mkononi.');
  }
  const text = bits.filter(Boolean).join(' · ');
  return text.length > 300 ? `${text.slice(0, 297)}…` : text;
}

function buildProductMeta(product, siteBase) {
  const pageUrl = `${siteBase.replace(/\/+$/, '')}/product/${encodeURIComponent(product.slug)}`;
  const imageUrl =
    toAbsoluteMediaUrl(product.image_url, siteBase) ||
    `${siteBase.replace(/\/+$/, '')}/soko-mkononi-logo.png`;
  const title = `${product.name} | Soko Mkononi`;
  const description = buildShareDescription(product);

  return { pageUrl, imageUrl, title, description };
}

/**
 * Inject product Open Graph / Twitter tags so Facebook & other crawlers
 * show the cover image and link to this product page.
 */
function injectProductShareTags(html, product, siteBase) {
  if (!html || !product) return html;

  const { pageUrl, imageUrl, title, description } = buildProductMeta(product, siteBase);

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, '');
  out = out.replace(/<meta\s+property="og:[^"]+"\s+content="[^"]*"\s*\/?>/gi, '');
  out = out.replace(/<meta\s+name="twitter:[^"]+"\s+content="[^"]*"\s*\/?>/gi, '');

  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:site_name" content="Soko Mkononi" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
  ].join('\n    ');

  return out.replace('</head>', `    ${tags}\n  </head>`);
}

async function fetchProductForShare(slug) {
  const result = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1 AND p.is_active = TRUE`,
    [slug]
  );
  return result.rows[0] || null;
}

module.exports = {
  getSiteBaseUrl,
  toAbsoluteMediaUrl,
  buildProductMeta,
  injectProductShareTags,
  fetchProductForShare,
};
