require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

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

// Serve uploaded images
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '7d',
    fallthrough: false,
  })
);

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `Kalro Farm ${clientBuildExists ? 'app' : 'API'} listening on port ${PORT}` +
      (process.env.NODE_ENV === 'production' ? ' (production)' : '')
  );
});
