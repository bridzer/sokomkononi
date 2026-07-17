require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool } = require('./db');
const {
  UPLOAD_DIR,
  PLACEHOLDER_PATH,
  ensureUploadDir,
  resolveUploadFilename,
  getUploadDiagnostics,
} = require('./config/uploads');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const paymentRoutes = require('./routes/payments');
const { handleLoopCallback } = require('./routes/payments');
const errorHandler = require('./middleware/error');
const { registerAdsenseRoutes } = require('./utils/adsenseServe');
const { getStorage } = require('./storage');

const app = express();
app.set('trust proxy', 1); // required behind Railway/Nginx for correct client IP + rate limiting

// Content-Security-Policy — allows AdSense native ads + Google Maps embed on the homepage.
// Set ENABLE_CSP=false to disable (useful for local debugging only).
const enableCsp = process.env.ENABLE_CSP !== 'false';
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    'https://pagead2.googlesyndication.com',
    'https://www.googletagservices.com',
    'https://*.adtrafficquality.google',
  ],
  frameSrc: [
    "'self'",
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
    'https://www.google.com',
    'https://maps.google.com',
  ],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  connectSrc: [
    "'self'",
    'https://pagead2.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    'https://*.google.com',
  ],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: enableCsp ? { directives: cspDirectives } : false,
  })
);

// CORS — same-origin deployments don't need it, but keep it flexible.
// Accepts a single URL, comma-separated list, or "*" via CLIENT_URL.
const clientUrlEnv = process.env.CLIENT_URL;
let corsOrigin;
if (!clientUrlEnv || clientUrlEnv === '*') {
  corsOrigin = true; // reflect request origin
} else if (clientUrlEnv.includes(',')) {
  corsOrigin = clientUrlEnv.split(',').map((s) => s.trim()).filter(Boolean);
} else {
  corsOrigin = clientUrlEnv;
}
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
  })
);

// Loop webhook — MUST be before express.json() so we receive raw body for signature verification
app.post(
  '/api/payments/loop/callback',
  express.raw({ type: 'application/json', limit: '256kb' }),
  handleLoopCallback
);

app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// Serve uploaded images — local disk first, then S3 when configured.
ensureUploadDir();
app.use('/uploads', async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const filename = resolveUploadFilename(req.path);
  if (!filename) return res.status(400).json({ error: 'Invalid upload path' });

  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(filePath, (err) => {
      if (err) next(err);
    });
  }

  const storage = getStorage();
  if (storage.type === 's3') {
    try {
      if (req.method === 'HEAD') {
        const head = await storage.headObject(filename);
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        if (head.ContentType) res.type(head.ContentType);
        if (head.ContentLength != null) res.set('Content-Length', String(head.ContentLength));
        return res.end();
      }

      const object = await storage.readObject(filename);
      res.set('Cache-Control', 'public, max-age=604800, immutable');
      if (object.contentType) res.type(object.contentType);
      if (object.contentLength != null) res.set('Content-Length', String(object.contentLength));
      return object.body.pipe(res);
    } catch (err) {
      if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) {
        console.warn(`[uploads] S3 read failed for "${filename}":`, err.message);
      }
    }
  }

  // File referenced in DB but not found in storage.
  console.warn(`[uploads] Missing file "${filename}" — serving placeholder`);
  res.set('Cache-Control', 'no-store');
  if (fs.existsSync(PLACEHOLDER_PATH)) {
    return res.type('image/svg+xml').sendFile(PLACEHOLDER_PATH);
  }
  return res.status(404).end();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'kalro-farm-api',
    time: new Date().toISOString(),
    uploads: getUploadDiagnostics(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// --- Production: serve the built React app from client/build ---
const CLIENT_BUILD = path.join(__dirname, '..', '..', 'client', 'build');
const clientBuildExists = fs.existsSync(path.join(CLIENT_BUILD, 'index.html'));

if (clientBuildExists) {
  const { loadIndexHtml } = registerAdsenseRoutes(app, CLIENT_BUILD);

  // Serve static assets but NOT index.html — we inject AdSense verification at runtime.
  app.use(
    express.static(CLIENT_BUILD, {
      index: false,
      maxAge: '1d',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // SPA fallback with AdSense verification tags injected from env vars
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    const html = loadIndexHtml();
    if (!html) {
      return res.status(500).send('App build missing index.html');
    }
    res.type('html').send(html);
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn(
    '[startup] client/build not found. Did you run `npm run build --prefix client`?'
  );
}

// JSON 404 for /api and /uploads misses
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use(errorHandler);

/**
 * Ensure the database schema is up-to-date on boot. The schema.sql file is
 * fully idempotent (CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT
 * EXISTS, guarded backfills), so re-running it costs a few ms and prevents
 * "column does not exist" errors after a git pull. Set AUTO_MIGRATE=false to
 * opt out (e.g. in production where migrations are a separate step).
 */
async function ensureSchema() {
  if (process.env.AUTO_MIGRATE === 'false') return;
  try {
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('[startup] Schema sync OK.');
  } catch (err) {
    console.warn(
      '[startup] Schema sync failed:',
      err.message,
      '\n         Run `npm run db:migrate` manually to fix.'
    );
  }
}

function logUploadsHealth() {
  const info = getUploadDiagnostics();
  console.log(
    `[uploads] storage=${info.storageType} dir=${info.uploadDir} files=${info.fileCount}` +
      (info.onPersistentMount != null ? ` mounted=${info.onPersistentMount}` : '')
  );
  if (info.warning) {
    console.warn(`[uploads] ${info.warning}`);
  }
}

const PORT = process.env.PORT || 5000;
ensureSchema()
  .finally(() => {
    logUploadsHealth();
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(
        `Kalro Farm ${clientBuildExists ? 'app' : 'API'} listening on port ${PORT}` +
          (process.env.NODE_ENV === 'production' ? ' (production)' : '')
      );
    });
  });
