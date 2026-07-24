/**
 * Upsert the agriculture taxonomy: main categories + subcategories.
 * Existing leaf categories (Dairy Goats, Poultry, …) are re-parented under Livestock.
 */
const { query } = require('../db');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function upsertCategory({ name, description, sortOrder, parentId = null, imageUrl = null }) {
  const slug = slugify(name);
  const existing = await query('SELECT id, parent_id FROM categories WHERE slug=$1', [slug]);
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    // Keep existing rows, but ensure parent_id is set when provided
    if (parentId != null && existing.rows[0].parent_id == null) {
      await query(
        `UPDATE categories SET parent_id=$1, updated_at=NOW() WHERE id=$2 AND parent_id IS NULL`,
        [parentId, id]
      );
    }
    return id;
  }
  const r = await query(
    `INSERT INTO categories (name, slug, description, sort_order, image_url, parent_id, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id`,
    [name, slug, description || null, sortOrder || 0, imageUrl, parentId]
  );
  return r.rows[0].id;
}

const TAXONOMY = [
  {
    name: 'Crop Production',
    description: 'Agronomy — cereals, legumes, oilseeds, fiber and sugar crops.',
    sort: 1,
    children: [
      { name: 'Cereals & Grains', description: 'Wheat, rice, maize, barley and other grains.' },
      { name: 'Legumes & Pulses', description: 'Beans, lentils, soybeans and pulses.' },
      { name: 'Oilseeds', description: 'Sunflower, canola, groundnuts and oil crops.' },
      { name: 'Fiber Crops', description: 'Cotton, jute, hemp and fiber plants.' },
      { name: 'Sugar Crops', description: 'Sugarcane, sugar beet and related crops.' },
    ],
  },
  {
    name: 'Horticulture',
    description: 'Fruits, vegetables, flowers and landscape gardening.',
    sort: 2,
    children: [
      { name: 'Fruit Growing', description: 'Pomology — fruit trees and orchards.' },
      { name: 'Vegetable Growing', description: 'Olericulture — vegetables and kitchen gardens.' },
      { name: 'Floriculture', description: 'Flowers and ornamental plants.' },
      { name: 'Landscape Gardening', description: 'Landscape design and ornamental horticulture.' },
    ],
  },
  {
    name: 'Livestock',
    description: 'Animal husbandry — cattle, goats, poultry, bees and more.',
    sort: 3,
    children: [
      // Existing Kalro categories are re-parented below; these fill gaps
      { name: 'Cattle & Dairy Farming', description: 'Dairy and beef cattle.' },
      { name: 'Sheep & Goat Rearing', description: 'Sheep and goats for milk or meat.' },
      { name: 'Pig Farming', description: 'Swine / pig production.' },
      { name: 'Poultry Farming', description: 'Chickens, ducks, turkeys and related birds.' },
      { name: 'Beekeeping', description: 'Apiculture — bees and honey.' },
      { name: 'Rabbit Farming', description: 'Cuniculture — rabbit production.' },
    ],
  },
  {
    name: 'Forestry',
    description: 'Trees, timber and agroforestry systems.',
    sort: 4,
    children: [
      { name: 'Silviculture', description: 'Tree cultivation and forest management.' },
      { name: 'Timber Production', description: 'Timber and wood products.' },
      { name: 'Agroforestry', description: 'Combining trees with crops or livestock.' },
    ],
  },
  {
    name: 'Fisheries & Aquaculture',
    description: 'Freshwater and marine fish and shellfish farming.',
    sort: 5,
    children: [
      { name: 'Freshwater Fish Farming', description: 'Ponds and freshwater aquaculture.' },
      { name: 'Marine Aquaculture', description: 'Saltwater / marine aquaculture.' },
      { name: 'Shellfish & Crustaceans', description: 'Shellfish and crustacean farming.' },
    ],
  },
  {
    name: 'Agricultural Engineering',
    description: 'Machinery, irrigation and post-harvest equipment.',
    sort: 6,
    children: [
      { name: 'Farm Machinery', description: 'Farm machinery and equipment.' },
      { name: 'Irrigation Systems', description: 'Irrigation and water delivery systems.' },
      { name: 'Soil & Water Conservation', description: 'Conservation structures and practices.' },
      { name: 'Post-Harvest Equipment', description: 'Processing and handling equipment.' },
    ],
  },
  {
    name: 'Soil Science & Inputs',
    description: 'Soil fertility, fertilizers, agrochemicals and seeds.',
    sort: 7,
    children: [
      { name: 'Soil Fertility', description: 'Soil fertility management.' },
      { name: 'Fertilizers', description: 'Organic and inorganic fertilizers.' },
      { name: 'Pesticides & Agrochemicals', description: 'Crop protection products.' },
      { name: 'Seed Production', description: 'Certified and farm seed production.' },
    ],
  },
  {
    name: 'Agribusiness',
    description: 'Farm management, marketing, logistics and agri-finance.',
    sort: 8,
    children: [
      { name: 'Farm Management', description: 'Operations and farm business management.' },
      { name: 'Marketing & Trade', description: 'Agricultural marketing and trade.' },
      { name: 'Supply Chain & Logistics', description: 'Storage, transport and logistics.' },
      { name: 'Agri-Finance & Insurance', description: 'Credit, finance and crop insurance.' },
    ],
  },
  {
    name: 'Food Science & Technology',
    description: 'Food processing, preservation and safety.',
    sort: 9,
    children: [
      { name: 'Food Processing', description: 'Value addition and food processing.' },
      { name: 'Food Preservation & Storage', description: 'Preservation and cold chain storage.' },
      { name: 'Food Safety & Quality', description: 'Safety standards and quality control.' },
    ],
  },
  {
    name: 'Biotechnology & Genetics',
    description: 'Plant and animal breeding and genetic improvement.',
    sort: 10,
    children: [
      { name: 'Plant Breeding', description: 'Crop variety improvement.' },
      { name: 'Animal Breeding', description: 'Livestock genetics and breeding.' },
      { name: 'Genetic Engineering', description: 'GMOs and advanced genetics.' },
    ],
  },
];

/** Legacy Kalro leaf categories → reparent under Livestock */
const LEGACY_LIVESTOCK_SLUGS = [
  'dairy-goats',
  'boer-goats',
  'poultry',
  'eggs',
  'cattle',
  'goats',
];

async function seedAgricultureCategories() {
  console.log('Seeding agriculture category taxonomy…');
  const mainIds = {};

  for (const main of TAXONOMY) {
    const id = await upsertCategory({
      name: main.name,
      description: main.description,
      sortOrder: main.sort,
      parentId: null,
    });
    mainIds[main.name] = id;

    for (let i = 0; i < main.children.length; i++) {
      const child = main.children[i];
      await upsertCategory({
        name: child.name,
        description: child.description,
        sortOrder: i + 1,
        parentId: id,
      });
    }
  }

  const livestockId = mainIds.Livestock;
  if (livestockId) {
    for (const slug of LEGACY_LIVESTOCK_SLUGS) {
      await query(
        `UPDATE categories
         SET parent_id = $1, updated_at = NOW()
         WHERE slug = $2 AND (parent_id IS NULL OR parent_id <> $1)
           AND id <> $1`,
        [livestockId, slug]
      );
    }
  }

  console.log('Agriculture categories ready.');
  return mainIds;
}

module.exports = { seedAgricultureCategories, upsertCategory, slugify, TAXONOMY };
