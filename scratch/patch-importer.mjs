import fs from "fs";

const file = "c:\\CODING\\Thesis\\scripts\\import-scraped-jobs.mjs";
let content = fs.readFileSync(file, "utf8");

// Remove everything from line 248 ("WITH companies AS (") down to line 471 ("COMMIT;")
const startIdx = content.indexOf("WITH companies AS (");
const endIdx = content.indexOf("COMMIT;", startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find patch bounds");
    process.exit(1);
}

const replacement = `CREATE TEMP TABLE temp_canonical_mapping ON COMMIT DROP AS
WITH companies AS (
    SELECT DISTINCT
        payload->>'company' AS company,
        payload->>'canonicalSlug' AS canonical_slug,
        payload->>'recruiterEmail' AS recruiter_email,
        md5(payload->>'canonicalSlug') AS company_hash
    FROM scraped_job_stage
),
upsert_users AS (
    INSERT INTO user_account (
        email, role, full_name, password_hash, is_active, email_verified, preferred_language, created_at, updated_at, account_source
    )
    SELECT
        recruiter_email,
        'RECRUITER',
        company || ' Recruiting Team',
        '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi',
        TRUE,
        FALSE,
        'vi',
        NOW(),
        NOW(),
        'IMPORTED'
    FROM companies
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        is_active = TRUE,
        password_hash = '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi',
        account_source = 'IMPORTED',
        updated_at = NOW()
    RETURNING id, email
),
company_users AS (
    SELECT
        c.company,
        c.company_hash,
        c.canonical_slug,
        u.id AS recruiter_id
    FROM companies c
    JOIN upsert_users u ON u.email = c.recruiter_email
),
upsert_employers AS (
    INSERT INTO employer_profile (
        recruiter_id, company_name, slug, summary, description, industry,
        company_size, location, website_url, benefits, is_featured, created_at, updated_at
    )
    SELECT
        recruiter_id,
        company,
        canonical_slug || '-' || left(company_hash, 8),
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
    WHERE employer_profile.company_name IS DISTINCT FROM EXCLUDED.company_name
       OR employer_profile.slug IS DISTINCT FROM EXCLUDED.slug
)
SELECT company, canonical_slug, recruiter_id FROM company_users;

-- Define transfer map
CREATE TEMP TABLE temp_job_transfer_map ON COMMIT DROP AS
SELECT DISTINCT
    s.payload->>'externalHash' AS external_hash,
    j.recruiter_id AS old_recruiter_id,
    c.recruiter_id AS canonical_recruiter_id
FROM scraped_job_stage s
JOIN temp_canonical_mapping c ON c.company = s.payload->>'company'
JOIN job j ON j.external_hash = s.payload->>'externalHash'
JOIN user_account ua ON j.recruiter_id = ua.id
WHERE ua.account_source = 'IMPORTED'
  AND j.recruiter_id != c.recruiter_id;

-- Fail if same old maps to > 1 canonical
DO $$
DECLARE
    bad_old_id UUID;
BEGIN
    SELECT old_recruiter_id INTO bad_old_id
    FROM temp_job_transfer_map
    GROUP BY old_recruiter_id
    HAVING COUNT(DISTINCT canonical_recruiter_id) > 1
    LIMIT 1;

    IF bad_old_id IS NOT NULL THEN
        RAISE EXCEPTION 'Collision: old recruiter % maps to multiple canonical recruiters', bad_old_id;
    END IF;
END $$;

WITH normalized_jobs AS (
    SELECT cu.recruiter_id, s.payload
    FROM scraped_job_stage s
    JOIN temp_canonical_mapping cu ON cu.company = s.payload->>'company'
),
upsert_jobs AS (
    INSERT INTO job (
        recruiter_id, title, company, original_text, required_skills, nice_to_have_skills, seniority_level, employment_type, location, remote_type, domain, salary_mode, salary_min, salary_max, salary_currency, salary_type, salary_is_visible, salary_display_text, language, status, is_urgent, source_platform, source_url, scraped_at, external_hash, created_at, updated_at
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
        (
            LOWER(COALESCE(payload->>'title', '')) LIKE ANY (ARRAY[
                '%cần tuyển gấp%', '%can tuyen gap%', '%tuyển gấp%', '%tuyen gap%',
                '%urgent hiring%', '%urgently hiring%', '%immediate start%', '%join immediately%'
            ])
            OR LOWER(COALESCE(payload->>'originalText', '')) LIKE ANY (ARRAY[
                '%cần tuyển gấp%', '%can tuyen gap%', '%tuyển gấp%', '%tuyen gap%',
                '%đi làm ngay%', '%di lam ngay%', '%nhận việc ngay%', '%nhan viec ngay%',
                '%urgent hiring%', '%urgently hiring%', '%immediate start%', '%join immediately%'
            ])
        ),
        payload->>'source',
        payload->>'sourceUrl',
        NULLIF(payload->>'scrapedAt', '')::timestamptz,
        payload->>'externalHash',
        NOW(),
        NOW()
    FROM normalized_jobs
    ON CONFLICT (external_hash) WHERE external_hash IS NOT NULL DO UPDATE
    SET title = EXCLUDED.title,
        company = EXCLUDED.company,
        recruiter_id = EXCLUDED.recruiter_id,
        tfidf_vector = CASE
            WHEN job.original_text IS DISTINCT FROM EXCLUDED.original_text THEN NULL
            ELSE job.tfidf_vector
        END,
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
        is_urgent = EXCLUDED.is_urgent,
        source_platform = EXCLUDED.source_platform,
        source_url = EXCLUDED.source_url,
        scraped_at = EXCLUDED.scraped_at,
        updated_at = NOW()
    RETURNING id
)
SELECT COUNT(*) FROM upsert_jobs;

-- Find orphaned aliases
CREATE TEMP TABLE temp_orphan_aliases ON COMMIT DROP AS
SELECT DISTINCT m.old_recruiter_id, m.canonical_recruiter_id
FROM temp_job_transfer_map m
WHERE NOT EXISTS (SELECT 1 FROM job j WHERE j.recruiter_id = m.old_recruiter_id);

-- Merge profiles for orphaned aliases
UPDATE employer_profile canonical
SET
    logo_url = COALESCE(canonical.logo_url, alias.logo_url),
    cover_url = COALESCE(canonical.cover_url, alias.cover_url),
    summary = COALESCE(canonical.summary, alias.summary),
    description = COALESCE(canonical.description, alias.description),
    industry = COALESCE(canonical.industry, alias.industry),
    company_size = COALESCE(canonical.company_size, alias.company_size),
    location = COALESCE(canonical.location, alias.location),
    website_url = COALESCE(canonical.website_url, alias.website_url),
    benefits = CASE 
        WHEN canonical.benefits IS NULL OR canonical.benefits = '[]'::jsonb THEN alias.benefits
        ELSE canonical.benefits
    END,
    is_featured = canonical.is_featured OR alias.is_featured,
    updated_at = NOW()
FROM temp_orphan_aliases o
JOIN employer_profile alias ON alias.recruiter_id = o.old_recruiter_id
WHERE canonical.recruiter_id = o.canonical_recruiter_id;

-- Delete orphaned alias employer profiles
DELETE FROM employer_profile
WHERE recruiter_id IN (SELECT old_recruiter_id FROM temp_orphan_aliases);

-- Deactivate orphaned alias users
UPDATE user_account
SET is_active = FALSE, updated_at = NOW()
WHERE id IN (SELECT old_recruiter_id FROM temp_orphan_aliases);

-- Turn off policies for deactivated aliases
UPDATE automation_policy
SET email_notifications_enabled = FALSE,
    daily_digest_enabled = FALSE,
    high_match_email_enabled = FALSE,
    email_action_enabled = FALSE,
    auto_invite_enabled = FALSE,
    job_scan_enabled = FALSE,
    updated_at = NOW()
WHERE user_id IN (SELECT old_recruiter_id FROM temp_orphan_aliases);

-- Ensure active policies for active IMPORTED
INSERT INTO automation_policy (
    user_id,
    email_notifications_enabled,
    daily_digest_enabled,
    high_match_email_enabled,
    email_action_enabled,
    auto_invite_enabled,
    job_scan_enabled
)
SELECT id, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE
FROM user_account
WHERE account_source = 'IMPORTED' AND is_active = TRUE
ON CONFLICT (user_id) DO UPDATE
SET email_notifications_enabled = FALSE,
    daily_digest_enabled = FALSE,
    high_match_email_enabled = FALSE,
    email_action_enabled = FALSE,
    updated_at = NOW();

COMMIT;`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx + 7);
fs.writeFileSync(file, content);
console.log("Patched import-scraped-jobs.mjs");
