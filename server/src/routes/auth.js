const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const exists = await query('SELECT 1 FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rowCount) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const insert = await query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'customer')
       RETURNING id, name, email, phone, role, created_at`,
      [name, email.toLowerCase(), phone || null, hash]
    );
    const user = insert.rows[0];
    const token = signToken(user);
    const profile = await withSellerProfile(user);
    res.status(201).json({ ...profile, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await query(
      'SELECT id, name, email, phone, role, password_hash FROM users WHERE email=$1',
      [email.toLowerCase()]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    delete user.password_hash;

    if (user.role === 'seller') {
      const active = await query(
        'SELECT id FROM sellers WHERE user_id=$1 AND is_active=TRUE',
        [user.id]
      );
      if (!active.rowCount) {
        return res.status(403).json({
          error: 'Seller account is inactive or not linked. Contact Soko Mkononi.',
        });
      }
    }

    const token = signToken(user);
    const profile = await withSellerProfile(user);
    res.json({ ...profile, token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    let seller = null;
    if (user.role === 'seller') {
      const s = await query(
        `SELECT id, name, phone, email, whatsapp, location, bio, is_active, is_verified,
                delivered_count, commission_pct, user_id
         FROM sellers WHERE user_id = $1`,
        [user.id]
      );
      seller = s.rows[0] || null;
    }
    res.json({ user, seller });
  } catch (err) {
    next(err);
  }
});

/** Enrich login/register responses with seller profile when applicable */
async function withSellerProfile(user) {
  if (!user || user.role !== 'seller') return { user, seller: null };
  const s = await query(
    `SELECT id, name, phone, email, whatsapp, location, bio, is_active, is_verified,
            delivered_count, commission_pct, user_id
     FROM sellers WHERE user_id = $1`,
    [user.id]
  );
  return { user, seller: s.rows[0] || null };
}

module.exports = router;
