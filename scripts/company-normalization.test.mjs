/**
 * company-normalization.test.mjs
 *
 * Unit tests cho company normalization (company-alias-map.mjs)
 * Chạy: node scripts/company-normalization.test.mjs
 */

import { normalizeCompanyName, companySlug, recruiterEmail, analyzeAliases, ALIAS_GROUPS } from "./company-alias-map.mjs";

let passed = 0;
let failed = 0;

function assert(description, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}${detail ? ": " + detail : ""}`);
    failed++;
  }
}

function assertEqual(description, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    console.error(`      actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ─── Test group 1: MB Bank aliases ─────────────────────────────────────────
console.log("\n[1] MB Bank aliases");
assertEqual("MB Bank → MB Bank", normalizeCompanyName("MB Bank"), "MB Bank");
assertEqual("Ngân Hàng TMCP Quân Đội → MB Bank",
  normalizeCompanyName("Ngân Hàng TMCP Quân Đội"), "MB Bank");
assertEqual("Military Commercial Joint Stock Bank → MB Bank",
  normalizeCompanyName("Military Commercial Joint Stock Bank"), "MB Bank");
assertEqual("Công Ty Quản Lý Nợ... → MB Bank",
  normalizeCompanyName("Công Ty Quản Lý Nợ Và Khai Thác Tài Sản - Ngân Hàng TMCP Quân Đội"), "MB Bank");
assertEqual("MBV → MB Bank",
  normalizeCompanyName("Ngân hàng TNHH MTV Việt Nam Hiện Đại (MBV)"), "MB Bank");
assertEqual("NGÂN HÀNG TRÁCH NHIỆM HỮU HẠN... → MB Bank",
  normalizeCompanyName("NGÂN HÀNG TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN VIỆT NAM HIỆN ĐẠI"), "MB Bank");
assertEqual("MB Ageas → MB Bank",
  normalizeCompanyName("CÔNG TY TNHH BẢO HIỂM NHÂN THỌ MB AGEAS"), "MB Bank");

// ─── Test group 2: TPBank aliases ──────────────────────────────────────────
console.log("\n[2] TPBank aliases");
assertEqual("TPBank → TPBank", normalizeCompanyName("TPBank"), "TPBank");
assertEqual("Ngân Hàng TMCP Tiên Phong (TPBank) → TPBank",
  normalizeCompanyName("Ngân Hàng TMCP Tiên Phong (TPBank)"), "TPBank");
assertEqual("Ngân hàng TMCP Tiên Phong | TPBank → TPBank",
  normalizeCompanyName("Ngân hàng TMCP Tiên Phong | TPBank"), "TPBank");

// ─── Test group 3: Whitespace / case normalization ──────────────────────────
console.log("\n[3] Whitespace and case normalization");
assertEqual("Leading/trailing spaces stripped",
  normalizeCompanyName("  MB Bank  "), "MB Bank");
// "MB  Bank" (double space) → cleaned = "MB Bank" → key = "mb bank" → matches "MB Bank"
// This is CORRECT behavior: whitespace normalization allows alias matching
const mbBankSpaced = normalizeCompanyName("MB  Bank");
assertEqual("MB  Bank (extra space) → MB Bank (via normalize key)",
  mbBankSpaced, "MB Bank");

assertEqual("Null input → null", normalizeCompanyName(null), null);
assertEqual("Empty string → null", normalizeCompanyName(""), null);
assertEqual("Whitespace only → null", normalizeCompanyName("   "), null);

// ─── Test group 4: Unknown companies preserved ─────────────────────────────
console.log("\n[4] Unknown companies preserved");
assertEqual("Unknown company returns itself",
  normalizeCompanyName("SomeBrandNewCompany XYZ"), "SomeBrandNewCompany XYZ");
assertEqual("Company with special chars returned as-is",
  normalizeCompanyName("FPT Software"), "FPT Software");
assertEqual("Vietnamese company returned as-is",
  normalizeCompanyName("Công ty TNHH Viettel - CHT"), "Công ty TNHH Viettel - CHT");

// ─── Test group 5: companySlug deterministic and safe ──────────────────────
console.log("\n[5] companySlug");
assertEqual("MB Bank → mb-bank", companySlug("MB Bank"), "mb-bank");
assertEqual("TPBank → tpbank", companySlug("TPBank"), "tpbank");
assertEqual("VPBank → vpbank", companySlug("VPBank"), "vpbank");
assertEqual("Ngân hàng TMCP preserved", companySlug("Techcombank"), "techcombank");
assertEqual("Vietnamese chars transliterated",
  companySlug("Ngân Hàng"), "ngan-hang");
assertEqual("No leading/trailing hyphens",
  companySlug(" - MB Bank - "), "mb-bank");

// ─── Test group 6: recruiterEmail ──────────────────────────────────────────
console.log("\n[6] recruiterEmail");
assertEqual("MB Bank email", recruiterEmail("MB Bank"), "recruiter.mb-bank@careerfit.local");
assertEqual("TPBank email", recruiterEmail("TPBank"), "recruiter.tpbank@careerfit.local");
assertEqual("VPBank email", recruiterEmail("VPBank"), "recruiter.vpbank@careerfit.local");

// ─── Test group 7: No slug collision between canonical companies ────────────
console.log("\n[7] Slug/email uniqueness check");
const slugs = new Set();
const emailSet = new Set();
let hasCollision = false;
for (const [canonical] of ALIAS_GROUPS) {
  const slug = companySlug(canonical);
  const email = recruiterEmail(canonical);
  if (slugs.has(slug)) {
    console.error(`  ✗ SLUG COLLISION: "${canonical}" → "${slug}"`);
    hasCollision = true;
    failed++;
  } else {
    slugs.add(slug);
  }
  if (emailSet.has(email)) {
    console.error(`  ✗ EMAIL COLLISION: "${canonical}" → "${email}"`);
    hasCollision = true;
    failed++;
  } else {
    emailSet.add(email);
  }
}
if (!hasCollision) {
  console.log(`  ✓ No slug/email collisions among ${ALIAS_GROUPS.length} canonical groups`);
  passed++;
}

// ─── Test group 8: analyzeAliases ──────────────────────────────────────────
console.log("\n[8] analyzeAliases");
const sampleRawCompanies = [
  "MB Bank",
  "Ngân Hàng TMCP Quân Đội",  // alias of MB Bank
  "TPBank",
  "Ngân hàng TMCP Tiên Phong | TPBank",  // alias of TPBank
  "FPT Software",  // no alias
  "KMS Technology", // no alias
];

const analysis = analyzeAliases(sampleRawCompanies);
assertEqual("rawCount = 6 distinct", analysis.rawCount, 6);
assertEqual("canonicalCount = 4 (MB Bank, TPBank, FPT Software, KMS Technology)", analysis.canonicalCount, 4);
assertEqual("mergedCount = 2", analysis.mergedCount, 2);
assert("groups array has 2 entries", analysis.groups.length === 2);

// ─── Test group 9: Alias map self-consistency ───────────────────────────────
console.log("\n[9] Alias map self-consistency");
let mapConsistent = true;
for (const [canonical, aliases] of ALIAS_GROUPS) {
  for (const alias of aliases) {
    const result = normalizeCompanyName(alias);
    if (result !== canonical) {
      console.error(`  ✗ Alias "${alias}" expected "${canonical}" but got "${result}"`);
      mapConsistent = false;
      failed++;
    }
  }
}
if (mapConsistent) {
  console.log(`  ✓ All aliases in ALIAS_GROUPS correctly resolve to their canonical`);
  passed++;
}

// ─── Test group 10: TPIsoftware NOT confused with TPBank ───────────────────
console.log("\n[10] Non-alias safety checks");
const tpiResult = normalizeCompanyName("TPIsoftware Co., Ltd");
assert("TPIsoftware is NOT TPBank", tpiResult !== "TPBank",
  `got: ${tpiResult}`);
assertEqual("TPIsoftware preserved as-is", tpiResult, "TPIsoftware Co., Ltd");

const feResult = normalizeCompanyName("FE CREDIT");
assert("FE CREDIT is NOT VPBank", feResult !== "VPBank",
  `got: ${feResult}`);
assertEqual("FE CREDIT preserved as-is", feResult, "FE CREDIT");

const shinhanDs = normalizeCompanyName("SHINHAN DS");
const shinhanFin = normalizeCompanyName("Shinhan Finance Vietnam");
assert("SHINHAN DS != Shinhan Finance (different entities)", shinhanDs !== shinhanFin);

// ─── Summary ────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
console.log(`Test results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("All tests passed.");
