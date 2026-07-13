/**
 * Injects native ad placeholders into a product array.
 *
 * Rules (per AdSense placement spec):
 * - One ad after every `interval` products (default 10)
 * - Never before the first product
 * - Never after fewer than `interval` products in a batch
 * - `globalOffset` supports pagination / infinite scroll without duplicate ads
 *
 * @param {Array<object>} products - Product records from the API
 * @param {object} [options]
 * @param {number} [options.interval=10] - Products between ads
 * @param {number} [options.globalOffset=0] - Products already rendered before this batch
 * @param {string} [options.slot='native'] - AdSense slot id for placeholders
 * @returns {Array<object>} Mixed array of products and `{ type: 'ad', slot, id }` entries
 */
export function insertAdsIntoProducts(products, options = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const interval = Math.max(1, Number(options.interval) || 10);
  const globalOffset = Math.max(0, Number(options.globalOffset) || 0);
  const slot = options.slot || 'native';

  const result = [];

  products.forEach((product, index) => {
    result.push(product);

    // 1-based global product index across all loaded pages
    const globalIndex = globalOffset + index + 1;

    if (globalIndex % interval === 0) {
      result.push({
        type: 'ad',
        slot,
        id: `ad-after-product-${globalIndex}`,
      });
    }
  });

  return result;
}

export function isAdItem(item) {
  return item != null && item.type === 'ad';
}
