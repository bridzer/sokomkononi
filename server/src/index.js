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
  countUploadFiles,
} = require('./config/uploads');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const errorHandler = require('./middleware/error');

const app = express();
app.set('trust proxy', 1); // required behind Railway/Nginx for correct client IP + rate limiting

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
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
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// Serve uploaded images — missing files get a placeholder (not a JSON ENOENT error).
ensureUploadDir();
app.use('/uploads', (req, res, next) => {
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

  // File referenced in DB but not on disk (common after Railway redeploy without a Volume).
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
  res.json({ status: 'ok', service: 'kalro-farm-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// --- Production: serve the built React app from client/build ---
const CLIENT_BUILD = path.join(__dirname, '..', '..', 'client', 'build');
const clientBuildExists = fs.existsSync(path.join(CLIENT_BUILD, 'index.html'));

if (clientBuildExists) {
  app.use(express.static(CLIENT_BUILD, { maxAge: '1d' }));
  // SPA fallback: any non-/api, non-/uploads GET request returns index.html
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
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
  const count = countUploadFiles();
  console.log(`[uploads] Directory: ${UPLOAD_DIR} (${count} file(s))`);
  if (process.env.NODE_ENV === 'production' && count === 0) {
    console.warn(
      '[uploads] Upload folder is empty on production.\n' +
        '         Mount a Railway Volume at /app/server/uploads and re-upload product images,\n' +
        '         or run: railway run npm run db:cleanup:images -- --apply'
    );
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
