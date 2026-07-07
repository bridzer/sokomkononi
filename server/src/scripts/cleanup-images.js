/**
 * Cleanup dangling image references.
 *
 * Scans every product's `image_url` and `images`, and every category's
 * `image_url`, for URLs that point at `/uploads/...` files no longer present
 * on disk, and removes the missing references. Only local uploads are
 * checked — external URLs (Unsplash, CDN, etc.) are left alone.
 *
 * Usage:
 *   npm run db:cleanup:images            # dry-run: prints what WOULD change
 *   npm run db:cleanup:images -- --apply # actually update the DB
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const UPLOAD_PREFIX = '/uploads/';

function urlHasFile(url) {
  if (typeof url !== 'string' || !url.startsWith(UPLOAD_PREFIX)) return true; // external — leave alone
  const filename = url.slice(UPLOAD_PREFIX.length);
  if (!filename) return false;
  return fs.existsSync(path.join(UPLOAD_DIR, filename));
}

async function cleanProducts(apply) {
  const { rows } = await pool.query(
    `SELECT id, name, image_url, images FROM products`
  );
  console.log(`[cleanup] Scanning ${rows.length} product(s)…`);

  let changed = 0;
  let removedCovers = 0;
  let removedGalleryItems = 0;

  for (const p of rows) {
    const goodGallery = Array.isArray(p.images)
      ? p.images.filter((u) => urlHasFile(u))
      : [];
    const missingFromGallery = Array.isArray(p.images)
      ? p.images.filter((u) => !urlHasFile(u))
      : [];

    const coverOk = p.image_url ? urlHasFile(p.image_url) : true;
    const nextCover = coverOk ? p.image_url : goodGallery[0] || null;

    const changedGallery =
      Array.isArray(p.images) &&
      (goodGallery.length !== p.images.length ||
        goodGallery.some((u, i) => u !== p.images[i]));
    const changedCover = nextCover !== p.image_url;

    if (!changedGallery && !changedCover) continue;

    changed += 1;
    removedCovers += changedCover && !coverOk ? 1 : 0;
    removedGalleryItems += missingFromGallery.length;

    console.log(
      `  product #${p.id} ${p.name}` +
        (changedCover ? `\n    cover: ${p.image_url || 'NULL'} -> ${nextCover || 'NULL'}` : '') +
        (missingFromGallery.length
          ? `\n    dropping ${missingFromGallery.length} missing gallery item(s): ${missingFromGallery.join(', ')}`
          : '')
    );

    if (apply) {
      await pool.query(
        `UPDATE products SET image_url = $1, images = $2::jsonb, updated_at = NOW() WHERE id = $3`,
        [nextCover, JSON.stringify(goodGallery), p.id]
      );
    }
  }

  return { changed, removedCovers, removedGalleryItems };
}

async function cleanCategories(apply) {
  const { rows } = await pool.query(
    `SELECT id, name, image_url FROM categories`
  );
  console.log(`[cleanup] Scanning ${rows.length} categor(y|ies)…`);

  let changed = 0;
  for (const c of rows) {
    if (!c.image_url || urlHasFile(c.image_url)) continue;
    changed += 1;
    console.log(`  category #${c.id} ${c.name}\n    image_url: ${c.image_url} -> NULL`);
    if (apply) {
      await pool.query(
        `UPDATE categories SET image_url = NULL, updated_at = NOW() WHERE id = $1`,
        [c.id]
      );
    }
  }
  return { changed };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[cleanup] Mode: ${mode}. Upload dir: ${UPLOAD_DIR}`);

  const p = await cleanProducts(apply);
  const c = await cleanCategories(apply);

  console.log(
    `\n[cleanup] Products affected: ${p.changed}. Broken covers: ${p.removedCovers}. ` +
      `Broken gallery items: ${p.removedGalleryItems}. ` +
      `Categories affected: ${c.changed}.`
  );
  if (!apply) {
    console.log('[cleanup] Dry-run only — re-run with `-- --apply` to write.');
  } else {
    console.log('[cleanup] Applied.');
  }
}

main()
  .catch((err) => {
    console.error('[cleanup] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
