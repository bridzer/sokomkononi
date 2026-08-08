const express = require('express');
const { query } = require('../db');
const { requireSeller } = require('../middleware/auth');
const { upload, buildFilename } = require('../middleware/upload');
const { getStorage } = require('../storage');
const { normalizeProductPricing } = require('../utils/pricing');
const { resolveCommerceMode } = require('../utils/commerceMode');

const router = express.Router();

router.use(requireSeller);

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeImages(input) {
  if (!Array.isArray(input)) return { images: null, cover: null };
  const urls = input
    .map((v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.url : null))
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  return { images: urls, cover: urls[0] || null };
}

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

// --------- Profile ---------
router.get('/me', async (req, res, next) => {
  try {
    const stats = await query(
      `SELECT
         COUNT(*)::int AS product_count,
         COUNT(*) FILTER (WHERE is_active)::int AS active_count,
         COALESCE(SUM(stock), 0)::int AS total_stock
       FROM products WHERE seller_id = $1`,
      [req.seller.id]
    );
    const orders = await query(
      `SELECT COUNT(DISTINCT oi.order_id)::int AS order_count,
              COALESCE(SUM(oi.subtotal), 0)::numeric AS gmv,
              COALESCE(SUM(oi.commission_amount), 0)::numeric AS commission_total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.seller_id = $1
         AND o.status IN ('pending','confirmed','processing','delivered')`,
      [req.seller.id]
    );
    res.json({
      seller: req.seller,
      stats: {
        ...stats.rows[0],
        ...orders.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req, res, next) => {
  try {
    const { phone, whatsapp, bio, avatar_url } = req.body || {};
    const { normalizeSellerAddress } = require('../utils/address');
    const addr = normalizeSellerAddress(req.body || {}, { required: false });
    if (!addr.ok) return res.status(400).json({ error: addr.error });
    const a = addr.fields;
    const hasAvatar = Object.prototype.hasOwnProperty.call(req.body || {}, 'avatar_url');
    const nextAvatar = hasAvatar
      ? (avatar_url ? String(avatar_url).trim().slice(0, 1000) || null : null)
      : undefined;
    const r = await query(
      `UPDATE sellers SET
         phone = COALESCE($1, phone),
         whatsapp = COALESCE($2, whatsapp),
         location = $3,
         bio = COALESCE($4, bio),
         country_code = $5,
         country_name = $6,
         address_line1 = $7,
         address_line2 = $8,
         postal_code = $9,
         county = $10,
         sub_county = $11,
         admin_location = $12,
         sub_location = $13,
         latitude = $14,
         longitude = $15,
         avatar_url = CASE WHEN $16::boolean THEN $17 ELSE avatar_url END,
         updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        phone !== undefined ? String(phone || '').trim() || null : null,
        whatsapp !== undefined ? String(whatsapp || '').trim() || null : null,
        a.location,
        bio !== undefined ? String(bio || '').trim() || null : null,
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
        req.seller.id,
      ]
    );
    res.json({ seller: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// --------- Uploads ---------
router.post('/uploads', (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded — use field name "image"' });
    }
    try {
      const saved = await persistUploadedFile(req.file);
      res.status(201).json(saved);
    } catch (saveErr) {
      next(saveErr);
    }
  });
});

router.post('/uploads/batch', (req, res, next) => {
  upload.array('images', 10)(req, res, async (err) => {
    if (err) return next(err);
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No files uploaded — use field name "images"' });
    }
    try {
      const saved = [];
      for (const file of req.files) {
        saved.push(await persistUploadedFile(file));
      }
      res.status(201).json({ files: saved });
    } catch (saveErr) {
      next(saveErr);
    }
  });
});

// --------- Categories (read-only for listing form) ---------
router.get('/categories', async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT c.id, c.name, c.slug, c.parent_id, c.default_commerce_mode,
              pc.name AS parent_name, pc.slug AS parent_slug
       FROM categories c
       LEFT JOIN categories pc ON pc.id = c.parent_id
       WHERE c.is_active = TRUE AND c.parent_id IS NOT NULL
       ORDER BY pc.sort_order NULLS LAST, pc.name, c.sort_order, c.name`
    );
    res.json({ categories: r.rows });
  } catch (err) {
    next(err);
  }
});

// --------- Listings (own products only) ---------
router.get('/products', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              pc.name AS parent_category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       WHERE p.seller_id = $1
       ORDER BY p.updated_at DESC`,
      [req.seller.id]
    );
    res.json({ products: r.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const {
      category_id, name, description, breed, age_stage, unit,
      stock, image_url, images: imagesInput, is_active,
      fulfilled_by: fulfilledByRaw,
    } = req.body || {};

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!category_id) {
      return res.status(400).json({ error: 'Please select a subcategory' });
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
    const fulfilled_by = fulfilledByRaw === 'platform' ? 'platform' : 'seller';

    // Sellers list on the marketplace by default (limited-supply)
    const commerce_mode = await resolveCommerceMode({
      commerce_mode: 'marketplace',
      category_id,
    });

    const baseSlug = slugify(name);
    const uniqCheck = await query('SELECT COUNT(*)::int AS c FROM products WHERE slug LIKE $1', [
      `${baseSlug}%`,
    ]);
    const slug =
      uniqCheck.rows[0].c > 0 ? `${baseSlug}-${Date.now().toString().slice(-5)}` : baseSlug;

    const r = await query(
      `INSERT INTO products
        (category_id, name, slug, description, breed, age_stage, unit, price, price_type, price_max,
         stock, image_url, images, is_active, is_featured, seller_id, fulfilled_by, commerce_mode)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'each'),$8,$9,$10,COALESCE($11,0),$12,$13::jsonb,
               COALESCE($14,TRUE),FALSE,$15,$16,$17)
       RETURNING *`,
      [
        Number(category_id),
        name.trim(),
        slug,
        description || null,
        breed || null,
        age_stage || null,
        unit,
        pricing.price,
        pricing.price_type,
        pricing.price_max,
        stock,
        finalCover,
        JSON.stringify(finalImages),
        is_active,
        req.seller.id,
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
    const owned = await query(
      'SELECT id FROM products WHERE id=$1 AND seller_id=$2',
      [req.params.id, req.seller.id]
    );
    if (!owned.rowCount) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const {
      category_id, name, description, breed, age_stage, unit,
      stock, image_url, images: imagesInput, is_active,
      price_type, fulfilled_by: fulfilledByRaw,
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
    const nextCover = hasImagesUpdate ? cover : image_url ?? null;
    const nextImages = hasImagesUpdate ? JSON.stringify(imgs) : null;

    const hasFulfilledUpdate = Object.prototype.hasOwnProperty.call(
      req.body || {},
      'fulfilled_by'
    );
    const nextFulfilledBy = hasFulfilledUpdate
      ? fulfilledByRaw === 'platform'
        ? 'platform'
        : 'seller'
      : null;

    let nextCommerceMode = null;
    if (category_id) {
      nextCommerceMode = await resolveCommerceMode({
        commerce_mode: 'marketplace',
        category_id,
      });
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
        fulfilled_by = CASE WHEN $16::boolean THEN $17 ELSE fulfilled_by END,
        commerce_mode = CASE WHEN $18::boolean THEN $19 ELSE commerce_mode END,
        updated_at = NOW()
       WHERE id = $20 AND seller_id = $21
       RETURNING *`,
      [
        category_id ? Number(category_id) : null,
        name?.trim() || null,
        description !== undefined ? description : null,
        breed !== undefined ? breed : null,
        age_stage !== undefined ? age_stage : null,
        unit || null,
        pricing?.price ?? null,
        pricing?.price_type ?? null,
        hasPricingUpdate,
        pricing?.price_max ?? null,
        stock !== undefined ? Number(stock) : null,
        nextCover,
        hasImagesUpdate,
        nextImages,
        is_active,
        hasFulfilledUpdate,
        nextFulfilledBy,
        Boolean(nextCommerceMode),
        nextCommerceMode,
        req.params.id,
        req.seller.id,
      ]
    );
    res.json({ product: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const r = await query(
      'DELETE FROM products WHERE id=$1 AND seller_id=$2 RETURNING id',
      [req.params.id, req.seller.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Listing not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --------- Orders containing this seller's lines ---------
router.get('/orders', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method,
              o.customer_name, o.customer_phone, o.county, o.sub_county, o.location,
              o.sub_location, o.country_code, o.delivery_method, o.created_at,
              SUM(oi.subtotal)::numeric AS seller_subtotal,
              SUM(oi.commission_amount)::numeric AS seller_commission,
              SUM(oi.quantity)::int AS item_qty
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE oi.seller_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [req.seller.id]
    );
    res.json({ orders: r.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const orderRes = await query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method,
              o.customer_name, o.customer_phone, o.county, o.sub_county, o.location,
              o.sub_location, o.country_code, o.country_name, o.address_line1,
              o.address_line2, o.postal_code, o.latitude, o.longitude,
              o.delivery_method, o.delivery_address, o.notes, o.created_at
       FROM orders o
       WHERE o.id = $1
         AND EXISTS (
           SELECT 1 FROM order_items oi
           WHERE oi.order_id = o.id AND oi.seller_id = $2
         )`,
      [req.params.id, req.seller.id]
    );
    if (!orderRes.rowCount) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const items = await query(
      `SELECT id, product_id, product_name, unit_price, quantity, subtotal,
              commission_pct, commission_amount, commerce_mode, fulfilled_by
       FROM order_items
       WHERE order_id = $1 AND seller_id = $2`,
      [req.params.id, req.seller.id]
    );
    res.json({ order: orderRes.rows[0], items: items.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
