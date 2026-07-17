/**
 * Loop Payment Gateway client (WSO2 APIM sandbox/production).
 *
 * Docs portal: https://sandbox.loop.co.ke/devportal/docs/loop-api/introduction
 *
 * Credentials (NEVER expose to the browser):
 *   LOOP_API_BASE_URL       — https://sandbox.loop.co.ke (NOT api-sandbox.loopdfs.co.ke)
 *   LOOP_CLIENT_ID
 *   LOOP_CLIENT_SECRET
 *   LOOP_API_KEY            — optional subscription/API key (X-API-Key header)
 *   LOOP_WEBHOOK_SECRET     — optional HMAC verification for callbacks
 *   APP_BASE_URL            — public site URL for callback (e.g. https://kalro.store)
 *   LOOP_PAYMENT_INIT_PATH  — default /loop-api/1.0.0/payments/initiate
 *   LOOP_OAUTH_SCOPE        — optional OAuth scope (default: server default scope)
 */
const crypto = require('crypto');

const DEFAULT_INIT_PATH = '/loop-api/1.0.0/payments/initiate';
const DEFAULT_BASE_URL = 'https://sandbox.loop.co.ke';

/** Known invalid hostnames from onboarding docs — map to the working WSO2 gateway. */
const BASE_URL_ALIASES = {
  'https://api-sandbox.loopdfs.co.ke': DEFAULT_BASE_URL,
  'http://api-sandbox.loopdfs.co.ke': DEFAULT_BASE_URL,
  'https://api-sandbox.loop.co.ke': DEFAULT_BASE_URL,
  'http://api-sandbox.loop.co.ke': DEFAULT_BASE_URL,
};

let cachedToken = null;
let tokenExpiresAt = 0;
let warnedBaseUrl = false;

function env(name, fallback = '') {
  return (process.env[name] || fallback).trim();
}

function resolveBaseUrl() {
  let raw = env('LOOP_API_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, '');
  const aliased = BASE_URL_ALIASES[raw];
  if (aliased) {
    if (!warnedBaseUrl) {
      console.warn(
        `[loop] LOOP_API_BASE_URL "${raw}" is not reachable — using "${aliased}" instead`
      );
      warnedBaseUrl = true;
    }
    raw = aliased;
  }
  return raw;
}

function baseUrl() {
  return resolveBaseUrl();
}

function appBaseUrl() {
  return env('APP_BASE_URL', env('CLIENT_URL', 'http://localhost:3000')).replace(/\/+$/, '');
}

function isConfigured() {
  return Boolean(env('LOOP_CLIENT_ID') && env('LOOP_CLIENT_SECRET') && baseUrl());
}

function apiKey() {
  return env('LOOP_API_KEY');
}

function buildAuthHeaders(token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const key = apiKey();
  if (key) {
    headers['X-API-Key'] = key;
    headers.apikey = key;
  }
  return headers;
}

function loopApiErrorMessage(status, data) {
  const base =
    data.message ||
    data.description ||
    data.error_description ||
    data.error ||
    `Loop API error (${status})`;

  if (status === 401) {
    return (
      'Loop API rejected the request (401 Unauthorized). ' +
      'In the Loop developer portal, subscribe your application to the Loop API, ' +
      'confirm LOOP_CLIENT_ID / LOOP_CLIENT_SECRET, and set LOOP_API_KEY if provided. ' +
      `(${base})`
    );
  }

  return base;
}

/** Normalize Kenyan phone to 254XXXXXXXXX */
function normalizeLoopPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  if (digits.startsWith('254')) return digits;
  return null;
}

async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (cause) {
    const host = (() => {
      try {
        return new URL(url).origin;
      } catch {
        return url;
      }
    })();
    const code = cause?.cause?.code || cause?.code;
    const unreachable = code === 'EAI_AGAIN' || code === 'ENOTFOUND' || code === 'ECONNREFUSED';
    const msg = unreachable
      ? `Cannot reach Loop API at ${host} (${code || 'network error'}). Set LOOP_API_BASE_URL=https://sandbox.loop.co.ke`
      : `Loop API request failed: ${cause.message}`;

    const err = new Error(msg);
    err.status = 502;
    err.expose = true;
    err.cause = cause;
    throw err;
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = loopApiErrorMessage(res.status, data);
    const err = new Error(msg);
    err.status = res.status >= 500 ? 502 : res.status;
    err.expose = res.status === 401 || res.status === 400 || res.status === 403;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * OAuth2 client credentials (WSO2 APIM standard).
 */
async function getAccessToken() {
  if (!isConfigured()) {
    throw Object.assign(new Error('Loop payment is not configured on the server'), {
      status: 503,
      expose: true,
    });
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 5000) {
    return cachedToken;
  }

  const clientId = env('LOOP_CLIENT_ID');
  const clientSecret = env('LOOP_CLIENT_SECRET');
  const authMode = env('LOOP_OAUTH_MODE', 'basic').toLowerCase();
  const scope = env('LOOP_OAUTH_SCOPE');

  let headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...buildAuthHeaders(),
  };
  let body = 'grant_type=client_credentials';
  if (scope) {
    body += `&scope=${encodeURIComponent(scope)}`;
  }

  if (authMode === 'body') {
    body += `&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;
  } else {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const data = await fetchJson(`${baseUrl()}/oauth2/token`, {
    method: 'POST',
    headers,
    body,
  });

  cachedToken = data.access_token;
  const expiresIn = Number(data.expires_in) || 3600;
  tokenExpiresAt = now + expiresIn * 1000;

  if (!cachedToken) {
    throw Object.assign(new Error('Loop OAuth did not return an access token'), {
      status: 502,
      expose: true,
    });
  }

  return cachedToken;
}

function paymentInitPath() {
  const path = env('LOOP_PAYMENT_INIT_PATH', DEFAULT_INIT_PATH);
  return path.startsWith('/') ? path : `/${path}`;
}

function callbackUrl() {
  return `${appBaseUrl()}/api/payments/loop/callback`;
}

/**
 * Initiate a Loop payment (STK push / mobile prompt).
 */
async function initiatePayment({ order, phone }) {
  const normalizedPhone = normalizeLoopPhone(phone);
  if (!normalizedPhone) {
    throw Object.assign(new Error('Invalid phone number for Loop payment'), {
      status: 400,
      expose: true,
    });
  }

  const amount = Math.round(Number(order.total_amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('Invalid order amount'), { status: 400, expose: true });
  }

  const token = await getAccessToken();
  const payload = {
    amount,
    currency: 'KES',
    phone: normalizedPhone,
    phoneNumber: normalizedPhone,
    reference: order.order_number,
    merchantReference: order.order_number,
    callbackUrl: callbackUrl(),
    callback_url: callbackUrl(),
    description: `Kalro Farm order ${order.order_number}`,
  };

  const data = await fetchJson(`${baseUrl()}${paymentInitPath()}`, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const nested = data.data || data;
  return {
    raw: data,
    checkoutRequestId:
      nested.checkoutRequestId ||
      nested.checkout_request_id ||
      data.checkoutRequestId ||
      data.checkout_request_id ||
      null,
    merchantRequestId:
      nested.merchantRequestId ||
      nested.merchant_request_id ||
      data.merchantRequestId ||
      data.merchant_request_id ||
      null,
    customerMessage:
      nested.customerMessage ||
      nested.customer_message ||
      data.message ||
      'Check your phone to complete payment.',
    redirectUrl: nested.redirectUrl || nested.redirect_url || data.redirectUrl || null,
  };
}

/**
 * Verify webhook signature when LOOP_WEBHOOK_SECRET is set.
 */
function verifyWebhookSignature(rawBody, headers = {}) {
  const secret = env('LOOP_WEBHOOK_SECRET');
  if (!secret || secret === 'your_webhook_secret_optional') return true;

  const sig =
    headers['x-loop-signature'] ||
    headers['x-hub-signature-256'] ||
    headers['x-signature'];

  if (!sig) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = String(sig).replace(/^sha256=/i, '').trim();

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Parse Loop callback payload into normalized payment result.
 */
function parseCallbackPayload(body) {
  const b = body || {};
  const resultCode = String(
    b.resultCode ?? b.result_code ?? b.ResultCode ?? b.status ?? b.code ?? ''
  );
  const success =
    resultCode === '0' ||
    resultCode === '00' ||
    b.status === 'success' ||
    b.status === 'completed' ||
    b.success === true;

  return {
    success,
    resultCode,
    merchantRequestId: b.merchantRequestId || b.merchant_request_id || null,
    checkoutRequestId: b.checkoutRequestId || b.checkout_request_id || null,
    receiptNumber: b.mpesaReceiptNumber || b.receipt_number || b.transactionId || null,
    amount: b.amount != null ? Number(b.amount) : null,
    reference:
      b.reference ||
      b.merchantReference ||
      b.merchant_reference ||
      b.orderReference ||
      b.order_number ||
      null,
  };
}

/** Lightweight connectivity check for scripts / diagnostics. */
async function testConnection() {
  const result = {
    baseUrl: baseUrl(),
    configured: isConfigured(),
    oauth: null,
    paymentPath: paymentInitPath(),
    callbackUrl: callbackUrl(),
  };

  if (!result.configured) {
    return result;
  }

  try {
    await getAccessToken();
    result.oauth = 'ok';
  } catch (err) {
    result.oauth = `failed: ${err.message}`;
  }

  return result;
}

module.exports = {
  isConfigured,
  normalizeLoopPhone,
  getAccessToken,
  initiatePayment,
  verifyWebhookSignature,
  parseCallbackPayload,
  callbackUrl,
  testConnection,
};
