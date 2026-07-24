const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * Public categories.
 * Query:
 *   roots=true  → main categories only (parent_id IS NULL)
 *   parent=slug → subcategories of that main category
 *   tree=true   → mains with nested `children[]`
 * Default: all active categories (flat), with parent_name + product_count
 */
router.get('/', async (req, res, next) => {
  try {
    const { roots, parent, tree } = req.query;

    if (tree === 'true') {
      const mains = await query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM products p
                 JOIN categories sc ON sc.id = p.category_id
                 WHERE p.is_active = TRUE
                   AND (sc.id = c.id OR sc.parent_id = c.id)
                ) AS product_count
         FROM categories c
         WHERE c.is_active = TRUE AND c.parent_id IS NULL
         ORDER BY c.sort_order ASC, c.name ASC`
      );
      const children = await query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM products p
                 WHERE p.category_id = c.id AND p.is_active = TRUE) AS product_count
         FROM categories c
         WHERE c.is_active = TRUE AND c.parent_id IS NOT NULL
         ORDER BY c.sort_order ASC, c.name ASC`
      );
      const byParent = new Map();
      for (const ch of children.rows) {
        if (!byParent.has(ch.parent_id)) byParent.set(ch.parent_id, []);
        byParent.get(ch.parent_id).push(ch);
      }
      const categories = mains.rows.map((m) => ({
        ...m,
        children: byParent.get(m.id) || [],
      }));
      return res.json({ categories });
    }

    if (roots === 'true') {
      const result = await query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM products p
                 JOIN categories sc ON sc.id = p.category_id
                 WHERE p.is_active = TRUE
                   AND (sc.id = c.id OR sc.parent_id = c.id)
                ) AS product_count
         FROM categories c
         WHERE c.is_active = TRUE AND c.parent_id IS NULL
         ORDER BY c.sort_order ASC, c.name ASC`
      );
      return res.json({ categories: result.rows });
    }

    if (parent) {
      const parentRow = await query(
        `SELECT id, name, slug FROM categories
         WHERE slug = $1 AND is_active = TRUE AND parent_id IS NULL`,
        [parent]
      );
      if (!parentRow.rowCount) {
        return res.status(404).json({ error: 'Main category not found' });
      }
      const result = await query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM products p
                 WHERE p.category_id = c.id AND p.is_active = TRUE) AS product_count
         FROM categories c
         WHERE c.is_active = TRUE AND c.parent_id = $1
         ORDER BY c.sort_order ASC, c.name ASC`,
        [parentRow.rows[0].id]
      );
      return res.json({
        parent: parentRow.rows[0],
        categories: result.rows,
      });
    }

    const result = await query(
      `SELECT c.*,
              p.name AS parent_name,
              p.slug AS parent_slug,
              (SELECT COUNT(*)::int FROM products pr
               WHERE pr.category_id = c.id AND pr.is_active = TRUE) AS product_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.is_active = TRUE
       ORDER BY COALESCE(p.sort_order, c.sort_order) ASC,
                c.parent_id NULLS FIRST,
                c.sort_order ASC,
                c.name ASC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*,
              p.name AS parent_name,
              p.slug AS parent_slug
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.slug = $1`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Category not found' });
    const category = result.rows[0];

    let children = [];
    if (!category.parent_id) {
      const ch = await query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM products pr
                 WHERE pr.category_id = c.id AND pr.is_active = TRUE) AS product_count
         FROM categories c
         WHERE c.parent_id = $1 AND c.is_active = TRUE
         ORDER BY c.sort_order ASC, c.name ASC`,
        [category.id]
      );
      children = ch.rows;
    }

    res.json({ category, children });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
