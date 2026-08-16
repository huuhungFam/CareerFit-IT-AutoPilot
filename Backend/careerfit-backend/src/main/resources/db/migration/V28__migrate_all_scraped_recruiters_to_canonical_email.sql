-- ============================================================
-- V28__migrate_all_scraped_recruiters_to_canonical_email.sql
-- CareerFit IT AutoPilot
-- Mục đích: Đổi email của toàn bộ account dạng scraped+hash@careerfit.local
--           còn đang active (có JD) sang dạng recruiter.<slug>@careerfit.local
--           để tất cả canonical recruiter đăng nhập được với format chuẩn
-- ============================================================

-- ── Hàm helper tạo slug ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _v28_slug(name TEXT) RETURNS TEXT AS $$
DECLARE
    s TEXT;
BEGIN
    s := translate(name,
        'àáảãạăắặẳẵằâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẮẶẲẴẰÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
    );
    s := lower(s);
    s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
    s := regexp_replace(s, '^-+|-+$', '', 'g');
    s := regexp_replace(s, '-{2,}', '-', 'g');
    RETURN COALESCE(NULLIF(s, ''), 'unknown');
END;
$$ LANGUAGE plpgsql;

-- ── Bảng tạm: mapping scraped+hash → canonical email mới ─────────────────────
CREATE TEMP TABLE _v28_migration AS
SELECT
    u.id AS old_user_id,
    u.email AS old_email,
    j.company AS canonical_company,
    'recruiter.' || _v28_slug(j.company) || '@careerfit.local' AS new_email,
    _v28_slug(j.company) AS slug
FROM user_account u
JOIN (
    SELECT DISTINCT ON (recruiter_id) recruiter_id, company
    FROM job
    WHERE external_hash IS NOT NULL
    ORDER BY recruiter_id, company
) j ON j.recruiter_id = u.id
WHERE u.email LIKE 'scraped+%@careerfit.local'
  AND u.is_active = TRUE;

-- ── Bước 1: Rename account nếu email mới chưa tồn tại ───────────────────────
-- Các account single-name (không thuộc alias group) chỉ cần đổi email format
UPDATE user_account ua
SET email         = m.new_email,
    password_hash = '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi',
    updated_at    = NOW()
FROM _v28_migration m
WHERE ua.id = m.old_user_id
  AND NOT EXISTS (SELECT 1 FROM user_account x WHERE x.email = m.new_email AND x.id != ua.id);

-- ── Bước 2: Xử lý conflict - email mới đã tồn tại (canonical từ V27) ─────────
DO $$
DECLARE
    r RECORD;
    canonical_uid UUID;
BEGIN
    FOR r IN
        -- Tìm các account scraped+hash (vẫn chưa đổi email vì bị conflict)
        SELECT m.old_user_id, m.new_email
        FROM _v28_migration m
        JOIN user_account ua ON ua.id = m.old_user_id
        WHERE ua.email LIKE 'scraped+%@careerfit.local'
    LOOP
        canonical_uid := (SELECT id FROM user_account WHERE email = r.new_email);
        IF canonical_uid IS NULL THEN CONTINUE; END IF;

        -- Chuyển JD về canonical
        UPDATE job
        SET recruiter_id = canonical_uid,
            updated_at   = NOW()
        WHERE recruiter_id = r.old_user_id;

        -- Deactivate alias cũ
        UPDATE user_account
        SET is_active  = FALSE,
            updated_at = NOW()
        WHERE id = r.old_user_id;
    END LOOP;
END;
$$;

-- ── Bước 3: Cập nhật employer_profile cho accounts đã được rename ───────────
-- Cập nhật company_name cho employer_profile đã có
UPDATE employer_profile ep
SET company_name = m.canonical_company,
    updated_at   = NOW()
FROM _v28_migration m
JOIN user_account ua ON ua.id = m.old_user_id
WHERE ep.recruiter_id = ua.id;

-- Tạo employer_profile mới cho các canonical account chưa có (từ V27 alias group)
INSERT INTO employer_profile (
    recruiter_id, company_name, slug, summary, description,
    industry, company_size, location, website_url, benefits,
    is_featured, created_at, updated_at
)
SELECT
    ua.id,
    ua.full_name,
    _v28_slug(ua.email) || '-' || left(md5(ua.email), 8),
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
FROM user_account ua
WHERE ua.email LIKE 'recruiter.%@careerfit.local'
  AND ua.is_active = TRUE
  AND NOT EXISTS (SELECT 1 FROM employer_profile ep2 WHERE ep2.recruiter_id = ua.id)
ON CONFLICT (slug) DO NOTHING;

-- ── Bước 4: Đặt password hash cho TẤT CẢ recruiter canonical ────────────────
UPDATE user_account
SET password_hash = '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi',
    updated_at    = NOW()
WHERE email LIKE 'recruiter.%@careerfit.local'
  AND (password_hash IS NULL OR password_hash != '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi');

-- ── Bước 5: Tắt email cho TẤT CẢ recruiter.%@careerfit.local ────────────────
INSERT INTO automation_policy (
    user_id,
    email_notifications_enabled,
    daily_digest_enabled,
    high_match_email_enabled,
    email_action_enabled,
    auto_invite_enabled,
    job_scan_enabled,
    created_at,
    updated_at
)
SELECT
    ua.id,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
FROM user_account ua
WHERE ua.email LIKE 'recruiter.%@careerfit.local'
ON CONFLICT (user_id) DO UPDATE
SET email_notifications_enabled = FALSE,
    daily_digest_enabled         = FALSE,
    high_match_email_enabled     = FALSE,
    email_action_enabled         = FALSE,
    updated_at                   = NOW();

-- ── Tắt email cho alias scraped+hash còn active (nếu còn) ───────────────────
INSERT INTO automation_policy (
    user_id,
    email_notifications_enabled,
    daily_digest_enabled,
    high_match_email_enabled,
    email_action_enabled,
    created_at,
    updated_at
)
SELECT ua.id, FALSE, FALSE, FALSE, FALSE, NOW(), NOW()
FROM user_account ua
WHERE ua.email LIKE 'scraped+%@careerfit.local'
ON CONFLICT (user_id) DO UPDATE
SET email_notifications_enabled = FALSE,
    daily_digest_enabled         = FALSE,
    high_match_email_enabled     = FALSE,
    email_action_enabled         = FALSE,
    updated_at                   = NOW();

-- ── Cleanup ──────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS _v28_slug(TEXT);
