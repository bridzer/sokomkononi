import { formatProductPrice } from './pricing';

export function getSiteOrigin() {
  const fromEnv = (process.env.REACT_APP_SITE_URL || process.env.REACT_APP_APP_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://kalro.store';
}

/** Turn /uploads/... or relative paths into an absolute URL for sharing. */
export function toAbsoluteUrl(url, origin = getSiteOrigin()) {
  if (!url || typeof url !== 'string') return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = origin.replace(/\/+$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export function getProductPageUrl(slug, origin = getSiteOrigin()) {
  if (!slug) return getSiteOrigin();
  const base = origin.replace(/\/+$/, '');
  return `${base}/product/${encodeURIComponent(slug)}`;
}

export function buildProductShareText(product) {
  if (!product) return 'Soko Mkononi';
  const price = formatProductPrice(product);
  const parts = [product.name];
  if (price) parts.push(price);
  if (product.breed) parts.push(product.breed);
  parts.push('Soko Mkononi');
  return parts.filter(Boolean).join(' · ');
}

export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function facebookShareUrl(pageUrl) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function whatsAppShareUrl(pageUrl, text) {
  const message = text ? `${text}\n${pageUrl}` : pageUrl;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function twitterShareUrl(pageUrl, text) {
  const params = new URLSearchParams({ url: pageUrl });
  if (text) params.set('text', text);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function telegramShareUrl(pageUrl, text) {
  const params = new URLSearchParams({ url: pageUrl });
  if (text) params.set('text', text);
  return `https://t.me/share/url?${params.toString()}`;
}

export function linkedInShareUrl(pageUrl) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
}

export function emailShareUrl(pageUrl, subject, body) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const qs = params.toString();
  return qs ? `mailto:?${qs}` : 'mailto:';
}

export async function copyText(text) {
  if (!text) throw new Error('Nothing to copy');
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('Copy failed');
}

/** Open share popup; returns false if blocked. */
export function openSharePopup(url) {
  const win = window.open(url, '_blank', 'noopener,noreferrer,width=600,height=560');
  return Boolean(win);
}

export async function shareProduct(product) {
  const pageUrl = getProductPageUrl(product.slug);
  const text = buildProductShareText(product);

  if (canNativeShare()) {
    try {
      await navigator.share({
        title: product.name,
        text,
        url: pageUrl,
      });
      return { method: 'native' };
    } catch (err) {
      if (err?.name === 'AbortError') return { method: 'cancelled' };
    }
  }

  await copyText(pageUrl);
  return { method: 'copy', pageUrl, text };
}

export function isProductShareable(product) {
  return Boolean(product?.slug);
}
