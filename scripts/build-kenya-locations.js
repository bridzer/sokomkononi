/**
 * Convert LOCATION.csv → client/public/data/kenya-locations.json
 * Run: node scripts/build-kenya-locations.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'LOCATION.csv');
const outPath = path.join(root, 'client', 'public', 'data', 'kenya-locations.json');

const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const tree = {};

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < 4) continue;
  const [d, div, loc, ...rest] = parts;
  const sub = rest.join(',').trim();
  const D = d.trim();
  const V = div.trim();
  const L = loc.trim();
  const S = sub;
  if (!D || !V || !L || !S) continue;
  tree[D] = tree[D] || {};
  tree[D][V] = tree[D][V] || {};
  tree[D][V][L] = tree[D][V][L] || [];
  if (!tree[D][V][L].includes(S)) tree[D][V][L].push(S);
}

for (const d of Object.keys(tree)) {
  for (const v of Object.keys(tree[d])) {
    for (const l of Object.keys(tree[d][v])) tree[d][v][l].sort();
  }
}

const counties = Object.keys(tree).sort();
const payload = {
  version: 1,
  country: 'KE',
  label: 'Kenya administrative units',
  counties,
  tree,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(`Wrote ${counties.length} districts → ${outPath}`);
