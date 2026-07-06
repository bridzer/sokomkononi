const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, subject, message } = req.body || {};
    if (!name || !message) return res.status(400).json({ error: 'name and message are required' });
    const result = await query(
      `INSERT INTO contact_messages (name, phone, email, subject, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, phone || null, email || null, subject || null, message]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
