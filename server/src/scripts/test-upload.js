/**
 * End-to-end diagnostic for the image upload flow.
 *
 *   npm run test:upload
 *
 * What it does (in order):
 *   1. GET /api/health                   — server reachable?
 *   2. POST /api/auth/login              — get an admin JWT
 *   3. POST /api/admin/uploads           — single-file upload (native fetch)
 *   4. GET  <returned url>               — is the file served?
 *   5. POST /api/admin/uploads/batch     — 3-file upload (native fetch)
 *   6. GET  each returned url            — files served?
 *   7. POST /api/admin/products          — creates a product with images[]
 *   8. GET  /api/products/:slug          — verifies gallery round-trips
 *  8b. PUT  /api/admin/products/:id     — shrinks the gallery
 *  8c. PUT  /api/admin/products/:id     — clears the gallery (bug regression)
 *   9. DELETE the product + delete every uploaded file
 *
 * Each step prints PASS / FAIL. The script exits non-zero on any failure so
 * you can wire it into CI later.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@kalrofarm.co.ke';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';

// A 2×2 red-ish PNG. Kept inline so this script works without any test assets.
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAF0lEQVQI12P8z8AARIQBEyMDAwMDAwABAA8AAeE0GLIAAAAASUVORK5CYII=';

let pass = 0;
let fail = 0;

function step(name, ok, extra) {
  const tag = ok ? 'PASS' : 'FAIL';
  const line = `  [${tag}] ${name}` + (extra ? `  — ${extra}` : '');
  console.log(line);
  ok ? pass++ : fail++;
  return ok;
}

async function main() {
  console.log(`\n== Upload diagnostic against ${BASE} ==\n`);

  // --- 1. Health ---------------------------------------------------------
  let health;
  try {
    const r = await fetch(`${BASE}/api/health`);
    health = await r.json();
    step('server /api/health reachable', r.ok && health.status === 'ok', JSON.stringify(health));
  } catch (err) {
    step('server /api/health reachable', false, err.message);
    return;
  }

  // --- 2. Admin login ----------------------------------------------------
  let token;
  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const body = await r.json();
    token = body.token;
    step(
      `admin login (${ADMIN_EMAIL})`,
      r.ok && !!token,
      r.ok ? `token len=${token?.length}` : JSON.stringify(body)
    );
    if (!r.ok) return;
  } catch (err) {
    step('admin login', false, err.message);
    return;
  }

  const auth = { Authorization: `Bearer ${token}` };
  const png = Buffer.from(TINY_PNG_B64, 'base64');

  // --- 3b. Chromium regression: manual Content-Type WITHOUT boundary ----
  // This simulates the axios bug that breaks Chrome/Edge uploads.
  try {
    const fd = new FormData();
    fd.append('image', new Blob([png], { type: 'image/png' }), 'bad-boundary.png');
    const r = await fetch(`${BASE}/api/admin/uploads`, {
      method: 'POST',
      headers: {
        ...auth,
        'Content-Type': 'multipart/form-data', // NO boundary — must fail
      },
      body: fd,
    });
    step(
      'regression — manual Content-Type without boundary is rejected',
      r.status !== 201,
      `status=${r.status} (must not be 201 — proves Chromium boundary bug)`
    );
  } catch (err) {
    step('regression — manual Content-Type without boundary', false, err.message);
  }

  // --- 3c. Chromium regression: application/octet-stream + .jpg ext -----
  try {
    const fd = new FormData();
    fd.append(
      'image',
      new Blob([png], { type: 'application/octet-stream' }),
      'octet-stream.jpg'
    );
    const r = await fetch(`${BASE}/api/admin/uploads`, {
      method: 'POST',
      headers: auth,
      body: fd,
    });
    const body = await r.json();
    step(
      'regression — octet-stream MIME with .jpg extension is accepted',
      r.status === 201 && body.url,
      `status=${r.status} url=${body.url}`
    );
    if (body.url) {
      try {
        fs.unlinkSync(path.join(__dirname, '..', '..', 'uploads', body.url.replace(/^\/uploads\//, '')));
      } catch { /* ignore */ }
    }
  } catch (err) {
    step('regression — octet-stream + .jpg', false, err.message);
  }

  // --- 3d. CORS preflight (Chromium sends OPTIONS before auth POST) -----
  try {
    const r = await fetch(`${BASE}/api/admin/uploads`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    const allowOrigin = r.headers.get('access-control-allow-origin');
    const allowHeaders = r.headers.get('access-control-allow-headers') || '';
    step(
      'CORS preflight — OPTIONS /api/admin/uploads',
      r.ok && allowOrigin && /authorization/i.test(allowHeaders),
      `status=${r.status} allow-origin=${allowOrigin}`
    );
  } catch (err) {
    step('CORS preflight', false, err.message);
  }

  // --- 3. Single upload --------------------------------------------------
  let singleUrl;
  try {
    const fd = new FormData();
    fd.append('image', new Blob([png], { type: 'image/png' }), 'test-single.png');
    const r = await fetch(`${BASE}/api/admin/uploads`, {
      method: 'POST',
      headers: auth,           // do NOT set Content-Type — FormData handles it
      body: fd,
    });
    const body = await r.json();
    singleUrl = body.url;
    step(
      'single upload — POST /api/admin/uploads',
      r.status === 201 && typeof singleUrl === 'string' && singleUrl.startsWith('/uploads/'),
      `status=${r.status} url=${singleUrl}`
    );
  } catch (err) {
    step('single upload', false, err.message);
  }

  // --- 4. GET the uploaded file -----------------------------------------
  if (singleUrl) {
    try {
      const r = await fetch(`${BASE}${singleUrl}`);
      step(
        'single upload — file is served back',
        r.ok,
        `status=${r.status} content-type=${r.headers.get('content-type')}`
      );
    } catch (err) {
      step('single upload — file is served back', false, err.message);
    }
  }

  // --- 5. Batch upload ---------------------------------------------------
  let batchUrls = [];
  try {
    const fd = new FormData();
    for (let i = 0; i < 3; i++) {
      fd.append('images', new Blob([png], { type: 'image/png' }), `batch-${i}.png`);
    }
    const r = await fetch(`${BASE}/api/admin/uploads/batch`, {
      method: 'POST',
      headers: auth,
      body: fd,
    });
    const body = await r.json();
    batchUrls = (body.files || []).map((f) => f.url);
    step(
      'batch upload — POST /api/admin/uploads/batch (3 files)',
      r.status === 201 && batchUrls.length === 3,
      `status=${r.status} urls=${JSON.stringify(batchUrls)}`
    );
  } catch (err) {
    step('batch upload', false, err.message);
  }

  // --- 6. GET each batch file -------------------------------------------
  for (const url of batchUrls) {
    try {
      const r = await fetch(`${BASE}${url}`);
      step(`batch upload — GET ${url}`, r.ok, `status=${r.status}`);
    } catch (err) {
      step(`batch upload — GET ${url}`, false, err.message);
    }
  }

  // --- 7. Create a product with the gallery -----------------------------
  const allUrls = [singleUrl, ...batchUrls].filter(Boolean);
  const productName = `__diag_gallery_${Date.now()}`;
  let productSlug;
  let productId;
  try {
    const r = await fetch(`${BASE}/api/admin/products`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: productName,
        price: 1,
        stock: 0,
        images: allUrls,
        is_active: true,
      }),
    });
    const body = await r.json();
    productSlug = body.product?.slug;
    productId = body.product?.id;
    const savedImages = body.product?.images;
    step(
      'create product with images[] persists the gallery',
      r.status === 201 &&
        Array.isArray(savedImages) &&
        savedImages.length === allUrls.length &&
        body.product?.image_url === allUrls[0],
      `status=${r.status} images.len=${Array.isArray(savedImages) ? savedImages.length : 'n/a'} cover=${body.product?.image_url}`
    );
  } catch (err) {
    step('create product with images[]', false, err.message);
  }

  // --- 8. Public GET round-trip -----------------------------------------
  if (productSlug) {
    try {
      const r = await fetch(`${BASE}/api/products/${productSlug}`);
      const body = await r.json();
      step(
        'GET /api/products/:slug round-trips images[]',
        r.ok && Array.isArray(body.product?.images) && body.product.images.length === allUrls.length,
        `status=${r.status} images.len=${body.product?.images?.length}`
      );
    } catch (err) {
      step('GET /api/products/:slug', false, err.message);
    }
  }

  // --- 8b. PUT update — replace the gallery with a subset --------------
  if (productId) {
    try {
      const half = allUrls.slice(0, 2);
      const r = await fetch(`${BASE}/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: half }),
      });
      const body = await r.json();
      step(
        'PUT product with a smaller gallery reduces images + resyncs cover',
        r.ok &&
          Array.isArray(body.product?.images) &&
          body.product.images.length === 2 &&
          body.product?.image_url === half[0],
        `status=${r.status} images.len=${body.product?.images?.length} cover=${body.product?.image_url}`
      );
    } catch (err) {
      step('PUT product (shrink gallery)', false, err.message);
    }

    // --- 8c. PUT update — clear the gallery entirely ------------------
    try {
      const r = await fetch(`${BASE}/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [] }),
      });
      const body = await r.json();
      step(
        'PUT product with images:[] clears BOTH gallery and cover (image_url -> null)',
        r.ok &&
          Array.isArray(body.product?.images) &&
          body.product.images.length === 0 &&
          body.product?.image_url === null,
        `status=${r.status} images.len=${body.product?.images?.length} cover=${body.product?.image_url}`
      );
    } catch (err) {
      step('PUT product (clear gallery)', false, err.message);
    }
  }

  // --- 9. Cleanup: delete the product and the uploaded files ------------
  if (productId) {
    try {
      const r = await fetch(`${BASE}/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: auth,
      });
      step('cleanup — delete the test product', r.ok, `status=${r.status}`);
    } catch (err) {
      step('cleanup — delete the test product', false, err.message);
    }
  }

  const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
  for (const url of allUrls) {
    const filename = url.replace(/^\/uploads\//, '');
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, filename));
    } catch {
      /* ignore */
    }
  }
  step('cleanup — deleted test upload files from disk', true, `${allUrls.length} file(s)`);

  console.log(`\n== Result: ${pass} passed, ${fail} failed ==\n`);
  process.exitCode = fail ? 1 : 0;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
