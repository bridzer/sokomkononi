const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY id ASC LIMIT 1');
    res.json({ settings: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const { business_name, whatsapp_number, phone_number, email, location, about } = req.body || {};
    const existing = await query('SELECT id FROM settings ORDER BY id ASC LIMIT 1');
    if (existing.rowCount) {
      const upd = await query(
        `UPDATE settings SET
          business_name = COALESCE($1, business_name),
          whatsapp_number = COALESCE($2, whatsapp_number),
          phone_number = COALESCE($3, phone_number),
          email = COALESCE($4, email),
          location = COALESCE($5, location),
          about = COALESCE($6, about),
          updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [business_name, whatsapp_number, phone_number, email, location, about, existing.rows[0].id]
      );
      return res.json({ settings: upd.rows[0] });
    }
    const ins = await query(
      `INSERT INTO settings (business_name, whatsapp_number, phone_number, email, location, about)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [business_name, whatsapp_number, phone_number, email, location, about]
    );
    res.json({ settings: ins.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
