/** Admin-selectable related-product strategies (storefront “Related products” rail). */
const RELATED_PRODUCT_MODES = [
  {
    id: 'closest',
    label: 'Closest relationship (default)',
    description:
      'Prefer same subcategory, then parent category, then same seller, then featured.',
  },
  {
    id: 'subcategory',
    label: 'Same subcategory',
    description: 'Only products in the same subcategory.',
  },
  {
    id: 'category',
    label: 'Same main category',
    description: 'Products under the same parent category.',
  },
  {
    id: 'same_seller',
    label: 'Same seller',
    description: 'Other listings from this product’s seller (or Soko Mkononi).',
  },
  {
    id: 'top_selling_category',
    label: 'Top selling in category',
    description: 'Best sellers in the same category by order volume.',
  },
  {
    id: 'featured',
    label: 'Featured products',
    description: 'Featured storefront products.',
  },
];

const RELATED_MODE_IDS = new Set(RELATED_PRODUCT_MODES.map((m) => m.id));

function normalizeRelatedMode(value) {
  const mode = String(value || 'closest').trim();
  return RELATED_MODE_IDS.has(mode) ? mode : 'closest';
}

module.exports = {
  RELATED_PRODUCT_MODES,
  RELATED_MODE_IDS,
  normalizeRelatedMode,
};
