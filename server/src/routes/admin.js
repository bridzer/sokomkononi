const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

router.use(requireAdmin);

// --------- Uploads ---------
// Multer errors (file too large, wrong mime) surface as errors with `.status`
// so the shared errorHandler formats them as JSON — we still catch them here
// to log the specific failure for easier debugging.
router.post('/uploads', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.warn('[upload:single] rejected:', err.code || err.message, {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
      });
      return next(err);
    }
    if (!req.file) {
      console.warn('[upload:single] no file in request', {
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(req.body || {}),
      });
      return res.status(400).json({ error: 'No file uploaded — use field name "image"' });
    }
    const url = `/uploads/${req.file.filename}`;
    console.log(`[upload:single] ${req.file.filename} (${req.file.size} bytes)`);
    res.status(201).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// Batch upload — up to 10 files at once under the `images` field name.
router.post('/uploads/batch', (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      console.warn('[upload:batch] rejected:', err.code || err.message, {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
      });
      return next(err);
    }
    const files = req.files || [];
    if (!files.length) {
      console.warn('[upload:batch] no files in request', {
        contentType: req.headers['content-type'],
      });
      return res.status(400).json({ error: 'No files uploaded — use field name "images"' });
    }
    console.log(
      `[upload:batch] ${files.length} file(s):`,
      files.map((f) => f.filename).join(', ')
    );
    res.status(201).json({
      files: files.map((f) => ({
        url: `/uploads/${f.filename}`,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype,
      })),
    });
  });
});

router.delete('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Failed to delete file' });
    }
    res.json({ success: true });
  });
});

const { normalizeProductPricing } = require('../utils/pricing');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

// --------- Dashboard stats ---------
router.get('/stats', async (_req, res, next) => {
  try {
    const [products, orders, revenue, pending, messages, categories, recentOrders, lowStock] =
      await Promise.all([
        query('SELECT COUNT(*)::int AS c FROM products'),
        query('SELECT COUNT(*)::int AS c FROM orders'),
        query(`SELECT COALESCE(SUM(total_amount),0)::float AS s FROM orders WHERE status != 'cancelled'`),
        query(`SELECT COUNT(*)::int AS c FROM orders WHERE status='pending'`),
        query(`SELECT COUNT(*)::int AS c FROM contact_messages WHERE is_read=false`),
        query('SELECT COUNT(*)::int AS c FROM categories'),
        query('SELECT id, order_number, customer_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 8'),
        query('SELECT id, name, stock, price FROM products WHERE stock <= 3 AND is_active = TRUE ORDER BY stock ASC LIMIT 8'),
      ]);
    res.json({
      counts: {
        products: products.rows[0].c,
        orders: orders.rows[0].c,
        pendingOrders: pending.rows[0].c,
        unreadMessages: messages.rows[0].c,
        categories: categories.rows[0].c,
      },
      revenue: revenue.rows[0].s,
      recentOrders: recentOrders.rows,
      lowStock: lowStock.rows,
    });
  } catch (err) {
    next(err);
  }
});

// --------- Categories CRUD ---------
router.get('/categories', async (_req, res, next) => {
  try {
    const r = await query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json({ categories: r.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name, description, image_url, sort_order, is_active } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const slug = slugify(name);
    const r = await query(
      `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, TRUE)) RETURNING *`,
      [name, slug, description || null, image_url || null, sort_order || 0, is_active]
    );
    res.status(201).json({ category: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const { name, description, image_url, sort_order, is_active } = req.body || {};
    const slug = name ? slugify(name) : null;
    const r = await query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, slug, description, image_url, sort_order, is_active, req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Category not found' });
    res.json({ category: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const r = await query('DELETE FROM categories WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --------- Products CRUD ---------
router.get('/products', async (req, res, next) => {
  try {
    const { search, category_id } = req.query;
    const params = [];
    const where = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.breed ILIKE $${params.length})`);
    }
    if (category_id) {
      params.push(Number(category_id));
      where.push(`p.category_id = $${params.length}`);
    }
    const sql = `SELECT p.*, c.name AS category_name FROM products p
                 LEFT JOIN categories c ON c.id = p.category_id
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY p.created_at DESC`;
    const r = await query(sql, params);
    res.json({ products: r.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Normalize the `images` payload. Accepts:
 *   - an array of strings (URLs)
 *   - an array of objects like { url: '/uploads/foo.jpg', ... }
 * Returns { images: string[], cover: string|null } where cover is the first
 * usable URL.
 */
function normalizeImages(input) {
  if (!Array.isArray(input)) return { images: null, cover: null };
  const urls = input
    .map((v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.url : null))
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  return { images: urls, cover: urls[0] || null };
}

router.post('/products', async (req, res, next) => {
  try {
    const {
      category_id, name, description, breed, age_stage, unit,
      stock, image_url, images: imagesInput, is_active, is_featured,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    let pricing;
    try {
      pricing = normalizeProductPricing(req.body);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }

    const { images: imgs, cover } = normalizeImages(imagesInput);
    const finalImages = imgs || (image_url ? [image_url] : []);
    const finalCover = cover || image_url || null;

    const baseSlug = slugify(name);
    const uniqCheck = await query('SELECT COUNT(*)::int AS c FROM products WHERE slug LIKE $1', [
      `${baseSlug}%`,
    ]);
    const slug = uniqCheck.rows[0].c > 0 ? `${baseSlug}-${Date.now().toString().slice(-5)}` : baseSlug;
    const r = await query(
      `INSERT INTO products
        (category_id, name, slug, description, breed, age_stage, unit, price, price_type, price_max,
         stock, image_url, images, is_active, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'each'),$8,$9,$10,COALESCE($11,0),$12,$13::jsonb,
               COALESCE($14,TRUE),COALESCE($15,FALSE))
       RETURNING *`,
      [
        category_id || null, name, slug, description || null, breed || null, age_stage || null,
        unit, pricing.price, pricing.price_type, pricing.price_max, stock, finalCover,
        JSON.stringify(finalImages), is_active, is_featured,
      ]
    );
    res.status(201).json({ product: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    const {
      category_id, name, description, breed, age_stage, unit,
      stock, image_url, images: imagesInput, is_active, is_featured,
      price_type,
    } = req.body || {};

    const hasPricingUpdate =
      req.body?.price !== undefined ||
      req.body?.price_max !== undefined ||
      price_type !== undefined;

    let pricing = null;
    if (hasPricingUpdate) {
      try {
        pricing = normalizeProductPricing(req.body);
      } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
      }
    }

    const hasImagesUpdate = Array.isArray(imagesInput);
    const { images: imgs, cover } = normalizeImages(imagesInput);
    const nextCover = hasImagesUpdate ? cover : (image_url ?? null);
    const nextImages = hasImagesUpdate ? JSON.stringify(imgs) : null;

    const r = await query(
      `UPDATE products SET
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        breed = COALESCE($4, breed),
        age_stage = COALESCE($5, age_stage),
        unit = COALESCE($6, unit),
        price = COALESCE($7, price),
        price_type = COALESCE($8, price_type),
        price_max = CASE WHEN $9::boolean THEN $10 ELSE price_max END,
        stock = COALESCE($11, stock),
        image_url = CASE WHEN $13::boolean THEN $12 ELSE COALESCE($12, image_url) END,
        images = COALESCE($14::jsonb, images),
        is_active = COALESCE($15, is_active),
        is_featured = COALESCE($16, is_featured),
        updated_at = NOW()
       WHERE id=$17 RETURNING *`,
      [
        category_id, name, description, breed, age_stage, unit,
        pricing?.price ?? null,
        pricing?.price_type ?? null,
        hasPricingUpdate,
        pricing?.price_max ?? null,
        stock,
        nextCover,
        hasImagesUpdate,
        nextImages,
        is_active,
        is_featured,
        req.params.id,
      ]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const r = await query('DELETE FROM products WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --------- Orders ---------
router.get('/orders', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE status = $1';
    }
    const r = await query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC`,
      params
    );
    res.json({ orders: r.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const o = await query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!o.rowCount) return res.status(404).json({ error: 'Order not found' });
    const items = await query('SELECT * FROM order_items WHERE order_id=$1', [req.params.id]);
    res.json({ order: { ...o.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
});

router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending','confirmed','processing','delivered','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await query(
      `UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// --------- Messages ---------
router.get('/messages', async (_req, res, next) => {
  try {
    const r = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json({ messages: r.rows });
  } catch (err) {
    next(err);
  }
});

router.put('/messages/:id/read', async (req, res, next) => {
  try {
    const r = await query(
      'UPDATE contact_messages SET is_read=TRUE WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/messages/:id', async (req, res, next) => {
  try {
    const r = await query('DELETE FROM contact_messages WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
