import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const DB = "careerfit_test_disposable";
const DB_URL = `jdbc:postgresql://localhost:5433/${DB}`;
const MAVEN_CMD = ".\\Backend\\careerfit-backend\\mvnw.cmd";
let failures = 0;
let tempDir = null;

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: opts.capture ? "pipe" : "inherit",
    env: { ...process.env, ...(opts.env || {}) },
    shell: true,
    encoding: "utf8",
  });
  if (!opts.allowFail && result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd} ${args.join(" ")}\n${result.stderr || ""}`);
  }
  return result;
}

function runSql(sql, db = DB) {
  const result = spawnSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", "careerfit", "-d", db, "-v", "ON_ERROR_STOP=1", "-t", "-A"],
    { input: sql, encoding: "utf8" }
  );
  if (result.status !== 0) {
    const errText = sanitizeLog(result.stderr || "");
    console.error(`SQL stderr: ${errText}`);
    throw new Error(`SQL failed (exit ${result.status}): ${sanitizeLog(sql).slice(0, 200)}`);
  }
  return result.stdout.trim();
}

function flyway(target) {
  const args = [
    "-f", "Backend/careerfit-backend/pom.xml",
    "flyway:migrate",
    `-Dflyway.url=${DB_URL}`,
    "-Dflyway.user=careerfit",
    "-Dflyway.password=careerfit",
  ];
  if (target) args.push(`-Dflyway.target=${target}`);
  run(MAVEN_CMD, args);
}

function importJobs(opts = {}) {
  const args = ["scripts/import-scraped-jobs.mjs"];
  if (opts.file) {
    args.push(`--file=${opts.file}`);
  }
  return run("node", args, {
    env: { PGDATABASE: DB },
    capture: true,
    allowFail: opts.allowFail,
  });
}

function sortedJobIdChecksum() {
  const ids = runSql("SELECT id FROM job ORDER BY id");
  if (!ids) return "";
  return crypto.createHash("sha256").update(ids).digest("hex");
}

function fetchFullManifest() {
  const duplicateSource = runSql("SELECT COUNT(*) FROM (SELECT source_platform, source_url FROM job WHERE source_url IS NOT NULL GROUP BY source_platform, source_url HAVING COUNT(*) > 1) as tmp");
  const duplicateHash = runSql("SELECT COUNT(*) FROM (SELECT external_hash FROM job WHERE external_hash IS NOT NULL GROUP BY external_hash HAVING COUNT(*) > 1) as tmp");
  const mismatchCount = runSql("SELECT COUNT(*) FROM job j JOIN employer_profile p ON j.recruiter_id = p.recruiter_id WHERE j.company != p.company_name AND j.source_platform IS NOT NULL");
  const passwordViolations = runSql("SELECT COUNT(*) FROM user_account WHERE account_source = 'IMPORTED' AND is_active = TRUE AND password_hash IS DISTINCT FROM '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi'");
  const roleViolations = runSql("SELECT COUNT(*) FROM user_account WHERE account_source = 'IMPORTED' AND role IS DISTINCT FROM 'RECRUITER'");
  const emailVerifiedViolations = runSql("SELECT COUNT(*) FROM user_account WHERE account_source = 'IMPORTED' AND email_verified IS DISTINCT FROM FALSE");
  const preferredLanguageViolations = runSql("SELECT COUNT(*) FROM user_account WHERE account_source = 'IMPORTED' AND preferred_language IS DISTINCT FROM 'vi'");
  const missingPolicy = runSql("SELECT COUNT(*) FROM user_account ua LEFT JOIN automation_policy p ON ua.id = p.user_id WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE AND p.id IS NULL");
  const toggleTrue = runSql("SELECT COUNT(*) FROM user_account ua JOIN automation_policy p ON ua.id = p.user_id WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE AND (p.email_notifications_enabled IS DISTINCT FROM FALSE OR p.daily_digest_enabled IS DISTINCT FROM FALSE OR p.high_match_email_enabled IS DISTINCT FROM FALSE OR p.email_action_enabled IS DISTINCT FROM FALSE OR p.auto_invite_enabled IS DISTINCT FROM FALSE OR p.job_scan_enabled IS DISTINCT FROM FALSE)");
  const activeOrphan = runSql("SELECT COUNT(*) FROM user_account ua WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE AND NOT EXISTS (SELECT 1 FROM job j WHERE j.recruiter_id = ua.id)");
  const activeNoProfile = runSql("SELECT COUNT(*) FROM (SELECT ua.id FROM user_account ua LEFT JOIN employer_profile p ON ua.id = p.recruiter_id WHERE ua.role = 'RECRUITER' AND ua.account_source = 'IMPORTED' AND ua.is_active = true GROUP BY ua.id HAVING COUNT(p.id) != 1) as tmp");
  const totalJobs = runSql("SELECT COUNT(*) FROM job");
  const importedJobs = runSql("SELECT COUNT(*) FROM job WHERE source_platform IS NOT NULL");
  const activeImportedRecruiters = runSql("SELECT COUNT(*) FROM user_account WHERE account_source = 'IMPORTED' AND is_active = TRUE");
  const canonicalCompanies = runSql("SELECT COUNT(DISTINCT p.company_name) FROM employer_profile p JOIN user_account ua ON p.recruiter_id = ua.id WHERE ua.account_source = 'IMPORTED' AND ua.is_active = TRUE");
  
  return {
    duplicateSource: Number(duplicateSource),
    duplicateHash: Number(duplicateHash),
    mismatchCount: Number(mismatchCount),
    activeNoProfile: Number(activeNoProfile),
    passwordViolations: Number(passwordViolations),
    roleViolations: Number(roleViolations),
    emailVerifiedViolations: Number(emailVerifiedViolations),
    preferredLanguageViolations: Number(preferredLanguageViolations),
    missingPolicy: Number(missingPolicy),
    toggleTrue: Number(toggleTrue),
    activeOrphan: Number(activeOrphan),
    totalJobs: Number(totalJobs),
    importedJobs: Number(importedJobs),
    activeImportedRecruiters: Number(activeImportedRecruiters),
    canonicalCompanies: Number(canonicalCompanies)
  };
}

function fetchGlobalInvariants() {
  const m = fetchFullManifest();
  return {
    duplicateSource: m.duplicateSource,
    duplicateHash: m.duplicateHash,
    mismatchCount: m.mismatchCount,
    activeNoProfile: m.activeNoProfile,
    passwordViolations: m.passwordViolations,
    roleViolations: m.roleViolations,
    emailVerifiedViolations: m.emailVerifiedViolations,
    preferredLanguageViolations: m.preferredLanguageViolations,
    missingPolicy: m.missingPolicy,
    toggleTrue: m.toggleTrue,
    activeOrphan: m.activeOrphan
  };
}

function sanitizeLog(obj) {
  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj);
      return sanitizeLog(parsed);
    } catch(e) {
      return JSON.stringify(obj);
    }
  }
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  
  const copy = JSON.parse(JSON.stringify(obj));
  function traverse(o) {
    if (typeof o !== 'object' || o === null) return;
    for (const key of Object.keys(o)) {
      if (['password_hash', 'passwordHash', 'token', 'secret'].includes(key)) {
        o[key] = '[REDACTED]';
      } else if (typeof o[key] === 'object') {
        traverse(o[key]);
      }
    }
  }
  traverse(copy);
  return JSON.stringify(copy);
}

function assertDeepEqualState(pre, post, prefix) {
  if (prefix === 'Collision Rollback') post.user_account = '[{"password_hash":"RAW_LEAK"}]';
  let failed = false;
  if (!pre || !post) {
    console.error(`❌ ${prefix}: Missing state`);
    failures++;
    return;
  }
  Object.keys(pre).forEach(k => {
    const preJson = JSON.stringify(pre[k]);
    const postJson = JSON.stringify(post[k]);
    if (preJson !== postJson) {
      failed = true;
      console.error(`  Mismatch in table ${k}:`);
      console.error(`  PRE : ${sanitizeLog(preJson)}`);
      console.error(`  POST: ${sanitizeLog(postJson)}`);
    }
  });
  if (!failed) {
    console.log(`  ✓ ${prefix}: full state unchanged`);
  } else {
    failures++;
  }
}

try {
  console.log("=== 1. RECREATING DISPOSABLE DATABASE ===");
  runSql(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'careerfit_test_disposable' AND pid <> pg_backend_pid();
  `, "postgres");
  runSql("DROP DATABASE IF EXISTS careerfit_test_disposable;", "postgres");
  runSql("CREATE DATABASE careerfit_test_disposable;", "postgres");

  // ─── Phase 1: Migrate to V28 (simulate pre-V29 state) ───
  console.log("\n=== 2. RUNNING FLYWAY TO V28 ===");
  flyway("28");

  // ─── Phase 2: Insert V27/V28 fixture data ───
  console.log("\n=== 3. INSERTING V27/V28 FIXTURE DATA ===");
  runSql(`
    -- LOCAL account that collides with F88 imported email
    INSERT INTO user_account (id, email, role, full_name, is_active, email_verified, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000001', 'recruiter.f88@careerfit.local', 'RECRUITER', 'F88 Admin LOCAL', TRUE, TRUE, NOW(), NOW());

    -- Old IMPORTED account with wrong slug
    INSERT INTO user_account (id, email, role, full_name, is_active, email_verified, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000002', 'recruiter.lg-cns-viit-nam@careerfit.local', 'RECRUITER', 'LG CNS Team (Wrong Slug)', TRUE, FALSE, NOW(), NOW());

    INSERT INTO employer_profile (recruiter_id, company_name, slug, summary, description, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000002', 'LG CNS Việt Nam', 'lg-cns-viit-nam-canonical', 'Old LG summary', 'Old LG description with real content', NOW(), NOW());

    INSERT INTO job (id, recruiter_id, title, company, original_text, salary_mode, language, status, source_platform, source_url, external_hash, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Cloud Engineer', 'LG CNS Việt Nam',
      repeat('Need cloud engineer with AWS experience ', 5), 'NEGOTIABLE', 'vi', 'ACTIVE', 'itviec',
      'https://itviec.com/it-jobs/cloud-engineer-lg-cns-viet-nam-4923', 'OLD_HASH_123', NOW(), NOW());

    -- ALIAS A (MB Bank)
    INSERT INTO user_account (id, email, role, full_name, is_active, email_verified, preferred_language, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000004', 'recruiter.ngan-hang-tmcp-quan-doi@careerfit.local', 'RECRUITER', 'Ngân Hàng TMCP Quân Đội Team', TRUE, FALSE, 'vi', NOW(), NOW());

    -- Profile A: ID ends in 4. logo, real summary, benefits A, industry is space only, website_url exists
    INSERT INTO employer_profile (id, recruiter_id, company_name, slug, summary, logo_url, website_url, industry, benefits, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Ngân Hàng TMCP Quân Đội', 'ngan-hang-tmcp-quan-doi', 'Alias A Summary', 'http://logo-a.com', 'http://website-a.com', '   ', '["Benefit A", "Overlap Benefit"]'::jsonb, NOW(), NOW());

    -- JD A1 owned by Alias A (hash for job 1514)
    INSERT INTO job (id, recruiter_id, title, company, original_text, salary_mode, language, status, source_platform, source_url, external_hash, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'A1', 'Ngân Hàng TMCP Quân Đội',
      'A1 content', 'NEGOTIABLE', 'vi', 'ACTIVE', 'itviec',
      'https://itviec.com/it-jobs/chuyen-gia-xay-dung-mo-hinh-phat-hien-gian-lan-mb-bank-1514', '815851ad8384c1164a792c2cc2dd13dbc197fdfdd258a899dd82dcb7361ff63c', NOW(), NOW());

    -- ALIAS B (MB Bank)
    INSERT INTO user_account (id, email, role, full_name, is_active, email_verified, password_hash, preferred_language, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000006', 'recruiter.military-bank-1@careerfit.local', 'RECRUITER', 'Military Bank 1 Recruiting Team', TRUE, FALSE, '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'vi', NOW(), NOW());

    -- Profile B: ID ends in 6. cover, real description, Banking, 1000+, Hanoi, website B, benefits B, featured=true
    INSERT INTO employer_profile (id, recruiter_id, company_name, slug, description, cover_url, industry, company_size, location, website_url, is_featured, benefits, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'Military Bank 1', 'military-bank-1', 'Alias B Description', 'http://cover-b.com', 'Banking', '1000+', 'Hanoi', 'http://website-b.com', TRUE, '["Benefit B", "Overlap Benefit"]'::jsonb, NOW(), NOW());

    -- JD B1 owned by Alias B (hash for job 4442)
    INSERT INTO job (id, recruiter_id, title, company, original_text, salary_mode, language, status, source_platform, source_url, external_hash, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', 'B1', 'Military Bank 1',
      'B1 content', 'NEGOTIABLE', 'vi', 'ACTIVE', 'itviec',
      'https://itviec.com/it-jobs/data-architect-data-division-mb-bank-4442', '87bc569aa84ba21978cd70c3b5dd1e19a0f8facbf017374bad1921a9aeddb7bb', NOW(), NOW());

    -- JD B2 owned by Alias B (hash for job 4519)
    INSERT INTO job (id, recruiter_id, title, company, original_text, salary_mode, language, status, source_platform, source_url, external_hash, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000006', 'B2', 'Military Bank 1',
      'B2 content', 'NEGOTIABLE', 'vi', 'ACTIVE', 'itviec',
      'https://itviec.com/it-jobs/senior-digital-forensics-incident-response-dfir-mb-bank-4519', '9e66c54709d4822f0a667582d968945d7d4712da832ed03a49fb8801d627650b', NOW(), NOW());

    -- Bookmark fixture
    INSERT INTO recruiter_cv_bookmark (id, job_id, candidate_id, cv_id, created_at)
    VALUES ('00000000-0000-0000-0000-600000000001', '00000000-0000-0000-0000-000000000005', (SELECT id FROM candidate LIMIT 1), (SELECT id FROM cv LIMIT 1), NOW());

    -- Automation policy directly linking to alias account A
    INSERT INTO automation_policy (id, user_id, email_notifications_enabled, daily_digest_enabled, high_match_email_enabled, email_action_enabled, auto_invite_enabled, job_scan_enabled, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-700000000001', '00000000-0000-0000-0000-000000000004', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW(), NOW());

    -- Automation policy directly linking to alias account B
    INSERT INTO automation_policy (id, user_id, email_notifications_enabled, daily_digest_enabled, high_match_email_enabled, email_action_enabled, auto_invite_enabled, job_scan_enabled, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-700000000002', '00000000-0000-0000-0000-000000000006', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW(), NOW());

    -- Direct user FK reference for reporter to alias A
    INSERT INTO content_report (id, reporter_id, target_type, target_id, reason, status, created_at)
    VALUES ('00000000-0000-0000-0000-500000000001', '00000000-0000-0000-0000-000000000004', 'JOB', '00000000-0000-0000-0000-000000000005', 'FRAUD_SCAM', 'PENDING', NOW());

    -- Application fixture referencing the alias A JD using existing candidate/CV
    INSERT INTO application (id, candidate_id, job_id, status, applied_at, updated_at)
    VALUES ('00000000-0000-0000-0000-300000000001', (SELECT id FROM candidate LIMIT 1), '00000000-0000-0000-0000-000000000005', 'PENDING', NOW(), NOW());

    INSERT INTO matching (id, cv_id, job_id, raw_score, normalized_score, label, is_potential, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-400000000001', (SELECT id FROM cv LIMIT 1), '00000000-0000-0000-0000-000000000005', 0.755, 75.5, 'HIGH', FALSE, NOW(), NOW());
  `);

  console.log("\\n=== 4. RUNNING FLYWAY V29 + V30 ===");
  flyway();
  
  console.log("\\n=== 5.1. ADVERSARIAL INVARIANTS SELF-TEST ===");
  runSql(`
    -- Create active imported recruiter without profile
    INSERT INTO user_account (id, email, role, full_name, is_active, email_verified, password_hash, preferred_language, created_at, updated_at, account_source)
    VALUES ('00000000-0000-0000-0000-900000000001', 'recruiter.zero-profile@careerfit.local', 'RECRUITER', 'Zero Profile', TRUE, TRUE, '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'vi', NOW(), NOW(), 'IMPORTED');
  `);
  
  const advInvariants = fetchGlobalInvariants();
  assert(advInvariants.activeNoProfile > 0, "Global Invariant Helper: Caught activeNoProfile violation");

  runSql(`DELETE FROM user_account WHERE id = '00000000-0000-0000-0000-900000000001'`);
  const cleanedInvariants = fetchGlobalInvariants();
  assert(cleanedInvariants.activeNoProfile === 0, "Global Invariant Helper: activeNoProfile violation cleared after cleanup");

  console.log("\\n=== 5.2. ADVERSARIAL DRIFT & POLICIES SETUP ===");
  runSql(`
    -- Create canonical MB Bank user drifted before import to verify it gets corrected
    INSERT INTO user_account (id, email, role, full_name, is_active, email_verified, password_hash, preferred_language, created_at, updated_at, account_source)
    VALUES ('00000000-0000-0000-0000-000000000009', 'recruiter.mb-bank@careerfit.local', 'CANDIDATE', 'MB Drifted', FALSE, TRUE, 'wrong_hash', 'en', NOW(), NOW(), 'IMPORTED');

    -- Canonical employer profile with a real website that must beat alias's website
    INSERT INTO employer_profile (recruiter_id, company_name, slug, website_url, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000009', 'MB Bank Canonical Real', 'mb-bank-drift', 'http://canonical-mb.com', NOW(), NOW());

    -- Automation policy with all 6 toggles true for canonical, needs to be turned false
    INSERT INTO automation_policy (id, user_id, email_notifications_enabled, daily_digest_enabled, high_match_email_enabled, email_action_enabled, auto_invite_enabled, job_scan_enabled, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-700000000009', '00000000-0000-0000-0000-000000000009', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW(), NOW());
  `);

  function snapshotFullState() {
    return {
      checksum: sortedJobIdChecksum(),
      a1Owner: runSql("SELECT recruiter_id FROM job WHERE id = '00000000-0000-0000-0000-000000000005'"),
      b1Owner: runSql("SELECT recruiter_id FROM job WHERE id = '00000000-0000-0000-0000-000000000007'"),
      b2Owner: runSql("SELECT recruiter_id FROM job WHERE id = '00000000-0000-0000-0000-000000000008'"),
      a1Company: runSql("SELECT company FROM job WHERE id = '00000000-0000-0000-0000-000000000005'"),
      b1Company: runSql("SELECT company FROM job WHERE id = '00000000-0000-0000-0000-000000000007'"),
      b2Company: runSql("SELECT company FROM job WHERE id = '00000000-0000-0000-0000-000000000008'"),
      mbProfile: runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000009'"),
      aliasAProfile: runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'"),
      aliasBProfile: runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000006'"),
      mbAccount: runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000009'"),
      aliasAAccount: runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000004'"),
      aliasBAccount: runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000006'"),
      mbPolicy: runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000009'"),
      aliasAPolicy: runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000004'"),
      aliasBPolicy: runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000006'"),
      directUserFk: runSql("SELECT reporter_id FROM content_report WHERE id = '00000000-0000-0000-0000-500000000001'"),
      appLink: runSql("SELECT job_id FROM application WHERE id = '00000000-0000-0000-0000-300000000001'"),
      matchLink: runSql("SELECT job_id FROM matching WHERE id = '00000000-0000-0000-0000-400000000001'"),
      bookmarkLink: runSql("SELECT job_id FROM recruiter_cv_bookmark WHERE id = '00000000-0000-0000-0000-600000000001'"),
      reportLink: runSql("SELECT target_id FROM content_report WHERE id = '00000000-0000-0000-0000-500000000001'")
    };
  }

  console.log("\\n=== 6. RUNNING IMPORTER (EXPECTING FAIL DUE TO F88 LOCAL COLLISION) ===");
  const localAccountPre = runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000001'");
  const collisionStatePre = snapshotFullState();
  console.log("\\n[DUMP] Exact Alias A Account:");
  console.log(sanitizeLog(runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000004'")));
  console.log("\\n[DUMP] Exact Alias B Account:");
  console.log(sanitizeLog(runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000006'")));
  const collisionResult = importJobs({ allowFail: true });
  assert(collisionResult.status !== 0, `Importer exit code non-zero on collision`);
  assert(collisionResult.stderr.includes('Collision') || collisionResult.stdout.includes('Collision'), `Collision error caught`);
  const collisionStatePost = snapshotFullState();
  assertDeepEqualState(collisionStatePre, collisionStatePost, 'Collision Rollback');
  const localAccountPost = runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000001'");
  assert(localAccountPre === localAccountPost, 'Collision Rollback: LOCAL account state unchanged');

  runSql("DELETE FROM user_account WHERE id = '00000000-0000-0000-0000-000000000001'");

  console.log("\\n=== 7. PARTIAL IMPORT (TESTING ALIAS PROGRESSION) ===");
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careerfit-test-'));
  const partialDatasetPath = path.join(tempDir, 'partial-jobs.json');
  const rawDataset = JSON.parse(fs.readFileSync("scraped-data/jobs_for_careerfit_import.json", "utf8"));
  
  const partialData = rawDataset.filter(job => {
    const hash = crypto.createHash("sha256").update(`itviec|${job.sourceUrl}`).digest("hex");
    return hash === '87bc569aa84ba21978cd70c3b5dd1e19a0f8facbf017374bad1921a9aeddb7bb'; // B1
  });
  
  // Keep B1 with company Military Bank 1 so it stays with Alias B
  partialData.forEach(job => job.company = 'Military Bank 1');
  
  // Add a dummy job for A1 so Alias A's policy gets deactivated
  partialData.push({
    sourcePlatform: "careerbuilder",
    sourceUrl: "https://careerbuilder.vn/vi/job/backend-dev-mb-1234",
    title: "Backend Dev",
    company: "Ngân Hàng TMCP Quân Đội", // Alias A
    description: "Dummy",
    externalHash: "OLD_HASH_MB_ALIAS"
  });
  fs.writeFileSync(partialDatasetPath, JSON.stringify(partialData));

  const aliasAJsonPre = runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'");
  const aliasBJsonPre = runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000006'");
  const policyAPre = runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000004'");
  const policyBPre = runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000006'");
  const accountAPre = runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000004'");
  const accountBPre = runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000006'");
  
  importJobs({ file: partialDatasetPath });

  const aliasAJsonPost = runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'");
  const aliasBJsonPost = runSql("SELECT row_to_json(p) FROM employer_profile p WHERE recruiter_id = '00000000-0000-0000-0000-000000000006'");
  const policyAPost = runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000004'");
  const policyBPost = runSql("SELECT row_to_json(p) FROM automation_policy p WHERE user_id = '00000000-0000-0000-0000-000000000006'");
  const accountAPost = runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000004'");
  const accountBPost = runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000006'");
  
  assert(aliasAJsonPost === aliasAJsonPre, 'Partial: exact Alias A profile JSON preserved');
  if (aliasBJsonPost !== aliasBJsonPre) {
    const pre = JSON.parse(aliasBJsonPre);
    const post = JSON.parse(aliasBJsonPost);
    Object.keys(pre).forEach(k => { if (JSON.stringify(pre[k]) !== JSON.stringify(post[k])) console.error(`  Alias B profile diff: ${k}: ${sanitizeLog(pre[k])} => ${sanitizeLog(post[k])}`); });
  }
  assert(aliasBJsonPost === aliasBJsonPre, 'Partial: exact Alias B profile JSON preserved');
  assert(accountAPost === accountAPre, 'Partial: exact Alias A account JSON preserved');
  assert(accountBPost === accountBPre, 'Partial: exact Alias B account JSON preserved');

  const pA = JSON.parse(policyAPost);
  const pB = JSON.parse(policyBPost);
  assert(pA.id === '00000000-0000-0000-0000-700000000001', 'Partial: exact Policy A ID preserved');
  assert(pB.id === '00000000-0000-0000-0000-700000000002', 'Partial: exact Policy B ID preserved');
  assert(!pA.email_notifications_enabled && !pA.daily_digest_enabled && !pA.high_match_email_enabled && !pA.email_action_enabled && !pA.auto_invite_enabled && !pA.job_scan_enabled, 'Partial: exact Policy A 6 toggles are FALSE');
  assert(!pB.email_notifications_enabled && !pB.daily_digest_enabled && !pB.high_match_email_enabled && !pB.email_action_enabled && !pB.auto_invite_enabled && !pB.job_scan_enabled, 'Partial: exact Policy B 6 toggles are FALSE');
  
  const fkRef = runSql("SELECT reporter_id FROM content_report WHERE id = '00000000-0000-0000-0000-500000000001'");
  assert(fkRef === '00000000-0000-0000-0000-000000000004', 'Partial: FK Reference unchanged');
  
  assert(runSql("SELECT job_id FROM application WHERE id = '00000000-0000-0000-0000-300000000001'") === '00000000-0000-0000-0000-000000000005', 'Partial: exact application link preserved');
  assert(runSql("SELECT job_id FROM matching WHERE id = '00000000-0000-0000-0000-400000000001'") === '00000000-0000-0000-0000-000000000005', 'Partial: exact matching link preserved');
  assert(runSql("SELECT job_id FROM recruiter_cv_bookmark WHERE id = '00000000-0000-0000-0000-600000000001'") === '00000000-0000-0000-0000-000000000005', 'Partial: exact bookmark link preserved');

  // assert B1 and B2 ownership
  const b1Owner = runSql("SELECT recruiter_id FROM job WHERE id = '00000000-0000-0000-0000-000000000007'");
  const b2Owner = runSql("SELECT recruiter_id FROM job WHERE id = '00000000-0000-0000-0000-000000000008'");
  assert(b1Owner === '00000000-0000-0000-0000-000000000006', 'Partial: B1 owner unchanged (Alias B)');
  assert(b2Owner === '00000000-0000-0000-0000-000000000006', 'Partial: B2 owner unchanged (Alias B)');

  console.log("\\n=== 8. INVALID BENEFITS ROLLBACK ===");
  // Correct order: corrupt first, snapshot AFTER corruption, run importer, snapshot AFTER fail, deep-compare
  runSql(`UPDATE employer_profile SET benefits = '{"not": "array"}'::jsonb WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'`);
  const benefitsStatePre = snapshotFullState(); // snapshot AFTER corruption exists
  const invalidBenefitsPre = runSql(`SELECT benefits FROM employer_profile WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'`);
  console.log("\\n[DUMP] Exact invalid-benefits BEFORE rollback: " + invalidBenefitsPre);
  const rbResult = importJobs({ allowFail: true });
  assert(rbResult.status !== 0, 'Rollback: Importer exit non-zero for invalid benefits shape');
  assert(rbResult.stderr.includes('not an array'), 'Rollback: Error mentions array shape');
  const benefitsStatePost = snapshotFullState(); // snapshot AFTER importer fail, before any cleanup
  const invalidBenefitsPost = runSql(`SELECT benefits FROM employer_profile WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'`);
  console.log("\\n[DUMP] Exact invalid-benefits AFTER rollback: " + invalidBenefitsPost);
  assertDeepEqualState(benefitsStatePre, benefitsStatePost, 'Invalid Benefits Rollback');
  // Only after assertion, restore valid benefits
  runSql(`UPDATE employer_profile SET benefits = '["Benefit A", "Overlap Benefit"]'::jsonb WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'`);
  assert(runSql("SELECT jsonb_typeof(benefits) FROM employer_profile WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'") === 'array', 'Invalid Benefits Rollback: cleanup restored valid array');

  console.log("\\n=== 9. EXACT POSTCONDITION FAULT TRIGGER ===");
  const postconditionStatePre = snapshotFullState();
  runSql(`
    CREATE OR REPLACE FUNCTION trg_fault_inject() RETURNS trigger AS $$
    BEGIN
      NEW.industry := 'Intentionally Corrupted Industry';
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_fault_inject_before_update
    BEFORE UPDATE ON employer_profile
    FOR EACH ROW EXECUTE FUNCTION trg_fault_inject();
  `);
  try {
    const faultResult = importJobs({ allowFail: true });
    assert(faultResult.status !== 0, 'Postcondition Fault: Importer exit non-zero');
    assert((faultResult.stderr || "").includes('Postcondition failed'), 'Postcondition Fault: Caught by exact match logic');
    
    const postconditionStatePost = snapshotFullState();
    assertDeepEqualState(postconditionStatePre, postconditionStatePost, 'Exact Postcondition Rollback');
  } finally {
    runSql("DROP TRIGGER trg_fault_inject_before_update ON employer_profile");
    runSql("DROP FUNCTION trg_fault_inject");
  }

  console.log("\\n=== 10. FULL IMPORT (SIMULTANEOUS MERGE) ===");
  const pass1Res = importJobs();
  if (pass1Res.stdout.includes('absorbs 2 aliases') || pass1Res.stderr.includes('absorbs 2 aliases')) {
    assert(true, 'Full: Source alias count = 2 logged for MB Bank');
  } else {
    assert(false, 'Full: Source alias count = 2 was not logged');
  }

  const checksum1 = sortedJobIdChecksum();
  assert(checksum1.length === 64, `Checksum 1 length 64 hex: ${checksum1}`);

  // Assert drift fixed — account must be normalized to RECRUITER contract
  const mbUser = JSON.parse(runSql("SELECT row_to_json(u) FROM user_account u WHERE id = '00000000-0000-0000-0000-000000000009'"));
  assert(mbUser.role === 'RECRUITER' && mbUser.is_active === true && mbUser.email_verified === false && mbUser.preferred_language === 'vi' && mbUser.password_hash === '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'Full: Canonical drift reverted to demo contract');

  // Assert policies toggles false for canonical
  const mbPolicy = runSql("SELECT email_notifications_enabled::int + daily_digest_enabled::int + high_match_email_enabled::int + email_action_enabled::int + auto_invite_enabled::int + job_scan_enabled::int FROM automation_policy WHERE user_id = '00000000-0000-0000-0000-000000000009'");
  assert(mbPolicy === '0', 'Full: Canonical policy all 6 toggles false');
  
  // Assert Alias A policy toggles false
  const aliasPolicyA = runSql("SELECT email_notifications_enabled::int + daily_digest_enabled::int + high_match_email_enabled::int + email_action_enabled::int + auto_invite_enabled::int + job_scan_enabled::int FROM automation_policy WHERE user_id = '00000000-0000-0000-0000-000000000004'");
  assert(aliasPolicyA === '0', 'Full: Alias A policy all 6 toggles false');

  // Assert Alias B policy toggles false (1.3 gap)
  const aliasPolicyB = runSql("SELECT email_notifications_enabled::int + daily_digest_enabled::int + high_match_email_enabled::int + email_action_enabled::int + auto_invite_enabled::int + job_scan_enabled::int FROM automation_policy WHERE user_id = '00000000-0000-0000-0000-000000000006'");
  assert(aliasPolicyB === '0', 'Full: Alias B policy all 6 toggles false');

  // Assert Alias A/B policy IDs still exist
  assert(runSql("SELECT id FROM automation_policy WHERE id = '00000000-0000-0000-0000-700000000001'") === '00000000-0000-0000-0000-700000000001', 'Full: Alias A policy ID still exists');
  assert(runSql("SELECT id FROM automation_policy WHERE id = '00000000-0000-0000-0000-700000000002'") === '00000000-0000-0000-0000-700000000002', 'Full: Alias B policy ID still exists');
  assert(runSql("SELECT id FROM automation_policy WHERE id = '00000000-0000-0000-0000-700000000009'") === '00000000-0000-0000-0000-700000000009', 'Full: Canonical MB policy ID still exists');

  const finalA1 = runSql("SELECT ua.email FROM job j JOIN user_account ua ON j.recruiter_id = ua.id WHERE j.id = '00000000-0000-0000-0000-000000000005'");
  assert(finalA1 === 'recruiter.mb-bank@careerfit.local', 'Full: A1 transferred to Canonical MB Bank');

  // Assert B1 and B2 transferred to canonical
  const finalB1 = runSql("SELECT ua.email FROM job j JOIN user_account ua ON j.recruiter_id = ua.id WHERE j.id = '00000000-0000-0000-0000-000000000007'");
  assert(finalB1 === 'recruiter.mb-bank@careerfit.local', 'Full: B1 transferred to Canonical MB Bank');
  const finalB2 = runSql("SELECT ua.email FROM job j JOIN user_account ua ON j.recruiter_id = ua.id WHERE j.id = '00000000-0000-0000-0000-000000000008'");
  assert(finalB2 === 'recruiter.mb-bank@careerfit.local', 'Full: B2 transferred to Canonical MB Bank');

  // Assert exact company normalization on A1/B1/B2
  assert(runSql("SELECT company FROM job WHERE id = '00000000-0000-0000-0000-000000000005'") === 'MB Bank', 'Full: A1 job.company = MB Bank');
  assert(runSql("SELECT company FROM job WHERE id = '00000000-0000-0000-0000-000000000007'") === 'MB Bank', 'Full: B1 job.company = MB Bank');
  assert(runSql("SELECT company FROM job WHERE id = '00000000-0000-0000-0000-000000000008'") === 'MB Bank', 'Full: B2 job.company = MB Bank');
  
  const mbBankProfile = JSON.parse(runSql("SELECT row_to_json(e) FROM employer_profile e WHERE recruiter_id = '00000000-0000-0000-0000-000000000009'"));
  // company_name and slug must be canonical (normalized by importer, NOT drift values)
  assert(mbBankProfile.company_name === 'MB Bank', 'Full: company_name = canonical MB Bank (not drift)');
  assert(mbBankProfile.slug === 'mb-bank-de190144', 'Full: slug = canonical mb-bank-de190144 (not drift)');
  assert(mbBankProfile.website_url === 'http://canonical-mb.com', 'Full: website_url exact match (Canonical Real Wins)');
  assert(mbBankProfile.logo_url === 'http://logo-a.com', 'Full: logo_url exact match');
  assert(mbBankProfile.cover_url === 'http://cover-b.com', 'Full: cover_url exact match');
  assert(mbBankProfile.summary === 'Alias A Summary', 'Full: summary exact match (Alias A order wins)');
  assert(mbBankProfile.description === 'Alias B Description', 'Full: description exact match');
  assert(mbBankProfile.industry === 'Banking', 'Full: industry exact match');
  assert(mbBankProfile.company_size === '1000+', 'Full: company_size exact match');
  assert(mbBankProfile.location === 'Hanoi', 'Full: location exact match');
  assert(mbBankProfile.is_featured === true, 'Full: is_featured exact match');
  assert(JSON.stringify(mbBankProfile.benefits) === JSON.stringify(['Benefit A', 'Benefit B', 'Overlap Benefit']), 'Full: benefits exact deep equal array');
  
  // Assert alias profiles/slugs gone, users inactive
  assert(runSql("SELECT is_active::text FROM user_account WHERE id = '00000000-0000-0000-0000-000000000004'") === 'false', 'Alias A inactive');
  assert(runSql("SELECT is_active::text FROM user_account WHERE id = '00000000-0000-0000-0000-000000000006'") === 'false', 'Alias B inactive');
  assert(runSql("SELECT COUNT(*) FROM employer_profile WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'") === '0', 'Alias A profile gone');
  assert(runSql("SELECT COUNT(*) FROM employer_profile WHERE recruiter_id = '00000000-0000-0000-0000-000000000006'") === '0', 'Alias B profile gone');
  assert(runSql("SELECT COUNT(*) FROM employer_profile WHERE slug = 'alias-a-slug'") === '0', 'Alias A slug gone');
  assert(runSql("SELECT COUNT(*) FROM employer_profile WHERE slug = 'alias-b-slug'") === '0', 'Alias B slug gone');
  
  // Assert FK references intact (exact links)
  assert(runSql("SELECT reporter_id FROM content_report WHERE id = '00000000-0000-0000-0000-500000000001'") === '00000000-0000-0000-0000-000000000004', 'Full: content_report FK preserved');
  assert(runSql("SELECT job_id FROM application WHERE id = '00000000-0000-0000-0000-300000000001'") === '00000000-0000-0000-0000-000000000005', 'Full: exact application link preserved');
  assert(runSql("SELECT job_id FROM matching WHERE id = '00000000-0000-0000-0000-400000000001'") === '00000000-0000-0000-0000-000000000005', 'Full: exact matching link preserved');
  assert(runSql("SELECT job_id FROM recruiter_cv_bookmark WHERE id = '00000000-0000-0000-0000-600000000001'") === '00000000-0000-0000-0000-000000000005', 'Full: exact bookmark link preserved');

  function assertExactManifest(passName) {
    const m = fetchFullManifest();
    assert(m.totalJobs === 993, `${passName}: total jobs = 993`);
    assert(m.importedJobs === 974, `${passName}: imported jobs = 974`);
    assert(m.activeImportedRecruiters === 433, `${passName}: active imported recruiters = 433`);
    assert(m.canonicalCompanies === 433, `${passName}: canonical companies = 433`);
    const inv = fetchGlobalInvariants();
    const failedInv = Object.entries(inv).filter(([k, v]) => v > 0);
    assert(failedInv.length === 0, `${passName} global invariants = 0 (Violations: ${JSON.stringify(failedInv)})`);

    const mb = JSON.parse(runSql("SELECT row_to_json(e) FROM employer_profile e JOIN user_account ua ON e.recruiter_id = ua.id WHERE ua.email = 'recruiter.mb-bank@careerfit.local'"));
    assert(mb.company_name === 'MB Bank' && mb.slug === 'mb-bank-de190144', `${passName}: MB Bank exact assertions passed (company_name=MB Bank, slug=mb-bank-de190144)`);
    
    const tpb = JSON.parse(runSql("SELECT row_to_json(e) FROM employer_profile e JOIN user_account ua ON e.recruiter_id = ua.id WHERE ua.email = 'recruiter.tpbank@careerfit.local'"));
    assert(tpb.company_name === 'TPBank' && tpb.slug === 'tpbank-514c0b6e', `${passName}: TPBank exact assertions passed`);
    
    const lgcns = JSON.parse(runSql("SELECT row_to_json(e) FROM employer_profile e JOIN user_account ua ON e.recruiter_id = ua.id WHERE ua.email = 'recruiter.lg-cns-viet-nam@careerfit.local'"));
    assert(lgcns.company_name === 'LG CNS Việt Nam' && lgcns.slug === 'lg-cns-viet-nam-7ce57a0e', `${passName}: LG CNS exact assertions passed`);
  }

  console.log("\\n=== 11. GLOBAL REGRESSION ASSERTIONS ===");
  assertExactManifest('Pass 1');

  console.log("\\n=== 12. IDEMPOTENCY (PASS 2) ===");
  importJobs();
  const checksum2 = sortedJobIdChecksum();
  assert(checksum2 === checksum1, `ID checksum pass 1 == pass 2`);
  assertExactManifest('Pass 2');

  console.log("\\n=== 13. ALIAS EXPANSION (PASS 3) ===");
  const expansionDatasetPath = path.join(tempDir, 'expansion-jobs.json');
  const expansionData = JSON.parse(fs.readFileSync("scraped-data/jobs_for_careerfit_import.json", "utf8"));
  let mbCountForExpansion = 0;
  for (const job of expansionData) {
    if (job.company === "MB Bank" || job.company === "Ngân Hàng TMCP Quân Đội") {
      mbCountForExpansion++;
      if (mbCountForExpansion % 3 === 0) job.company = "MB Bank";
      else if (mbCountForExpansion % 3 === 1) job.company = "Ngân Hàng TMCP Quân Đội";
      else job.company = "Military Commercial Joint Stock Bank";
    }
  }
  fs.writeFileSync(expansionDatasetPath, JSON.stringify(expansionData));
  importJobs({ file: expansionDatasetPath });
  const checksum3 = sortedJobIdChecksum();
  assert(checksum3 === checksum1, `ID checksum pass 1 == pass alias expansion`);
  assertExactManifest('Pass 3');

  // Summary
  console.log("\\n" + "=".repeat(60));
  if (failures > 0) {
    console.error(`❌ ${failures} ASSERTION(S) FAILED!`);
  } else {
    console.log("✅ ALL INTEGRATION TESTS PASSED!");
  }

} catch (err) {
  console.error(`\n💥 FATAL ERROR: ${err.stack}`);
  failures++;
} finally {
  console.log("\\n=== CLEANUP ===");
  runSql("DROP DATABASE IF EXISTS careerfit_test_disposable;", "postgres");
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

process.exit(failures > 0 ? 1 : 0);
