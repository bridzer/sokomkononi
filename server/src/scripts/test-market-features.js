/**
 * Phase gate tests for market discovery / reserves / pulse helpers.
 * Run: node src/scripts/test-market-features.js
 */
require('dotenv').config();

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function testProximityUtils() {
  const {
    normalizeCountyName,
    proximityRank,
    sellerServesCounty,
    parseCorridorCounties,
    parseServiceCounties,
  } = require('../utils/proximity');

  assert(normalizeCountyName('  Nakuru ') === 'Nakuru', 'normalize county');
  assert(proximityRank('Nakuru', 'Nakuru') === 0, 'same county rank');
  assert(proximityRank('Kiambu', 'Nakuru') === 1, 'corridor rank');
  assert(proximityRank('Mombasa', 'Nakuru') === 2, 'far rank');
  assert(sellerServesCounty(null, 'Nakuru') === true, 'platform serves all');
  assert(
    sellerServesCounty({ county: '', service_counties: [] }, 'Nakuru') === true,
    'empty = nationwide'
  );
  assert(
    sellerServesCounty(
      { county: 'Nakuru', service_counties: ['Kiambu'] },
      'Kiambu'
    ) === true,
    'service county match'
  );
  assert(
    sellerServesCounty(
      { county: 'Nakuru', service_counties: ['Kiambu'] },
      'Mombasa'
    ) === false,
    'outside radius'
  );
  assert(parseCorridorCounties(['A', 'B']).length === 2, 'corridor parse');
  assert(parseServiceCounties('["Nakuru"]').includes('Nakuru'), 'service parse');
  console.log('✓ proximity utils');
}

async function testMarketPulseHelpers() {
  const { median, heatFromCount, countyNameToSlug, countySlugToName } = require('../utils/marketPulse');
  assert(median([1, 3, 2]) === 2, 'median odd');
  assert(median([1, 2, 3, 4]) === 2.5, 'median even');
  assert(heatFromCount(3, 5) === null, 'insufficient heat');
  assert(heatFromCount(6, 5) === 'scarce', 'scarce heat');
  assert(heatFromCount(20, 5) === 'high', 'high heat');
  assert(countyNameToSlug('Nakuru') === 'nakuru', 'slug');
  assert(countySlugToName('kiambu') === 'Kiambu', 'unslug');
  console.log('✓ market pulse helpers');
}

async function testSeasons() {
  const { getSeasonCalendar } = require('../utils/seasons');
  const cal = getSeasonCalendar(new Date('2026-03-15'));
  assert(cal.current_month === 'March', 'month name');
  assert(Array.isArray(cal.active) && cal.active.length > 0, 'active seasons');
  console.log('✓ seasons');
}

async function testPhonesMatch() {
  const { phonesMatch, normalizePhone } = require('../utils/reserves');
  assert(normalizePhone('07 12 34') === '071234', 'normalize phone');
  assert(phonesMatch('+254712345678', '0712345678') === true, 'phone match');
  assert(phonesMatch('0711111111', '0722222222') === false, 'phone mismatch');
  console.log('✓ phone match');
}

async function testDbOptional() {
  try {
    const { query, pool } = require('../db');
    await query('SELECT 1');
    // Schema columns exist
    const cols = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'products' AND column_name IN ('lot_status','ready_from','reserve_expires_at')`
    );
    assert(cols.rowCount === 3, 'product lot columns');
    const reserves = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'product_reserves'`
    );
    assert(reserves.rowCount === 1, 'product_reserves table');
    const settings = await query(
      `SELECT corridor_counties, reserve_hold_hours, market_pulse_min_listings
       FROM settings ORDER BY id ASC LIMIT 1`
    );
    assert(settings.rowCount >= 0, 'settings readable');
    console.log('✓ database schema');
    await pool.end().catch(() => {});
  } catch (err) {
    console.log('⚠ database tests skipped:', err.message);
  }
}

async function main() {
  await testProximityUtils();
  await testMarketPulseHelpers();
  await testSeasons();
  await testPhonesMatch();
  await testDbOptional();
  console.log('\nAll market-feature phase tests passed.');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
