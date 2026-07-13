/**
 * Pricing validation tests — run with: npm run test:pricing
 */
require('dotenv').config();
const { normalizeProductPricing, parsePriceValue } = require('../utils/pricing');

let pass = 0;
let fail = 0;

function step(name, ok, extra = '') {
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${name}${extra ? ` — ${extra}` : ''}`);
  ok ? pass++ : fail++;
}

function assertThrows(fn, msgPart) {
  try {
    fn();
    return false;
  } catch (err) {
    return err.message.includes(msgPart);
  }
}

console.log('\n== Pricing validation tests ==\n');

step('fixed price 2000', (() => {
  const r = normalizeProductPricing({ price_type: 'fixed', price: '2000' });
  return r.price_type === 'fixed' && r.price === 2000 && r.price_max === null;
})());

step('fixed price with commas', (() => {
  const r = normalizeProductPricing({ price_type: 'fixed', price: '1,500,000' });
  return r.price === 1500000;
})());

step('range 2000-5000', (() => {
  const r = normalizeProductPricing({ price_type: 'range', price: '2000', price_max: '5000' });
  return r.price_type === 'range' && r.price === 2000 && r.price_max === 5000;
})());

step('range rejects max < min', assertThrows(
  () => normalizeProductPricing({ price_type: 'range', price: '5000', price_max: '2000' }),
  'greater than or equal'
));

step('rejects letters in price', assertThrows(
  () => parsePriceValue('abc', 'Price'),
  'positive number'
));

step('rejects scientific notation', assertThrows(
  () => parsePriceValue('1e5', 'Price'),
  'positive number'
));

step('rejects negative', assertThrows(
  () => parsePriceValue('-100', 'Price'),
  'positive number'
));

step('defaults to fixed when price_type omitted', (() => {
  const r = normalizeProductPricing({ price: '3500' });
  return r.price_type === 'fixed';
})());

console.log(`\n== Result: ${pass} passed, ${fail} failed ==\n`);
process.exitCode = fail ? 1 : 0;
