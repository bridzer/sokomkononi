const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const loopPayment = require('../services/loopPayment');

const router = express.Router();

/** Public settings safe for storefront (no secrets) */
router.get('/public', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT business_name, whatsapp_number, phone_number, email, location, about,
              loop_payments_enabled
       FROM settings ORDER BY id ASC LIMIT 1`
    );
    const row = result.rows[0] || {};
    res.json({
      settings: {
        ...row,
        loop_payments_enabled:
          Boolean(row.loop_payments_enabled) && loopPayment.isConfigured(),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY id ASC LIMIT 1');
    const settings = result.rows[0] || null;
    res.json({
      settings: settings
        ? {
            ...settings,
            loop_configured: loopPayment.isConfigured(),
            loop_callback_url: loopPayment.callbackUrl(),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      business_name,
      whatsapp_number,
      phone_number,
      email,
      location,
      about,
      loop_payments_enabled,
    } = req.body || {};

    if (loop_payments_enabled && !loopPayment.isConfigured()) {
      return res.status(400).json({
        error:
          'Cannot enable Loop payments — server credentials are missing (LOOP_CLIENT_ID, LOOP_CLIENT_SECRET, APP_BASE_URL)',
      });
    }

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
          loop_payments_enabled = COALESCE($7, loop_payments_enabled),
          updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          business_name,
          whatsapp_number,
          phone_number,
          email,
          location,
          about,
          loop_payments_enabled,
          existing.rows[0].id,
        ]
      );
      return res.json({
        settings: { ...upd.rows[0], loop_configured: loopPayment.isConfigured(), loop_callback_url: loopPayment.callbackUrl() },
      });
    }
    const ins = await query(
      `INSERT INTO settings
        (business_name, whatsapp_number, phone_number, email, location, about, loop_payments_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, FALSE)) RETURNING *`,
      [business_name, whatsapp_number, phone_number, email, location, about, loop_payments_enabled]
    );
    res.json({
      settings: { ...ins.rows[0], loop_configured: loopPayment.isConfigured(), loop_callback_url: loopPayment.callbackUrl() },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
