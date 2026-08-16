import fs from "fs";

const file = "c:\\CODING\\Thesis\\scripts\\test-integration.mjs";
let content = fs.readFileSync(file, "utf8");

// 1. Replace the employer_profile insert in Phase 2
const employerInsertRegex = /-- Employer profile for alias MB Bank account[\s\S]*?NOW\(\), NOW\(\)\);/;
const replacementFixtures = `-- 2 Employer profiles for the SAME alias MB Bank account (simulating V28 duplication before V30)
    -- Profile A: Good summary, logo, website, benefits
    INSERT INTO employer_profile (recruiter_id, company_name, slug, summary, description, logo_url, website_url, benefits, is_featured, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000004', 'Ngân Hàng TMCP Quân Đội', 'ngan-hang-tmcp-quan-doi-canonical', 'MB Bank subsidiary real summary', NULL, 'http://logo.com', 'http://website.com', '["Benefit A"]'::jsonb, FALSE, NOW(), NOW());
    
    -- Profile B: Good description, cover, industry, company size, location, featured
    INSERT INTO employer_profile (recruiter_id, company_name, slug, summary, description, cover_url, industry, company_size, location, is_featured, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000004', 'Ngân Hàng TMCP Quân Đội', 'ngan-hang-tmcp-quan-doi-hash', NULL, 'Important subsidiary real description', 'http://cover.com', 'Banking', '1000+', 'Hanoi', TRUE, NOW(), NOW());

    -- Bookmark fixture
    INSERT INTO recruiter_cv_bookmark (id, job_id, candidate_id, cv_id, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-600000000001', '00000000-0000-0000-0000-000000000005', (SELECT id FROM candidate LIMIT 1), (SELECT id FROM cv LIMIT 1), NOW(), NOW());

    -- Automation policy directly linking to alias account
    INSERT INTO automation_policy (id, user_id, email_notifications_enabled, daily_digest_enabled, high_match_email_enabled, email_action_enabled, auto_invite_enabled, job_scan_enabled, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-700000000001', '00000000-0000-0000-0000-000000000004', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW(), NOW());`;

content = content.replace(employerInsertRegex, replacementFixtures);

// 2. Replace the V30 assertions
const v30Regex = /\/\/ V30: MB Bank alias account profile count[\s\S]*?constraint exists`\);/;
const v30Replacement = `// V30: MB Bank alias account profile count
  const mbAliasProfileCount = runSql("SELECT COUNT(*) FROM employer_profile WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'");
  assert(mbAliasProfileCount === '1', \`V30: MB Bank alias account has exactly 1 profile (got \${mbAliasProfileCount})\`);

  // Assert merged fields
  const mergedProfile = JSON.parse(runSql("SELECT row_to_json(e) FROM employer_profile e WHERE recruiter_id = '00000000-0000-0000-0000-000000000004'"));
  assert(mergedProfile.summary === 'MB Bank subsidiary real summary', "Summary preserved");
  assert(mergedProfile.description === 'Important subsidiary real description', "Description preserved");
  assert(mergedProfile.logo_url === 'http://logo.com', "Logo preserved");
  assert(mergedProfile.cover_url === 'http://cover.com', "Cover preserved");
  assert(mergedProfile.industry === 'Banking', "Industry preserved");
  assert(mergedProfile.company_size === '1000+', "Size preserved");
  assert(mergedProfile.location === 'Hanoi', "Location preserved");
  assert(mergedProfile.website_url === 'http://website.com', "Website preserved");
  assert(JSON.stringify(mergedProfile.benefits) === '["Benefit A"]', "Benefits preserved");
  assert(mergedProfile.is_featured === true, "Featured preserved");

  // V30: Unique constraint real transaction test
  try {
    runSql(\`
      BEGIN;
      INSERT INTO employer_profile (recruiter_id, company_name, slug, created_at, updated_at)
      VALUES ('00000000-0000-0000-0000-000000000004', 'Fail Test', 'fail-test', NOW(), NOW());
      COMMIT;
    \`);
    assert(false, "V30: Insert duplicate profile SHOULD HAVE FAILED");
  } catch (err) {
    runSql("ROLLBACK;"); // Ensure clean state
    assert(err.message.includes("uq_employer_recruiter_id"), "V30: Duplicate profile insert failed correctly due to uq_employer_recruiter_id");
  }`;

content = content.replace(v30Regex, v30Replacement);

// 3. Add Bookmark check in Phase 8 (VERIFYING JD ID AND FK PRESERVATION)
const reportCheckRegex = /assert\(reportExists === '1', `Content report fixture preserved`\);/;
const bookmarkCheck = `assert(reportExists === '1', \`Content report fixture preserved\`);

  const bookmarkExists = runSql("SELECT COUNT(*) FROM recruiter_cv_bookmark WHERE id = '00000000-0000-0000-0000-600000000001' AND job_id = '00000000-0000-0000-0000-000000000005'");
  assert(bookmarkExists === '1', \`Bookmark fixture preserved and linked to same job\`);`;
content = content.replace(reportCheckRegex, bookmarkCheck);

// 4. Add Automation policy check in Phase 9 (VERIFYING ALIAS ACCOUNT HANDLING)
const aliasActiveRegex = /assert\(mbAliasActive === 'f', `MB Bank alias account deactivated`\);/;
const aliasActiveCheck = `assert(mbAliasActive === 'f', \`MB Bank alias account deactivated\`);

  const policyFields = runSql("SELECT email_notifications_enabled::text || ',' || auto_invite_enabled::text FROM automation_policy WHERE user_id = '00000000-0000-0000-0000-000000000004'");
  assert(policyFields === 'f,f', \`MB Bank alias automation policy disabled\`);`;
content = content.replace(aliasActiveRegex, aliasActiveCheck);

// 5. Rewrite Phase 13 to use temp file for alias expansion
const phase13Regex = /\/\/ ─── Phase 13: ALIAS EXPANSION TEST ───[\s\S]*?import 3rd import\n/;
const phase13Replacement = `// ─── Phase 13: ALIAS EXPANSION TEST WITH TEMP DATASET ───
  console.log("\\n=== 13. ALIAS EXPANSION TEST WITH TEMP DATASET ===");
  const sourceDataset = "scraped-data/jobs_for_careerfit_import.json";
  const tempDataset = "scraped-data/temp-alias-jobs.json";
  
  const rawData = JSON.parse(fs.readFileSync(sourceDataset, "utf8"));
  let mbCount = 0;
  for (const job of rawData) {
    if (job.company === "MB Bank" || job.company === "Ngân Hàng TMCP Quân Đội") {
      mbCount++;
      if (mbCount % 3 === 0) job.company = "MB Bank";
      else if (mbCount % 3 === 1) job.company = "Ngân Hàng TMCP Quân Đội";
      else job.company = "Military Commercial Joint Stock Bank";
    }
  }
  fs.writeFileSync(tempDataset, JSON.stringify(rawData));
  
  try {
    run("node", [\`scripts/import-scraped-jobs.mjs --file=\${tempDataset}\`], { env: { PGDATABASE: DB }});
    
    const jobCount3 = runSql("SELECT COUNT(*) FROM job");
    assert(jobCount3 === '993', \`Job count after 3rd import: \${jobCount3} (expected 993)\`);
    
    const checksum3 = sortedJobIdChecksum();
    assert(checksum3 === checksum1, \`Sorted Job ID checksum still same after 3rd import\`);
    
    // Verify ownership of the MB Bank JD
    const mbJobOwner = runSql("SELECT ua.email FROM job j JOIN user_account ua ON j.recruiter_id = ua.id WHERE j.id = '00000000-0000-0000-0000-000000000005'");
    assert(mbJobOwner === 'recruiter.mb-bank@careerfit.local', \`Fixture JD still owned by canonical MB Bank\`);
  } finally {
    if (fs.existsSync(tempDataset)) fs.unlinkSync(tempDataset);
  }
`;

content = content.replace(phase13Regex, phase13Replacement);

// Need to import fs at the top if it's missing
if (!content.includes('import fs from "fs";')) {
    content = content.replace('import { spawnSync }', 'import fs from "fs";\nimport { spawnSync }');
}

fs.writeFileSync(file, content);
console.log("Patched test-integration.mjs");
