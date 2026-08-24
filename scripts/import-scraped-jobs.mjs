import fs from "node:fs";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import {
  analyzeAliases,
  companySlug,
  normalizeCompanyName,
  recruiterEmail,
} from "./company-alias-map.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const dataPath = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length)
  ?? "scraped-data/jobs_for_careerfit_import.json";

const rawRows = JSON.parse(fs.readFileSync(dataPath, "utf8"));
if (!Array.isArray(rawRows)) {
  throw new Error(`Expected ${dataPath} to contain a JSON array`);
}

const allowedSalaryModes = new Set(["NEGOTIABLE", "RANGE", "UP_TO", "FROM", "HIDDEN"]);
const allowedSalaryTypes = new Set(["MONTHLY", "HOURLY", "YEARLY"]);
const seen = new Set();
const stats = {
  raw: rawRows.length,
  missingRequired: 0,
  duplicates: 0,
  imported: 0,
  salaryUnknownNormalized: 0,
  bySource: new Map(),
  byDomain: new Map(),
};

function inc(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function cleanString(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).replace(/\u0000/g, "").trim();
  return normalized || fallback;
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanString(item)).filter(Boolean))].slice(0, 40);
}

function normalizeSalary(row) {
  let mode = cleanString(row.salaryMode, "NEGOTIABLE").toUpperCase();
  let min = numberOrNull(row.salaryMin);
  let max = numberOrNull(row.salaryMax);
  let currency = cleanString(row.salaryCurrency, "VND").toUpperCase();
  let type = cleanString(row.salaryType, "MONTHLY").toUpperCase();
  let visible = Boolean(row.salaryIsVisible);
  let display = cleanString(row.salaryDisplayText);

  if (currency === "UNKNOWN") currency = "VND";
  if (!allowedSalaryTypes.has(type)) type = "MONTHLY";

  if (!allowedSalaryModes.has(mode)) {
    stats.salaryUnknownNormalized++;
    if (min !== null && max !== null) mode = "RANGE";
    else if (max !== null) mode = "UP_TO";
    else if (min !== null) mode = "FROM";
    else mode = "NEGOTIABLE";
  }

  if (mode === "RANGE" && (min === null || max === null)) mode = min !== null ? "FROM" : max !== null ? "UP_TO" : "NEGOTIABLE";
  if (mode === "UP_TO" && max === null) mode = min !== null ? "FROM" : "NEGOTIABLE";
  if (mode === "FROM" && min === null) mode = max !== null ? "UP_TO" : "NEGOTIABLE";
  if (mode === "NEGOTIABLE" || mode === "HIDDEN") {
    min = null;
    max = null;
  }

  if (min !== null && max !== null && min > max) {
    [min, max] = [max, min];
  }

  if ((mode === "NEGOTIABLE" || mode === "HIDDEN") && (!display || display === "CareerMap")) {
    display = "Thỏa thuận";
    visible = false;
  }

  return {
    salaryMode: mode,
    salaryMin: min,
    salaryMax: max,
    salaryCurrency: currency,
    salaryType: type,
    salaryIsVisible: visible && mode !== "HIDDEN",
    salaryDisplayText: display,
  };
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function hashFor(row) {
  // Import identity must not depend on a mutable display name.  A source URL is
  // the stable identity supplied by both crawlers; the fallback only serves
  // malformed legacy rows that have no URL.
  const identity = row.sourceUrl
    ? `${row.source}|${row.sourceUrl.trim()}`
    : `${row.source}|${row.title.toLowerCase()}|${row.company.toLowerCase()}`;
  return crypto
    .createHash("sha256")
    .update(identity)
    .digest("hex");
}

function normalizeRow(row) {
  const title = cleanString(row.title);
  const rawCompany = cleanString(row.company);
  const company = normalizeCompanyName(rawCompany);
  const originalText = cleanString(row.originalText);
  if (!title || !company || !originalText || originalText.length < 80) {
    stats.missingRequired++;
    return null;
  }

  const salary = normalizeSalary(row);
  const source = cleanString(row.source, "unknown").toLowerCase();
  const domain = cleanString(row.domain, "OTHER").toUpperCase();
  const language = cleanString(row.language, "vi").toLowerCase();
  const normalized = {
    title: title.slice(0, 255),
    company: company.slice(0, 255),
    canonicalSlug: companySlug(company),
    // Employer slugs share a global namespace with seeded/local profiles.  Keep
    // the canonical slug as the source and add a deterministic imported suffix
    // so an imported company can never claim a local profile's public route.
    profileSlug: `${companySlug(company).slice(0, 240)}-imported`,
    recruiterEmail: recruiterEmail(company),
    originalText,
    requiredSkills: cleanList(row.requiredSkills),
    niceToHaveSkills: cleanList(row.niceToHaveSkills),
    seniorityLevel: cleanString(row.seniorityLevel, "UNKNOWN")?.toUpperCase().slice(0, 50),
    employmentType: normalizeEmploymentType(row.employmentType),
    location: cleanString(row.location, "Vietnam").slice(0, 255),
    remoteType: normalizeRemoteType(row.remoteType),
    domain: domain.slice(0, 100),
    language: ["vi", "en", "mixed"].includes(language) ? language : "vi",
    source,
    sourceUrl: cleanString(row.sourceUrl)?.slice(0, 1000),
    scrapedAt: cleanString(row.scrapedAt),
    ...salary,
  };

  normalized.externalHash = hashFor(normalized);
  return normalized;
}

function normalizeEmploymentType(value) {
  const type = cleanString(value, "FULL_TIME").toUpperCase();
  if (type === "FULL_TIME" || type === "PART_TIME" || type === "CONTRACT" || type === "INTERNSHIP") return type;
  if (type === "INTERN") return "INTERNSHIP";
  return "FULL_TIME";
}

function normalizeRemoteType(value) {
  const type = cleanString(value, "ONSITE").toUpperCase();
  if (type === "REMOTE" || type === "HYBRID" || type === "ONSITE") return type;
  return "ONSITE";
}

const rows = [];
for (const raw of rawRows) {
  const row = normalizeRow(raw);
  if (!row) continue;
  if (seen.has(row.externalHash)) {
    stats.duplicates++;
    continue;
  }
  seen.add(row.externalHash);
  rows.push(row);
  inc(stats.bySource, row.source);
  inc(stats.byDomain, row.domain);
}
stats.imported = rows.length;

const aliasAnalysis = analyzeAliases(rows.map((row) => row.company));
if (aliasAnalysis.canonicalCount !== new Set(rows.map((row) => row.canonicalSlug)).size) {
  throw new Error("Canonical company slug collision detected before import.");
}

printStats();

if (dryRun) {
  process.exit(0);
}

const sql = buildSql(rows);
const result = spawnSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "careerfit", "-d", "careerfit"], {
  input: sql,
  encoding: "utf8",
  cwd: process.cwd(),
  maxBuffer: 1024 * 1024 * 50,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

function buildSql(importRows) {
  const lines = [];
  lines.push("\\set ON_ERROR_STOP on");
  lines.push("BEGIN;");
  lines.push("CREATE TEMP TABLE scraped_job_stage_raw (payload_base64 text NOT NULL) ON COMMIT DROP;");
  lines.push("CREATE TEMP TABLE scraped_job_stage (payload jsonb NOT NULL) ON COMMIT DROP;");
  lines.push("COPY scraped_job_stage_raw(payload_base64) FROM STDIN;");
  for (const row of importRows) {
    lines.push(Buffer.from(JSON.stringify(row), "utf8").toString("base64"));
  }
  lines.push("\\.");
  lines.push("INSERT INTO scraped_job_stage(payload) SELECT convert_from(decode(payload_base64, 'base64'), 'UTF8')::jsonb FROM scraped_job_stage_raw;");
  lines.push(`
WITH companies AS (
    SELECT DISTINCT
        payload->>'company' AS company,
        payload->>'canonicalSlug' AS canonical_slug,
        payload->>'profileSlug' AS profile_slug,
        payload->>'recruiterEmail' AS recruiter_email
    FROM scraped_job_stage
),
upsert_users AS (
    INSERT INTO user_account (
        email, role, full_name, password_hash, is_active, email_verified,
        preferred_language, account_source, created_at, updated_at
    )
    SELECT
        recruiter_email,
        'RECRUITER',
        company || ' Recruiting Team',
        '$2a$10$IXfEB8pLaeAUqwZ8ftZUC.KMl9FoaUGNn5pB5sinVpjyki/oj1unm',
        TRUE,
        TRUE,
        'vi',
        'IMPORTED',
        NOW(),
        NOW()
    FROM companies
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        is_active = TRUE,
        email_verified = TRUE,
        preferred_language = 'vi',
        account_source = 'IMPORTED',
        updated_at = NOW()
    RETURNING id, email
),
company_users AS (
    SELECT
        c.company,
        c.canonical_slug,
        c.profile_slug,
        c.recruiter_email,
        u.id AS recruiter_id
    FROM companies c
    JOIN upsert_users u
      ON u.email = c.recruiter_email
),
upsert_employers AS (
    INSERT INTO employer_profile (
        recruiter_id, company_name, slug, summary, description, industry,
        company_size, location, website_url, benefits, is_featured, created_at, updated_at
    )
    SELECT
        recruiter_id,
        company,
        profile_slug,
        'Imported from scraped Vietnamese IT job postings.',
        'This employer profile was generated from scraped job data to make CareerFit demo data closer to real market supply.',
        'Technology',
        'UNKNOWN',
        'Vietnam',
        NULL,
        '[]'::jsonb,
        FALSE,
        NOW(),
        NOW()
    FROM company_users
    ON CONFLICT (recruiter_id) DO UPDATE
    SET company_name = EXCLUDED.company_name,
        slug = EXCLUDED.slug,
        updated_at = NOW()
),
upsert_policies AS (
    INSERT INTO automation_policy (
        user_id, auto_apply_enabled, auto_invite_enabled, daily_digest_enabled,
        job_scan_enabled, high_match_email_enabled, email_action_enabled,
        email_notifications_enabled, demo_mode_enabled, created_at, updated_at
    )
    SELECT recruiter_id, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, NOW(), NOW()
    FROM company_users
    ON CONFLICT (user_id) DO UPDATE
    SET updated_at = NOW()
),
normalized_jobs AS (
    SELECT
        cu.recruiter_id,
        s.payload
    FROM scraped_job_stage s
    JOIN company_users cu ON cu.company = s.payload->>'company'
)
INSERT INTO job (
    recruiter_id,
    title,
    company,
    original_text,
    required_skills,
    nice_to_have_skills,
    seniority_level,
    employment_type,
    location,
    remote_type,
    domain,
    salary_mode,
    salary_min,
    salary_max,
    salary_currency,
    salary_type,
    salary_is_visible,
    salary_display_text,
    language,
    status,
    source_platform,
    source_url,
    source_type,
    scraped_at,
    external_hash,
    created_at,
    updated_at
)
SELECT
    recruiter_id,
    payload->>'title',
    payload->>'company',
    payload->>'originalText',
    COALESCE(payload->'requiredSkills', '[]'::jsonb),
    COALESCE(payload->'niceToHaveSkills', '[]'::jsonb),
    payload->>'seniorityLevel',
    payload->>'employmentType',
    payload->>'location',
    payload->>'remoteType',
    payload->>'domain',
    payload->>'salaryMode',
    NULLIF(payload->>'salaryMin', '')::numeric,
    NULLIF(payload->>'salaryMax', '')::numeric,
    payload->>'salaryCurrency',
    payload->>'salaryType',
    COALESCE((payload->>'salaryIsVisible')::boolean, FALSE),
    payload->>'salaryDisplayText',
    payload->>'language',
    'ACTIVE',
    payload->>'source',
    payload->>'sourceUrl',
    'IMPORTED',
    NULLIF(payload->>'scrapedAt', '')::timestamptz,
    payload->>'externalHash',
    NOW(),
    NOW()
FROM normalized_jobs
ON CONFLICT (external_hash) WHERE external_hash IS NOT NULL DO UPDATE
SET recruiter_id = EXCLUDED.recruiter_id,
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    original_text = EXCLUDED.original_text,
    required_skills = EXCLUDED.required_skills,
    nice_to_have_skills = EXCLUDED.nice_to_have_skills,
    seniority_level = EXCLUDED.seniority_level,
    employment_type = EXCLUDED.employment_type,
    location = EXCLUDED.location,
    remote_type = EXCLUDED.remote_type,
    domain = EXCLUDED.domain,
    salary_mode = EXCLUDED.salary_mode,
    salary_min = EXCLUDED.salary_min,
    salary_max = EXCLUDED.salary_max,
    salary_currency = EXCLUDED.salary_currency,
    salary_type = EXCLUDED.salary_type,
    salary_is_visible = EXCLUDED.salary_is_visible,
    salary_display_text = EXCLUDED.salary_display_text,
    language = EXCLUDED.language,
    source_platform = EXCLUDED.source_platform,
    source_url = EXCLUDED.source_url,
    source_type = 'IMPORTED',
    scraped_at = EXCLUDED.scraped_at,
    updated_at = NOW();
COMMIT;

SELECT source_platform, COUNT(*) AS jobs
FROM job
WHERE external_hash IS NOT NULL
GROUP BY source_platform
ORDER BY source_platform;
`);
  return `${lines.join("\n")}\n`;
}

function printStats() {
  console.log(`Raw rows: ${stats.raw}`);
  console.log(`Import rows after filtering: ${stats.imported}`);
  console.log(`Skipped missing required fields: ${stats.missingRequired}`);
  console.log(`Skipped duplicates: ${stats.duplicates}`);
  console.log(`Normalized UNKNOWN salaryMode rows: ${stats.salaryUnknownNormalized}`);
  console.log(`By source: ${JSON.stringify(Object.fromEntries(stats.bySource))}`);
  console.log(`By domain: ${JSON.stringify(Object.fromEntries(stats.byDomain))}`);
}
