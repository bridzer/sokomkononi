import { insertAdsIntoProducts, isAdItem } from '../utils/insertAdsIntoProducts';

describe('insertAdsIntoProducts', () => {
  const products = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}` }));

  test('returns empty array for empty input', () => {
    expect(insertAdsIntoProducts([])).toEqual([]);
    expect(insertAdsIntoProducts(null)).toEqual([]);
  });

  test('inserts no ad before 10 products', () => {
    const result = insertAdsIntoProducts(products(9), { interval: 10, slot: 'slot-a' });
    expect(result).toHaveLength(9);
    expect(result.every((item) => !isAdItem(item))).toBe(true);
  });

  test('inserts one ad after every 10 products', () => {
    const result = insertAdsIntoProducts(products(25), { interval: 10, slot: 'slot-a' });
    const ads = result.filter(isAdItem);
    expect(ads).toHaveLength(2);
    expect(ads[0]).toMatchObject({ type: 'ad', slot: 'slot-a', id: 'ad-after-product-10' });
    expect(ads[1]).toMatchObject({ type: 'ad', slot: 'slot-a', id: 'ad-after-product-20' });
    expect(result[10]).toMatchObject({ type: 'ad' });
    expect(result[21]).toMatchObject({ type: 'ad' });
  });

  test('supports globalOffset for pagination / infinite scroll', () => {
    const batch = insertAdsIntoProducts(products(10), {
      interval: 10,
      slot: 'slot-a',
      globalOffset: 40,
    });
    expect(batch.filter(isAdItem)).toHaveLength(1);
    expect(batch[10]).toMatchObject({ id: 'ad-after-product-50' });
  });

  test('continues pattern across batches without duplicate boundary ads', () => {
    const first = insertAdsIntoProducts(products(40), { interval: 10, slot: 'x' });
    const second = insertAdsIntoProducts(products(40), {
      interval: 10,
      slot: 'x',
      globalOffset: 40,
    });
    const allAds = [...first, ...second].filter(isAdItem);
    const ids = allAds.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'ad-after-product-10',
      'ad-after-product-20',
      'ad-after-product-30',
      'ad-after-product-40',
      'ad-after-product-50',
      'ad-after-product-60',
      'ad-after-product-70',
      'ad-after-product-80',
    ]);
  });
});
