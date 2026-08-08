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
    const r = await query(
      `SELECT c.*,
              p.name AS parent_name,
              p.slug AS parent_slug,
              (SELECT COUNT(*)::int FROM products pr WHERE pr.category_id = c.id) AS product_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ORDER BY c.parent_id NULLS FIRST, COALESCE(p.sort_order, c.sort_order) ASC,
                c.sort_order ASC, c.name ASC`
    );
    res.json({ categories: r.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name, description, image_url, sort_order, is_active, parent_id } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    let parentId = parent_id ? Number(parent_id) : null;
    if (parentId) {
      const parent = await query(
        'SELECT id FROM categories WHERE id=$1 AND parent_id IS NULL',
        [parentId]
      );
      if (!parent.rowCount) {
        return res.status(400).json({ error: 'parent_id must be a main (top-level) category' });
      }
    }

    const slug = slugify(name);
    const r = await query(
      `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active, parent_id)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, TRUE),$7) RETURNING *`,
      [name, slug, description || null, image_url || null, sort_order || 0, is_active, parentId]
    );
    res.status(201).json({ category: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const { name, description, image_url, sort_order, is_active, parent_id } = req.body || {};
    const slug = name ? slugify(name) : null;
    const hasParentUpdate = Object.prototype.hasOwnProperty.call(req.body || {}, 'parent_id');
    let nextParent = null;
    if (hasParentUpdate) {
      nextParent = parent_id ? Number(parent_id) : null;
      if (nextParent) {
        if (Number(nextParent) === Number(req.params.id)) {
          return res.status(400).json({ error: 'A category cannot be its own parent' });
        }
        const parent = await query(
          'SELECT id FROM categories WHERE id=$1 AND parent_id IS NULL',
          [nextParent]
        );
        if (!parent.rowCount) {
          return res.status(400).json({ error: 'parent_id must be a main (top-level) category' });
        }
      }
    }

    const r = await query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        parent_id = CASE WHEN $8::boolean THEN $7 ELSE parent_id END,
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        name,
        slug,
        description,
        image_url,
        sort_order,
        is_active,
        nextParent,
        hasParentUpdate,
        req.params.id,
      ]
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
    const sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                        pc.name AS parent_category_name, pc.slug AS parent_category_slug,
                        s.name AS seller_name,
                        COALESCE(s.name, 'Soko Mkononi') AS seller_display_name
                 FROM products p
                 LEFT JOIN categories c ON c.id = p.category_id
                 LEFT JOIN categories pc ON pc.id = c.parent_id
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
      fulfilled_by: fulfilledByRaw,
      commerce_mode: commerceModeRaw,
      featured_until: featuredUntilRaw,
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
    const nextSellerId = seller_id ? Number(seller_id) : null;
    const fulfilled_by =
      fulfilledByRaw === 'seller' && nextSellerId
        ? 'seller'
        : fulfilledByRaw === 'platform'
        ? 'platform'
        : nextSellerId
        ? 'seller'
        : 'platform';

    const { resolveCommerceMode, parseFeaturedUntil } = require('../utils/commerceMode');
    const commerce_mode = await resolveCommerceMode({
      commerce_mode: commerceModeRaw,
      category_id,
    });
    const settingsRes = await query(
      'SELECT featured_listing_days FROM settings ORDER BY id ASC LIMIT 1'
    );
    const featuredDays = settingsRes.rows[0]?.featured_listing_days;
    const featured_until = parseFeaturedUntil(featuredUntilRaw, {
      is_featured: Boolean(is_featured),
      featured_listing_days: featuredDays,
    });

    const baseSlug = slugify(name);
    const uniqCheck = await query('SELECT COUNT(*)::int AS c FROM products WHERE slug LIKE $1', [
      `${baseSlug}%`,
    ]);
    const slug = uniqCheck.rows[0].c > 0 ? `${baseSlug}-${Date.now().toString().slice(-5)}` : baseSlug;
    const r = await query(
      `INSERT INTO products
        (category_id, name, slug, description, breed, age_stage, unit, price, price_type, price_max,
         stock, image_url, images, is_active, is_featured, featured_until, seller_id, fulfilled_by,
         commerce_mode)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'each'),$8,$9,$10,COALESCE($11,0),$12,$13::jsonb,
               COALESCE($14,TRUE),COALESCE($15,FALSE),$16,$17,$18,$19)
       RETURNING *`,
      [
        category_id || null, name, slug, description || null, breed || null, age_stage || null,
        unit, pricing.price, pricing.price_type, pricing.price_max, stock, finalCover,
        JSON.stringify(finalImages), is_active, is_featured,
        featured_until,
        nextSellerId,
        fulfilled_by,
        commerce_mode,
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
      price_type, seller_id, fulfilled_by: fulfilledByRaw,
      commerce_mode: commerceModeRaw,
      featured_until: featuredUntilRaw,
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
    const hasFulfilledUpdate = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'fulfilled_by'
    );
    let nextFulfilledBy = null;
    if (hasFulfilledUpdate) {
      nextFulfilledBy =
        fulfilledByRaw === 'seller' ? 'seller' : 'platform';
    }

    const hasCommerceUpdate = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'commerce_mode'
    );
    let nextCommerceMode = null;
    if (hasCommerceUpdate || category_id) {
      const { resolveCommerceMode } = require('../utils/commerceMode');
      nextCommerceMode = await resolveCommerceMode({
        commerce_mode: hasCommerceUpdate ? commerceModeRaw : undefined,
        category_id: category_id || undefined,
      });
    }

    const hasFeaturedFlag = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_featured');
    const hasFeaturedUntil = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'featured_until'
    );
    let nextFeaturedUntil = undefined;
    if (hasFeaturedFlag || hasFeaturedUntil) {
      const { parseFeaturedUntil } = require('../utils/commerceMode');
      const settingsRes = await query(
        'SELECT featured_listing_days FROM settings ORDER BY id ASC LIMIT 1'
      );
      const existing = await query(
        'SELECT is_featured, featured_until FROM products WHERE id=$1',
        [req.params.id]
      );
      const current = existing.rows[0] || {};
      const featuredOn = hasFeaturedFlag ? Boolean(is_featured) : Boolean(current.is_featured);
      if (!featuredOn) {
        nextFeaturedUntil = null;
      } else if (hasFeaturedUntil) {
        nextFeaturedUntil = parseFeaturedUntil(featuredUntilRaw, {
          is_featured: true,
          featured_listing_days: settingsRes.rows[0]?.featured_listing_days,
        });
      } else if (hasFeaturedFlag && is_featured && !current.featured_until) {
        nextFeaturedUntil = parseFeaturedUntil(null, {
          is_featured: true,
          featured_listing_days: settingsRes.rows[0]?.featured_listing_days,
        });
      }
    }

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
        fulfilled_by = CASE
          WHEN $20::boolean THEN $19
          WHEN $18::boolean AND $17 IS NULL THEN 'platform'
          ELSE fulfilled_by
        END,
        commerce_mode = CASE WHEN $21::boolean THEN $22 ELSE commerce_mode END,
        featured_until = CASE WHEN $23::boolean THEN $24 ELSE featured_until END,
        updated_at = NOW()
       WHERE id=$25 RETURNING *`,
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
        nextFulfilledBy,
        hasFulfilledUpdate,
        hasCommerceUpdate || Boolean(category_id && nextCommerceMode),
        nextCommerceMode,
        nextFeaturedUntil !== undefined,
        nextFeaturedUntil ?? null,
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
              u.email AS login_email,
              u.id AS login_user_id,
              (SELECT COUNT(*)::int FROM products p WHERE p.seller_id = s.id) AS product_count
       FROM sellers s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.name ASC`
    );
    res.json({ sellers: r.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Create or reset a seller login account linked to this seller profile.
 * Body: { email, password, name? }
 */
router.post('/sellers/:id/account', async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const sellerRes = await query('SELECT * FROM sellers WHERE id=$1', [req.params.id]);
    if (!sellerRes.rowCount) return res.status(404).json({ error: 'Seller not found' });
    const seller = sellerRes.rows[0];
    const loginEmail = String(email).trim().toLowerCase();
    const { withClient } = require('../db');

    try {
      await withClient(async (db) => {
        await db.query('BEGIN');
        try {
          let userId = seller.user_id;
          if (userId) {
            const hash = await bcrypt.hash(password, 10);
            await db.query(
              `UPDATE users SET email=$1, password_hash=$2, name=COALESCE($3, name),
                 role='seller', phone=COALESCE($4, phone), updated_at=NOW()
               WHERE id=$5`,
              [loginEmail, hash, name || seller.name, seller.phone, userId]
            );
          } else {
            const exists = await db.query('SELECT id, role FROM users WHERE email=$1', [
              loginEmail,
            ]);
            if (exists.rowCount) {
              const existing = exists.rows[0];
              if (existing.role === 'admin') {
                throw Object.assign(new Error('That email belongs to an admin account'), {
                  status: 409,
                  expose: true,
                });
              }
              const linked = await db.query(
                'SELECT id FROM sellers WHERE user_id=$1 AND id <> $2',
                [existing.id, seller.id]
              );
              if (linked.rowCount) {
                throw Object.assign(
                  new Error('That email is already linked to another seller'),
                  { status: 409, expose: true }
                );
              }
              const hash = await bcrypt.hash(password, 10);
              await db.query(
                `UPDATE users SET password_hash=$1, role='seller', name=COALESCE($2, name),
                   phone=COALESCE($3, phone), updated_at=NOW() WHERE id=$4`,
                [hash, name || seller.name, seller.phone, existing.id]
              );
              userId = existing.id;
            } else {
              const hash = await bcrypt.hash(password, 10);
              const ins = await db.query(
                `INSERT INTO users (name, email, phone, password_hash, role)
                 VALUES ($1,$2,$3,$4,'seller')
                 RETURNING id`,
                [name || seller.name, loginEmail, seller.phone, hash]
              );
              userId = ins.rows[0].id;
            }
            await db.query(
              'UPDATE sellers SET user_id=$1, email=COALESCE(email,$2), updated_at=NOW() WHERE id=$3',
              [userId, loginEmail, seller.id]
            );
          }
          await db.query('COMMIT');
        } catch (err) {
          await db.query('ROLLBACK');
          throw err;
        }
      });

      const out = await query(
        `SELECT s.*, u.email AS login_email, u.id AS login_user_id
         FROM sellers s LEFT JOIN users u ON u.id = s.user_id WHERE s.id=$1`,
        [seller.id]
      );
      res.status(201).json({
        seller: out.rows[0],
        message: 'Seller login ready. They can sign in at /seller/login',
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already in use' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/** Unlink login account from seller (does not delete the user row). */
router.delete('/sellers/:id/account', async (req, res, next) => {
  try {
    const sellerRes = await query('SELECT id, user_id FROM sellers WHERE id=$1', [req.params.id]);
    if (!sellerRes.rowCount) return res.status(404).json({ error: 'Seller not found' });
    const { user_id: userId } = sellerRes.rows[0];
    if (!userId) return res.json({ success: true, message: 'No login linked' });

    await query('UPDATE sellers SET user_id=NULL, updated_at=NOW() WHERE id=$1', [
      req.params.id,
    ]);
    // Demote user so they cannot keep seller JWT access
    await query(
      `UPDATE users SET role='customer', updated_at=NOW()
       WHERE id=$1 AND role='seller'`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/sellers', async (req, res, next) => {
  try {
    const {
      name, phone, email, whatsapp, bio, is_active,
      is_verified, delivered_count, commission_pct, avatar_url,
    } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Seller name is required' });
    const { clampCommissionPct } = require('../constants/commerce');
    const { normalizeSellerAddress } = require('../utils/address');
    const addr = normalizeSellerAddress(req.body || {}, { required: false });
    if (!addr.ok) return res.status(400).json({ error: addr.error });
    const a = addr.fields;
    const nextCommission =
      commission_pct === '' || commission_pct === null || commission_pct === undefined
        ? null
        : clampCommissionPct(commission_pct);
    const nextAvatar = avatar_url ? String(avatar_url).trim().slice(0, 1000) : null;
    const r = await query(
      `INSERT INTO sellers
        (name, phone, email, whatsapp, location, bio, is_active, is_verified, delivered_count,
         commission_pct, country_code, country_name, address_line1, address_line2, postal_code,
         county, sub_county, admin_location, sub_location, latitude, longitude, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE),COALESCE($8,FALSE),COALESCE($9,0),$10,
               $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        name.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        whatsapp?.trim() || null,
        a.location,
        bio?.trim() || null,
        is_active,
        Boolean(is_verified),
        Math.max(0, Number(delivered_count) || 0),
        nextCommission,
        a.country_code,
        a.country_name,
        a.address_line1,
        a.address_line2,
        a.postal_code,
        a.county,
        a.sub_county,
        a.admin_location,
        a.sub_location,
        a.latitude,
        a.longitude,
        nextAvatar,
      ]
    );
    res.status(201).json({ seller: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/sellers/:id', async (req, res, next) => {
  try {
    const {
      name, phone, email, whatsapp, bio, is_active,
      is_verified, delivered_count, commission_pct, avatar_url,
      service_counties: serviceCountiesRaw,
      pickup_label: pickupLabel,
      pickup_notes: pickupNotes,
    } = req.body || {};
    const hasCommission = Object.prototype.hasOwnProperty.call(req.body || {}, 'commission_pct');
    const hasAvatar = Object.prototype.hasOwnProperty.call(req.body || {}, 'avatar_url');
    const hasService = Object.prototype.hasOwnProperty.call(req.body || {}, 'service_counties');
    const hasPickupLabel = Object.prototype.hasOwnProperty.call(req.body || {}, 'pickup_label');
    const hasPickupNotes = Object.prototype.hasOwnProperty.call(req.body || {}, 'pickup_notes');
    const { clampCommissionPct } = require('../constants/commerce');
    const { normalizeSellerAddress } = require('../utils/address');
    const { parseServiceCounties } = require('../utils/proximity');
    const addr = normalizeSellerAddress(req.body || {}, { required: false });
    if (!addr.ok) return res.status(400).json({ error: addr.error });
    const a = addr.fields;
    const nextCommission = hasCommission
      ? commission_pct === '' || commission_pct === null
        ? null
        : clampCommissionPct(commission_pct)
      : undefined;
    const nextAvatar = hasAvatar
      ? (avatar_url ? String(avatar_url).trim().slice(0, 1000) || null : null)
      : undefined;
    const nextService = hasService
      ? JSON.stringify(parseServiceCounties(serviceCountiesRaw))
      : null;
    const r = await query(
      `UPDATE sellers SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         whatsapp = COALESCE($4, whatsapp),
         location = $5,
         bio = COALESCE($6, bio),
         is_active = COALESCE($7, is_active),
         is_verified = COALESCE($8, is_verified),
         delivered_count = COALESCE($9, delivered_count),
         commission_pct = CASE WHEN $11::boolean THEN $10 ELSE commission_pct END,
         country_code = $12,
         country_name = $13,
         address_line1 = $14,
         address_line2 = $15,
         postal_code = $16,
         county = $17,
         sub_county = $18,
         admin_location = $19,
         sub_location = $20,
         latitude = $21,
         longitude = $22,
         avatar_url = CASE WHEN $23::boolean THEN $24 ELSE avatar_url END,
         service_counties = CASE WHEN $25::boolean THEN $26::jsonb ELSE service_counties END,
         pickup_label = CASE WHEN $27::boolean THEN $28 ELSE pickup_label END,
         pickup_notes = CASE WHEN $29::boolean THEN $30 ELSE pickup_notes END,
         updated_at = NOW()
       WHERE id = $31
       RETURNING *`,
      [
        name?.trim() || null,
        phone !== undefined ? phone?.trim() || null : null,
        email !== undefined ? email?.trim() || null : null,
        whatsapp !== undefined ? whatsapp?.trim() || null : null,
        a.location,
        bio !== undefined ? bio?.trim() || null : null,
        is_active,
        is_verified === undefined ? null : Boolean(is_verified),
        delivered_count === undefined ? null : Math.max(0, Number(delivered_count) || 0),
        nextCommission ?? null,
        hasCommission,
        a.country_code,
        a.country_name,
        a.address_line1,
        a.address_line2,
        a.postal_code,
        a.county,
        a.sub_county,
        a.admin_location,
        a.sub_location,
        a.latitude,
        a.longitude,
        hasAvatar,
        nextAvatar ?? null,
        hasService,
        nextService ?? '[]',
        hasPickupLabel,
        hasPickupLabel
          ? pickupLabel
            ? String(pickupLabel).trim().slice(0, 200) || null
            : null
          : null,
        hasPickupNotes,
        hasPickupNotes
          ? pickupNotes
            ? String(pickupNotes).trim() || null
            : null
          : null,
        req.params.id,
      ]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Seller not found' });
    res.json({ seller: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

/** Mark marketplace payout entries as remitted (manual M-Pesa). */
router.post('/payouts/:id/remit', async (req, res, next) => {
  try {
    const notes = req.body?.notes ? String(req.body.notes).slice(0, 500) : null;
    const r = await query(
      `UPDATE seller_payout_entries
       SET status = 'remitted', remitted_at = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $1 AND status = 'owed'
       RETURNING *`,
      [req.params.id, notes]
    );
    if (!r.rowCount) {
      return res.status(404).json({ error: 'Owed payout entry not found' });
    }
    res.json({ entry: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/payouts', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT pe.*, s.name AS seller_name, oi.product_name, o.order_number
       FROM seller_payout_entries pe
       JOIN sellers s ON s.id = pe.seller_id
       JOIN order_items oi ON oi.id = pe.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled'
       ORDER BY pe.status ASC, pe.created_at DESC
       LIMIT 300`
    );
    res.json({ entries: r.rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/sellers/:id', async (req, res, next) => {
  try {
    // Products keep selling under Soko Mkononi default (seller_id SET NULL via FK)
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
