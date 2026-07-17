#!/usr/bin/env node
/**
 * Diagnostic script for Loop payment integration.
 * Usage: node src/scripts/test-loop-payment.js [--initiate] [--phone=254712345678]
 */
require('dotenv').config();

const loopPayment = require('../services/loopPayment');

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const doInitiate = args.includes('--initiate');
  const phoneArg = args.find((a) => a.startsWith('--phone='));
  const phone = phoneArg ? phoneArg.split('=')[1] : '0756908482';

  console.log('Loop payment diagnostics');
  console.log('------------------------');
  console.log('LOOP_API_BASE_URL:', process.env.LOOP_API_BASE_URL || '(default sandbox.loop.co.ke)');
  console.log('LOOP_CLIENT_ID:', mask(process.env.LOOP_CLIENT_ID));
  console.log('LOOP_PAYMENT_INIT_PATH:', process.env.LOOP_PAYMENT_INIT_PATH || '/loop-api/1.0.0/payments/initiate');
  console.log('APP_BASE_URL:', process.env.APP_BASE_URL || '(missing)');
  console.log('Configured:', loopPayment.isConfigured());
  console.log('Callback URL:', loopPayment.callbackUrl());
  console.log('');

  try {
    const token = await loopPayment.getAccessToken();
    console.log('OAuth: OK (token length', token.length + ')');
  } catch (err) {
    console.error('OAuth: FAILED —', err.message);
    if (err.data) console.error(JSON.stringify(err.data, null, 2));
    process.exit(1);
  }

  if (!doInitiate) {
    console.log('\nOAuth succeeded. Run with --initiate to test payment initiation.');
    return;
  }

  try {
    const result = await loopPayment.initiatePayment({
      order: { order_number: `TEST-${Date.now()}`, total_amount: 1 },
      phone,
    });
    console.log('\nPayment initiate: OK');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\nPayment initiate: FAILED —', err.message);
    console.error('HTTP status:', err.status);
    if (err.data) console.error('Response:', JSON.stringify(err.data, null, 2));
    process.exit(1);
  }
}

main();
