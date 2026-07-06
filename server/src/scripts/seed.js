require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../db');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function upsertCategory(name, description, sortOrder, imageUrl) {
  const slug = slugify(name);
  const existing = await query('SELECT id FROM categories WHERE slug=$1', [slug]);
  if (existing.rowCount) return existing.rows[0].id;
  const r = await query(
    `INSERT INTO categories (name, slug, description, sort_order, image_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [name, slug, description, sortOrder, imageUrl]
  );
  return r.rows[0].id;
}

async function upsertProduct(p) {
  const slug = slugify(p.name);
  const existing = await query('SELECT id FROM products WHERE slug=$1', [slug]);
  if (existing.rowCount) return existing.rows[0].id;
  const r = await query(
    `INSERT INTO products
      (category_id, name, slug, description, breed, age_stage, unit, price, stock,
       image_url, is_active, is_featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11) RETURNING id`,
    [
      p.category_id, p.name, slug, p.description || null, p.breed || null,
      p.age_stage || null, p.unit || 'each', p.price, p.stock || 10,
      p.image_url || null, !!p.is_featured,
    ]
  );
  return r.rows[0].id;
}

async function main() {
  console.log('Seeding database...');

  // Admin user
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@kalrofarm.co.ke').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const adminName = process.env.ADMIN_NAME || 'Kalro Admin';
  const adminExists = await query('SELECT id FROM users WHERE email=$1', [adminEmail]);
  if (!adminExists.rowCount) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin')`,
      [adminName, adminEmail, hash]
    );
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  // Settings row
  const settingsExists = await query('SELECT id FROM settings LIMIT 1');
  if (!settingsExists.rowCount) {
    await query(
      `INSERT INTO settings (business_name, whatsapp_number, phone_number, email, location, about)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'Kalro Farm Kenya',
        process.env.WHATSAPP_NUMBER || '254756908482',
        process.env.PHONE_NUMBER || '0756908482',
        process.env.BUSINESS_EMAIL || 'info@kalrofarm.co.ke',
        process.env.BUSINESS_LOCATION || 'Naivasha, Kenya',
        'Kalro Farm Kenya offers high quality dairy goats, boer goats, poultry, and farm-fresh eggs. Free delivery countrywide.',
      ]
    );
  }

  // Categories
  const goatsId = await upsertCategory(
    'Dairy Goats',
    'High quality dairy goats: Saneen, Giant Alpine and Toggenburg breeds.',
    1,
    'https://images.unsplash.com/photo-1518731245577-1af64d67f61a?auto=format&fit=crop&w=800&q=80'
  );
  const boerId = await upsertCategory(
    'Boer Goats',
    'Full blood Boer goats for meat production, healthy and vaccinated.',
    2,
    'https://images.unsplash.com/photo-1560468660-6c11a19d7330?auto=format&fit=crop&w=800&q=80'
  );
  const poultryId = await upsertCategory(
    'Poultry',
    'Commercial layers and Kanga (guinea fowl) birds at wholesale prices.',
    3,
    'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80'
  );
  const eggsId = await upsertCategory(
    'Eggs',
    'Fresh eggs in wholesale trays: Big, Medium and Kienyeji.',
    4,
    'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=800&q=80'
  );

  // Dairy goats
  const dairy = [
    { name: '3 Months Old Dairy Goat',       age_stage: '3 months',   price: 3500,  is_featured: true },
    { name: '5 Months Old Dairy Goat',       age_stage: '5 months',   price: 5500 },
    { name: '7 Months Old Dairy Goat',       age_stage: '7 months',   price: 7500 },
    { name: '10 Months Old Dairy Goat',      age_stage: '10 months',  price: 10000 },
    { name: 'First Timer Mother Dairy Goat', age_stage: '1st timer mother', price: 14000, is_featured: true },
    { name: 'Second Timer Mother Dairy Goat',age_stage: '2nd timer mother', price: 12000 },
    { name: 'Ready to Deliver in 2 Weeks',   age_stage: 'Ready in 2 weeks', price: 18000, is_featured: true },
    { name: 'Ready to Deliver in 1 Month',   age_stage: 'Ready in 1 month', price: 16000 },
    { name: 'Male Dairy Goat',               age_stage: 'Male',       price: 10000 },
  ];
  for (const d of dairy) {
    await upsertProduct({
      ...d,
      category_id: goatsId,
      breed: 'Saneen / Alpine / Toggenburg',
      unit: 'each',
      description:
        'Disease free, fully vaccinated & registered. Produces 3 - 4 litres of milk per day. Twin genetics.',
      image_url:
        'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=800&q=80',
      stock: 15,
    });
  }

  // Boer goats
  const boer = [
    { name: 'Boer Goat Kid (up to 5 months)', age_stage: 'Up to 5 months', price: 5500,  is_featured: true },
    { name: 'Young Boer Goat (9 months)',     age_stage: '9 months',        price: 10000 },
    { name: 'Sub-Adult Boer Goat (12 months)',age_stage: '12 months',       price: 13000 },
  ];
  for (const b of boer) {
    await upsertProduct({
      ...b,
      category_id: boerId,
      breed: 'Full Blood Boer',
      unit: 'each',
      description:
        'Full blood Boer goats known for excellent production and robust health. Delivered countrywide within 24hrs.',
      image_url:
        'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
      stock: 10,
    });
  }

  // Poultry - Commercial layers
  const layers = [
    { name: 'Commercial Layer Chick (1-3 days)', age_stage: '1-3 days',   price: 70,  stock: 500 },
    { name: 'Commercial Layer (1 week)',         age_stage: '1 week',      price: 120, stock: 500 },
    { name: 'Commercial Layer (1 month)',        age_stage: '1 month',     price: 200, stock: 300 },
    { name: 'Commercial Layer (2 months)',       age_stage: '2 months',    price: 280, stock: 300 },
    { name: 'Commercial Layer (3 months)',       age_stage: '3 months',    price: 350, stock: 200 },
    { name: 'Commercial Layer (4 months)',       age_stage: '4 months',    price: 420, stock: 200 },
    { name: 'Point of Lay Chicken',              age_stage: 'Point of lay',price: 550, is_featured: true, stock: 150 },
  ];
  for (const l of layers) {
    await upsertProduct({
      ...l,
      category_id: poultryId,
      breed: 'Commercial Layer',
      unit: 'per bird',
      description: 'Healthy commercial layer birds. Free transportation for wholesale orders.',
      image_url:
        'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80',
    });
  }

  // Poultry - Kanga (guinea fowl)
  const kanga = [
    { name: 'Kanga Day-Old Keet',        age_stage: 'Day-old',       price: 150,  stock: 200 },
    { name: 'Kanga Bird (2 weeks)',      age_stage: '2 weeks',       price: 250,  stock: 150 },
    { name: 'Kanga Bird (1 month)',      age_stage: '1 month',       price: 400,  stock: 100 },
    { name: 'Kanga Bird (2 months)',     age_stage: '2 months',      price: 700,  stock: 80 },
    { name: 'Kanga Bird (3 months)',     age_stage: '3 months',      price: 1000, stock: 60 },
    { name: 'Kanga Bird (4 months)',     age_stage: '4 months',      price: 1500, stock: 40 },
    { name: 'Kanga Bird (5 months)',     age_stage: '5 months',      price: 2000, stock: 30, is_featured: true },
    { name: 'Kanga Point of Lay (6-7m)', age_stage: '6-7 months',    price: 2500, stock: 20 },
  ];
  for (const k of kanga) {
    await upsertProduct({
      ...k,
      category_id: poultryId,
      breed: 'Kanga (Guinea Fowl)',
      unit: 'per pair',
      description: 'Kanga (guinea fowl) birds at wholesale prices. Naivasha branch.',
      image_url:
        'https://images.unsplash.com/photo-1518512623468-56aeb0a91e21?auto=format&fit=crop&w=800&q=80',
    });
  }

  // Eggs
  const eggs = [
    { name: 'Big Size Eggs',    age_stage: 'Big',    unit: 'per tray', price: 330, stock: 200, is_featured: true },
    { name: 'Medium Size Eggs', age_stage: 'Medium', unit: 'per tray', price: 300, stock: 200 },
    { name: 'Kienyeji Eggs',    age_stage: 'Kienyeji',unit:'per tray', price: 350, stock: 150, is_featured: true },
    { name: 'Empty Paper Tray',                        unit: 'each',   price: 10,  stock: 1000 },
    { name: 'Empty Plastic Tray',                      unit: 'each',   price: 20,  stock: 500 },
  ];
  for (const e of eggs) {
    await upsertProduct({
      ...e,
      category_id: eggsId,
      description: 'Farm-fresh eggs from Kalro Farm. Wholesale prices.',
      image_url:
        'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=800&q=80',
    });
  }

  console.log('Seed complete.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
