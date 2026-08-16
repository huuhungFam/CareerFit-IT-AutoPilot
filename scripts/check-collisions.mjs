import fs from 'fs';
import { normalizeCompanyName, companySlug } from './company-alias-map.mjs';

const rawRows = JSON.parse(fs.readFileSync('scraped-data/jobs_for_careerfit_import.json', 'utf8'));
const canonicalSet = new Set();
for (const row of rawRows) {
  if (!row.company) continue;
  const canonical = normalizeCompanyName(row.company) ?? row.company.trim().replace(/\s+/g, ' ');
  canonicalSet.add(canonical);
}

const slugMap = new Map();
let hasCollision = false;
for (const canonical of canonicalSet) {
  const s = companySlug(canonical);
  if (slugMap.has(s)) {
    console.log('COLLISION:', canonical, 'AND', slugMap.get(s), '->', s);
    hasCollision = true;
  } else {
    slugMap.set(s, canonical);
  }
}
console.log('Checked', canonicalSet.size, 'companies');
if (hasCollision) process.exit(1);
