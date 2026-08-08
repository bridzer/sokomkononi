import {
  normalizeCountyName,
  countyNameToSlug,
  countySlugToName,
  proximityRank,
  heatLabel,
  isLotBuyable,
  isReadyForPurchase,
} from './proximity';

describe('proximity helpers', () => {
  test('normalizeCountyName trims and collapses spaces', () => {
    expect(normalizeCountyName('  Nakuru  County ')).toBe('Nakuru County');
  });

  test('slug round-trip for simple counties', () => {
    expect(countyNameToSlug('Kiambu')).toBe('kiambu');
    expect(countySlugToName('nyandarua')).toBe('Nyandarua');
  });

  test('proximityRank prefers same county then corridor', () => {
    expect(proximityRank('Nakuru', 'Nakuru')).toBe(0);
    expect(proximityRank('Kiambu', 'Nakuru')).toBe(1);
    expect(proximityRank('Mombasa', 'Nakuru')).toBe(2);
  });

  test('heatLabel maps known bands', () => {
    expect(heatLabel('scarce')).toMatch(/Scarce/i);
    expect(heatLabel('unknown')).toBeNull();
  });

  test('isLotBuyable respects marketplace lot_status', () => {
    expect(isLotBuyable({ commerce_mode: 'retail', stock: 2 })).toBe(true);
    expect(
      isLotBuyable({ commerce_mode: 'marketplace', lot_status: 'sold', stock: 1 })
    ).toBe(false);
    expect(
      isLotBuyable({ commerce_mode: 'marketplace', lot_status: 'listed', stock: 1 })
    ).toBe(true);
  });

  test('isReadyForPurchase handles ready_from', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isReadyForPurchase({ ready_from: future })).toBe(false);
    expect(isReadyForPurchase({ ready_from: past })).toBe(true);
    expect(isReadyForPurchase({})).toBe(true);
  });
});
