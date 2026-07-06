require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function main() {
  const mode = process.argv[2];
  if (mode === 'reset') {
    console.log('Dropping tables...');
    await pool.query(`
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS contact_messages CASCADE;
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
  }
  const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Applying schema...');
  await pool.query(sql);
  console.log('Migration complete.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
