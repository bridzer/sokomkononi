// -----------------------------------------------------------------------------
// Business + contact configuration
// -----------------------------------------------------------------------------
import { formatProductPrice } from './pricing';

// Numbers are pulled from environment variables so an admin can update them
// without touching source code. Only variables prefixed with REACT_APP_ are
// exposed to the React bundle by Create React App.
//
// After editing client/.env you must rebuild the client (`npm run build` or
// restart `npm start`) for the changes to take effect — env vars are baked in
// at build time.
// -----------------------------------------------------------------------------

/**
 * Normalize a raw phone string into Kenyan international form.
 * Returns { intl, local, wa, display } or null when the input is unusable.
 *
 * Accepts: "0756908482", "+254 756 908 482", "254756908482", "0208224938",
 *          "+254-208-224-938", "020 822 4938", etc.
 */
function parseKenyanPhone(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[\s\-().+]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;

  let digits;
  if (cleaned.startsWith('254')) digits = cleaned;
  else if (cleaned.startsWith('0')) digits = '254' + cleaned.slice(1);
  else if (/^[71]\d{8}$/.test(cleaned)) digits = '254' + cleaned;
  else return null;

  if (digits.length < 11 || digits.length > 13) return null;

  const intl = '+' + digits;
  const local = '0' + digits.slice(3);
  const wa = digits;
  const subs = digits.slice(3);
  const display =
    subs.length === 9
      ? `+254 ${subs.slice(0, 3)} ${subs.slice(3, 6)} ${subs.slice(6, 9)}`
      : intl;

  return { intl, local, wa, display };
}

function envStr(key) {
  const v = process.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Read a single line (index i) out of the environment. Returns null if the
 * required number is missing / unparseable.
 *
 *   REACT_APP_PHONE_{i}_NUMBER    - the number to call (required)
 *   REACT_APP_PHONE_{i}_WHATSAPP  - override WhatsApp number for this line
 *                                   (optional). Set to a blank string to
 *                                   exclude the line from the WhatsApp menu.
 *   REACT_APP_PHONE_{i}_LABEL     - short heading (e.g. "Main Line")
 *   REACT_APP_PHONE_{i}_SUBTITLE  - one-line description
 *   REACT_APP_PHONE_{i}_DISPLAY   - pretty display string (falls back to auto)
 *   REACT_APP_PHONE_{i}_ID        - stable id (falls back to "line{i}")
 */
function readEnvLine(i) {
  const raw = envStr(`REACT_APP_PHONE_${i}_NUMBER`);
  if (!raw) return null;
  const parsed = parseKenyanPhone(raw);
  if (!parsed) return null;

  const waKey = `REACT_APP_PHONE_${i}_WHATSAPP`;
  const hasWaOverride = Object.prototype.hasOwnProperty.call(process.env, waKey);
  const waRaw = hasWaOverride ? envStr(waKey) : null;
  // hasWaOverride && empty string  -> WhatsApp explicitly disabled for this line
  // hasWaOverride && non-empty     -> use the override
  // no override                    -> WhatsApp uses the call number
  let wa = null;
  if (hasWaOverride) {
    if (waRaw) {
      const p = parseKenyanPhone(waRaw);
      wa = p ? p.wa : null;
    }
  } else {
    wa = parsed.wa;
  }

  return {
    id: envStr(`REACT_APP_PHONE_${i}_ID`) || `line${i}`,
    label: envStr(`REACT_APP_PHONE_${i}_LABEL`) || `Line ${i}`,
    subtitle: envStr(`REACT_APP_PHONE_${i}_SUBTITLE`) || '',
    display: envStr(`REACT_APP_PHONE_${i}_DISPLAY`) || parsed.display,
    intl: parsed.intl,
    local: parsed.local,
    wa,
  };
}

// Hardcoded fallback used only if no REACT_APP_PHONE_*_NUMBER is set in .env.
// Matches the previous behaviour so the site keeps working out of the box.
const FALLBACK_LINES = [
  {
    id: 'main',
    label: 'Main Line',
    subtitle: 'Sales & orders',
    number: '+254208224938',
    whatsapp: '+254756908482',
    display: '020 822 4938/014 387 6296',
  },
  {
    id: 'naivasha',
    label: 'Naivasha Branch',
    subtitle: 'Poultry & eggs',
    number: '+254756908482',
  },
];

function buildFallback() {
  return FALLBACK_LINES.map((d) => {
    const parsed = parseKenyanPhone(d.number);
    if (!parsed) return null;
    let wa = parsed.wa;
    if (Object.prototype.hasOwnProperty.call(d, 'whatsapp')) {
      wa = d.whatsapp ? parseKenyanPhone(d.whatsapp)?.wa || null : null;
    }
    return {
      id: d.id,
      label: d.label,
      subtitle: d.subtitle || '',
      display: d.display || parsed.display,
      intl: parsed.intl,
      local: parsed.local,
      wa,
    };
  }).filter(Boolean);
}

function buildLines() {
  const lines = [];
  for (let i = 1; i <= 8; i++) {
    const line = readEnvLine(i);
    if (line) lines.push(line);
  }
  return lines.length ? lines : buildFallback();
}

const _lines = buildLines();

// -----------------------------------------------------------------------------
// Public exports
// -----------------------------------------------------------------------------

export const BUSINESS = {
  name: envStr('REACT_APP_BUSINESS_NAME') || 'Kalro Farm Kenya',
  location: envStr('REACT_APP_BUSINESS_LOCATION') || 'Naivasha, Nakuru County, Kenya',
  email: envStr('REACT_APP_BUSINESS_EMAIL') || 'info@kalro.store',
};

/** Google Maps embed settings (homepage location section). */
export const MAP_CONFIG = {
  apiKey: envStr('REACT_APP_GOOGLE_MAPS_API_KEY'),
  lat: envStr('REACT_APP_GOOGLE_MAPS_LAT')
    ? Number(envStr('REACT_APP_GOOGLE_MAPS_LAT'))
    : -0.7167,
  lng: envStr('REACT_APP_GOOGLE_MAPS_LNG')
    ? Number(envStr('REACT_APP_GOOGLE_MAPS_LNG'))
    : 36.4333,
  zoom: Number(envStr('REACT_APP_GOOGLE_MAPS_ZOOM')) || 14,
  query:
    envStr('REACT_APP_GOOGLE_MAPS_QUERY') ||
    envStr('REACT_APP_BUSINESS_LOCATION') ||
    'Kalro Farm Kenya, Naivasha',
  title: envStr('REACT_APP_GOOGLE_MAPS_TITLE') || 'Visit Kalro Farm Kenya',
  description:
    envStr('REACT_APP_GOOGLE_MAPS_DESCRIPTION') ||
    'Find us in Naivasha. Get directions, plan your visit, or share our location with your driver.',
  hours: envStr('REACT_APP_GOOGLE_MAPS_HOURS') || 'Mon–Sat: 8:00 AM – 6:00 PM',
};

/** All configured phone lines (for calling). */
export const PHONE_NUMBERS = _lines.map((l) => ({
  id: l.id,
  label: l.label,
  subtitle: l.subtitle,
  number: l.local,   // e.g. "0208224938" (local, for display / legacy code)
  intl: l.intl,      // e.g. "+254208224938" (used by tel: links)
  display: l.display,
}));

/** Configured WhatsApp lines (subset — a line can opt out of WhatsApp). */
export const WHATSAPP_NUMBERS = _lines
  .filter((l) => l.wa)
  .map((l) => ({
    id: l.id,
    label: l.label,
    subtitle: l.subtitle,
    number: l.wa,    // e.g. "254756908482" (wa.me / WhatsApp API format)
    display: l.display,
  }));

// Backwards-compat singletons used by older code.
BUSINESS.phone = PHONE_NUMBERS[0]?.number || '';
BUSINESS.phoneIntl = PHONE_NUMBERS[0]?.intl || '';
BUSINESS.whatsapp = WHATSAPP_NUMBERS[0]?.number || PHONE_NUMBERS[0]?.intl?.replace('+', '') || '';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function formatKsh(amount) {
  const n = Number(amount) || 0;
  return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

export { formatProductPrice, isRangePrice } from './pricing';

/**
 * Normalize a Kenyan phone number to wa.me format (e.g. "254712345678").
 * Accepts inputs like "0712345678", "+254712345678", "254712345678",
 * "0712 345 678", etc. Returns null if it can't be normalized.
 */
export function normalizeKenyanPhone(phone) {
  return parseKenyanPhone(phone)?.wa || null;
}

/**
 * Build a wa.me link.
 * @param {string} text - Pre-filled message body.
 * @param {string} [number] - Digits-only form (e.g. "254756908482"). Defaults to the primary line.
 */
export function whatsappUrl(text, number) {
  const to = number || WHATSAPP_NUMBERS[0]?.number || BUSINESS.whatsapp;
  const encoded = encodeURIComponent(text || '');
  return `https://wa.me/${to}?text=${encoded}`;
}

export function orderWhatsAppMessage(product) {
  const priceText = formatProductPrice(product);
  return (
    `Hello ${BUSINESS.name}, I'm interested in *${product.name}*` +
    (product.age_stage ? ` (${product.age_stage})` : '') +
    ` priced at ${priceText}. Please share more details.`
  );
}

export function cartWhatsAppMessage(items, total, customer) {
  const lines = [
    `Hello ${BUSINESS.name}, I'd like to place an order:`,
    '',
    ...items.map((i) => {
      const priceLabel =
        i.price_type === 'range' && i.price_max
          ? `KSh ${Number(i.price).toLocaleString()} – KSh ${Number(i.price_max).toLocaleString()} (est. from min)`
          : `KSh ${Number(i.price).toLocaleString()}`;
      return `- ${i.name} x${i.quantity} @ ${priceLabel} = KSh ${(
        i.price * i.quantity
      ).toLocaleString()}`;
    }),
    '',
    `Total: KSh ${Number(total).toLocaleString()}`,
  ];
  if (customer) {
    lines.push('');
    if (customer.name) lines.push(`Name: ${customer.name}`);
    if (customer.phone) lines.push(`Phone: ${customer.phone}`);
    if (customer.delivery_address) lines.push(`Address: ${customer.delivery_address}`);
    if (customer.county) lines.push(`County: ${customer.county}`);
    if (customer.order_number) lines.push(`Order Number: ${customer.order_number}`);
  }
  return lines.join('\n');
}

/**
 * Copy an arbitrary string to the clipboard. Falls back to a hidden textarea
 * where the Clipboard API is unavailable (older mobile browsers, insecure
 * contexts). Returns a boolean promise.
 */
export async function copyText(value) {
  const s = String(value ?? '');
  try {
    if (navigator.clipboard && window.isSecureContext !== false) {
      await navigator.clipboard.writeText(s);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const el = document.createElement('textarea');
    el.value = s;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
