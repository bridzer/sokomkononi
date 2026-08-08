const jwt = require('jsonwebtoken');

const WEAK_SECRETS = new Set(['', 'dev_secret', 'change_me', 'changeme', 'secret']);

function isWeakJwtSecret(secret) {
  const s = String(secret || '').trim().toLowerCase();
  if (!s || WEAK_SECRETS.has(s)) return true;
  if (s.includes('change_me') || s.includes('changeme')) return true;
  return false;
}

function resolveJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  const weak = isWeakJwtSecret(secret);
  if (process.env.NODE_ENV === 'production') {
    if (weak || secret.length < 24) {
      throw new Error(
        'JWT_SECRET must be set to a strong random value (≥24 chars) in production'
      );
    }
    return secret;
  }
  if (!secret) {
    console.warn('[auth] JWT_SECRET unset — using insecure dev fallback. Do not use in production.');
    return 'dev_secret';
  }
  if (weak || secret.length < 16) {
    console.warn('[auth] JWT_SECRET looks weak — set a long random value before deploying.');
  }
  return secret;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, resolveJwtSecret());
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Authenticated seller with an active linked sellers profile.
 * Sets req.seller from the database.
 */
function requireSeller(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      if (req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Seller access required' });
      }
      const { query } = require('../db');
      const r = await query(
        `SELECT * FROM sellers WHERE user_id = $1 AND is_active = TRUE`,
        [req.user.id]
      );
      if (!r.rowCount) {
        return res.status(403).json({
          error: 'Seller profile not found or inactive. Contact Soko Mkononi support.',
        });
      }
      req.seller = r.rows[0];
      next();
    } catch (err) {
      next(err);
    }
  });
}

/** Attach req.user when a valid token is present; never fail the request. */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, resolveJwtSecret());
  } catch {
    /* ignore invalid token for optional auth */
  }
  next();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    resolveJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSeller,
  optionalAuth,
  signToken,
  resolveJwtSecret,
};
