const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { upload, buildFilename } = require('../middleware/upload');
const { getStorage } = require('../storage');

const router = express.Router();

router.use(requireAdmin);

async function persistUploadedFile(file) {
  const storage = getStorage();
  if (storage.useMemoryUpload) {
    const filename = buildFilename(file.originalname, file.mimetype);
    return storage.saveFromBuffer({
      buffer: file.buffer,
      filename,
      mimetype: file.mimetype,
      size: file.size,
    });
  }
  return storage.saveFromDisk(file);
}

// --------- Uploads ---------
// Multer errors (file too large, wrong mime) surface as errors with `.status`
// so the shared errorHandler formats them as JSON — we still catch them here
// to log the specific failure for easier debugging.
router.post('/uploads', (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
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
    try {
      const saved = await persistUploadedFile(req.file);
      console.log(`[upload:single] ${saved.filename} (${saved.size} bytes) -> ${saved.url}`);
      res.status(201).json(saved);
    } catch (saveErr) {
      console.error('[upload:single] storage save failed:', saveErr.message);
      return next(
        Object.assign(new Error('Failed to store uploaded file'), { status: 500, expose: true })
      );
    }
  });
});

// Batch upload — up to 10 files at once under the `images` field name.
router.post('/uploads/batch', (req, res, next) => {
  upload.array('images', 10)(req, res, async (err) => {
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
    try {
      const savedFiles = await Promise.all(files.map((f) => persistUploadedFile(f)));
      console.log(
        `[upload:batch] ${savedFiles.length} file(s):`,
        savedFiles.map((f) => f.filename).join(', ')
      );
      res.status(201).json({ files: savedFiles });
    } catch (saveErr) {
      console.error('[upload:batch] storage save failed:', saveErr.message);
      return next(
        Object.assign(new Error('Failed to store uploaded files'), { status: 500, expose: true })
      );
    }
  });
});

router.delete('/uploads/:filename', async (req, res, next) => {
  const { filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  try {
    await getStorage().delete(filename);
    res.json({ success: true });
  } catch (err) {
    console.error('[upload:delete] failed:', err.message);
    next(Object.assign(new Error('Failed to delete file'), { status: 500, expose: true }));
  }
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
    const sql = `SELECT p.*, c.name AS category_name,
                        s.name AS seller_name,
                        COALESCE(s.name, 'Kalro Farm Kenya') AS seller_display_name
                 FROM products p
                 LEFT JOIN categories c ON c.id = p.category_id
                 LEFT JOIN sellers s ON s.id = p.seller_id
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
      stock, image_url, images: imagesInput, is_active, is_featured, seller_id,
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
         stock, image_url, images, is_active, is_featured, seller_id)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'each'),$8,$9,$10,COALESCE($11,0),$12,$13::jsonb,
               COALESCE($14,TRUE),COALESCE($15,FALSE),$16)
       RETURNING *`,
      [
        category_id || null, name, slug, description || null, breed || null, age_stage || null,
        unit, pricing.price, pricing.price_type, pricing.price_max, stock, finalCover,
        JSON.stringify(finalImages), is_active, is_featured,
        seller_id ? Number(seller_id) : null,
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
      price_type, seller_id,
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
    const hasSellerUpdate = Object.prototype.hasOwnProperty.call(req.body || {}, 'seller_id');
    const nextSellerId = hasSellerUpdate
      ? (seller_id ? Number(seller_id) : null)
      : undefined;

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
        seller_id = CASE WHEN $18::boolean THEN $17 ELSE seller_id END,
        updated_at = NOW()
       WHERE id=$19 RETURNING *`,
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
        nextSellerId ?? null,
        hasSellerUpdate,
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

// --------- Sellers ---------
router.get('/sellers', async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT s.*,
              (SELECT COUNT(*)::int FROM products p WHERE p.seller_id = s.id) AS product_count
       FROM sellers s
       ORDER BY s.name ASC`
    );
    res.json({ sellers: r.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/sellers', async (req, res, next) => {
  try {
    const { name, phone, email, whatsapp, location, bio, is_active } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Seller name is required' });
    const r = await query(
      `INSERT INTO sellers (name, phone, email, whatsapp, location, bio, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE))
       RETURNING *`,
      [
        name.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        whatsapp?.trim() || null,
        location?.trim() || null,
        bio?.trim() || null,
        is_active,
      ]
    );
    res.status(201).json({ seller: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/sellers/:id', async (req, res, next) => {
  try {
    const { name, phone, email, whatsapp, location, bio, is_active } = req.body || {};
    const r = await query(
      `UPDATE sellers SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         whatsapp = COALESCE($4, whatsapp),
         location = COALESCE($5, location),
         bio = COALESCE($6, bio),
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name?.trim() || null,
        phone !== undefined ? phone?.trim() || null : null,
        email !== undefined ? email?.trim() || null : null,
        whatsapp !== undefined ? whatsapp?.trim() || null : null,
        location !== undefined ? location?.trim() || null : null,
        bio !== undefined ? bio?.trim() || null : null,
        is_active,
        req.params.id,
      ]
    );
    // Allow clearing nullable fields when explicitly sent as empty string
    if (!r.rowCount) return res.status(404).json({ error: 'Seller not found' });
    res.json({ seller: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/sellers/:id', async (req, res, next) => {
  try {
    // Products keep selling under Kalro Farm default (seller_id SET NULL via FK)
    const r = await query('DELETE FROM sellers WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Seller not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --------- Bookings (out-of-stock waitlist) ---------
router.get('/bookings', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE b.status = $1';
    }
    const r = await query(
      `SELECT b.*, p.name AS product_name, p.slug AS product_slug, p.image_url AS product_image
       FROM product_bookings b
       LEFT JOIN products p ON p.id = b.product_id
       ${where}
       ORDER BY b.created_at DESC`,
      params
    );
    res.json({ bookings: r.rows });
  } catch (err) {
    next(err);
  }
});

router.put('/bookings/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'contacted', 'fulfilled', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }
    const r = await query(
      `UPDATE product_bookings SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// --------- Reviews ---------
router.get('/reviews', async (req, res, next) => {
  try {
    const { approved } = req.query;
    const params = [];
    let where = '';
    if (approved === 'true') {
      where = 'WHERE r.is_approved = TRUE';
    } else if (approved === 'false') {
      where = 'WHERE r.is_approved = FALSE';
    }
    const r = await query(
      `SELECT r.*, p.name AS product_name, p.slug AS product_slug
       FROM product_reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ reviews: r.rows });
  } catch (err) {
    next(err);
  }
});

router.put('/reviews/:id/approve', async (req, res, next) => {
  try {
    const approved = req.body?.is_approved !== false;
    const r = await query(
      `UPDATE product_reviews SET is_approved=$1 WHERE id=$2 RETURNING *`,
      [approved, req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Review not found' });
    res.json({ review: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/reviews/:id', async (req, res, next) => {
  try {
    const r = await query('DELETE FROM product_reviews WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Review not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
