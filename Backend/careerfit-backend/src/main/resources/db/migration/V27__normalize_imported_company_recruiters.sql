-- ============================================================
-- V27__normalize_imported_company_recruiters.sql
-- CareerFit IT AutoPilot
-- Mục đích: Chuẩn hóa company name, hợp nhất recruiter alias
--           và tắt email cho toàn bộ recruiter import
-- ============================================================
-- Chiến lược:
-- 1. Tạo bảng tạm chứa alias mapping (canonical → aliases)
-- 2. Tạo/upsert canonical recruiter account với email mới (recruiter.<slug>@careerfit.local)
--    và password hash cho mật khẩu "1"
-- 3. Chuyển ownership JD từ alias recruiter sang canonical recruiter
-- 4. Cập nhật job.company sang canonical name
-- 5. Upsert employer_profile với canonical slug
-- 6. Tắt email cho canonical recruiter (tạo/update automation_policy)
-- 7. Đặt is_active = false cho alias account đã chuyển hết JD
-- An toàn: mọi bước dùng IF EXISTS, ON CONFLICT, tương thích DB mới/cũ
-- ============================================================

-- ── Bước 1: Bảng tạm alias mapping ──────────────────────────────────────────

CREATE TEMP TABLE _company_alias_map (
    alias_name   TEXT NOT NULL,
    canonical    TEXT NOT NULL
) ON COMMIT DROP;

-- Chèn mapping: alias_name → canonical
-- Mỗi dòng là một alias được biết rõ trong dataset
INSERT INTO _company_alias_map (alias_name, canonical) VALUES
-- MB Bank group
('MB Bank',                                                                              'MB Bank'),
('Ngân Hàng TMCP Quân Đội',                                                              'MB Bank'),
('Military Commercial Joint Stock Bank',                                                  'MB Bank'),
('Công Ty Quản Lý Nợ Và Khai Thác Tài Sản - Ngân Hàng TMCP Quân Đội',                  'MB Bank'),
('Ngân hàng TNHH MTV Việt Nam Hiện Đại (MBV)',                                           'MB Bank'),
('NGÂN HÀNG TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN VIỆT NAM HIỆN ĐẠI',                     'MB Bank'),
('CÔNG TY TNHH BẢO HIỂM NHÂN THỌ MB AGEAS',                                             'MB Bank'),
-- TPBank group
('TPBank',                                                                               'TPBank'),
('Ngân Hàng TMCP Tiên Phong (TPBank)',                                                   'TPBank'),
('Ngân hàng TMCP Tiên Phong | TPBank',                                                   'TPBank'),
-- VPBank group
('VPBank',                                                                               'VPBank'),
('Ngân Hàng TMCP Việt Nam Thịnh Vượng - VPBANK',                                         'VPBank'),
('Công ty Cổ phần Chứng khoán VPBank',                                                   'VPBank'),
('CÔNG TY CỔ PHẦN CHỨNG KHOÁN VPBank',                                                   'VPBank'),
-- Techcombank group
('Techcombank',                                                                          'Techcombank'),
('NGÂN HÀNG TMCP KỸ THƯƠNG VIỆT NAM (TECHCOMBANK)',                                      'Techcombank'),
-- Vietcombank group
('NGÂN HÀNG TMCP NGOẠI THƯƠNG VIỆT NAM (VIETCOMBANK)',                                   'Vietcombank'),
('Công ty TNHH Chứng khoán Ngân hàng TMCP Ngoại thương Việt Nam (VCBS - Vietcombank Securities)', 'Vietcombank'),
-- NCB group
('National Citizen Bank | NCB',                                                          'NCB'),
('Ngân Hàng TMCP Quốc Dân (NCB)',                                                        'NCB'),
-- PVcomBank group
('PVcomBank',                                                                            'PVcomBank'),
('Ngân hàng TMCP Đại Chúng Việt Nam - PVcomBank',                                        'PVcomBank'),
-- ACB group
('Ngân Hàng Á Châu | ACB',                                                              'ACB'),
('Công ty TNHH Chứng khoán ACB',                                                         'ACB'),
-- VietABank group
('Viet A Bank',                                                                          'VietABank'),
('Ngân hàng TMCP Việt Á – VietABank',                                                    'VietABank'),
-- Phu Hung Securities group
('Phu Hung Securities (PHS)',                                                            'Phu Hung Securities'),
('Phu Hung Securities Corporation',                                                      'Phu Hung Securities'),
-- Laidon group
('Laidon Consulting Vietnam',                                                            'Laidon Group'),
('Laidon Group',                                                                         'Laidon Group'),
-- AITS | Vietnam Airlines group
('AITS | Vietnam Airlines',                                                              'AITS | Vietnam Airlines'),
('CÔNG TY CỔ PHẦN TIN HỌC - VIỄN THÔNG HÀNG KHÔNG AITS',                                'AITS | Vietnam Airlines'),
-- F88 group
('F88',                                                                                  'F88'),
('CÔNG TY CỔ PHẦN KINH DOANH F88',                                                       'F88'),
-- Gene Solutions group
('Gene Solutions',                                                                       'Gene Solutions'),
('CÔNG TY CỔ PHẦN GIẢI PHÁP GENE - GENE SOLUTIONS',                                      'Gene Solutions');

-- ── Hàm helper tạo slug từ canonical name ────────────────────────────────────
-- Thay ký tự không phải ASCII/alnum bằng hyphen, lowercase, trim
CREATE OR REPLACE FUNCTION _canonical_slug(name TEXT) RETURNS TEXT AS $$
DECLARE
    s TEXT;
BEGIN
    -- Transliterate tiếng Việt phổ biến
    s := translate(name,
        'àáảãạăắặẳẵằâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẮẶẲẴẰÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
    );
    -- lowercase
    s := lower(s);
    -- Replace non-alnum với hyphen
    s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
    -- Trim hyphens at ends
    s := regexp_replace(s, '^-+|-+$', '', 'g');
    -- Collapse consecutive hyphens
    s := regexp_replace(s, '-{2,}', '-', 'g');
    RETURN COALESCE(NULLIF(s, ''), 'unknown');
END;
$$ LANGUAGE plpgsql;

-- ── Bảng tạm: canonical companies cần xử lý ─────────────────────────────────
CREATE TEMP TABLE _canonical_companies AS
SELECT DISTINCT canonical,
    _canonical_slug(canonical) AS slug,
    'recruiter.' || _canonical_slug(canonical) || '@careerfit.local' AS canonical_email
FROM _company_alias_map;

-- ── Bước 2: Upsert canonical recruiter accounts ──────────────────────────────
-- Chỉ upsert cho các canonical company có job trong database
-- để tránh tạo account không cần thiết trên DB mới/ít dữ liệu

INSERT INTO user_account (
    email, role, full_name, password_hash,
    is_active, email_verified, preferred_language,
    created_at, updated_at
)
SELECT DISTINCT
    cc.canonical_email,
    'RECRUITER',
    cc.canonical || ' Recruiting Team',
    '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi',
    TRUE,
    FALSE,
    'vi',
    NOW(),
    NOW()
FROM _canonical_companies cc
WHERE EXISTS (
    -- Chỉ tạo nếu có job thuộc alias này (tương thích DB cũ/mới)
    SELECT 1 FROM job j
    JOIN _company_alias_map m ON lower(trim(j.company)) = lower(trim(m.alias_name))
    WHERE m.canonical = cc.canonical
)
ON CONFLICT (email) DO UPDATE
SET full_name    = EXCLUDED.full_name,
    password_hash = COALESCE(user_account.password_hash,
                             '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi'),
    is_active    = TRUE,
    updated_at   = NOW();

-- ── Bước 3: Chuyển ownership JD sang canonical recruiter ────────────────────
-- Giữ nguyên job.id; chỉ thay recruiter_id và company
UPDATE job j
SET recruiter_id = ua.id,
    company      = m.canonical,
    updated_at   = NOW()
FROM _company_alias_map m
JOIN _canonical_companies cc ON cc.canonical = m.canonical
JOIN user_account ua ON ua.email = cc.canonical_email
WHERE lower(trim(j.company)) = lower(trim(m.alias_name))
  AND j.external_hash IS NOT NULL  -- chỉ job import, không đụng job thật
  AND ua.id IS NOT NULL;

-- ── Bước 4: Upsert employer_profile cho canonical ────────────────────────────
-- Chiến lược: slug của canonical employer = _canonical_slug(canonical) || '-canonical'
-- Tránh collision với slug cũ (alias có slug riêng), bổ sung suffix '-canonical'
-- Nếu slug '-canonical' đã tồn tại, update company_name
INSERT INTO employer_profile (
    recruiter_id, company_name, slug, summary, description,
    industry, company_size, location, website_url, benefits,
    is_featured, created_at, updated_at
)
SELECT
    ua.id,
    cc.canonical,
    cc.slug || '-canonical',
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
FROM _canonical_companies cc
JOIN user_account ua ON ua.email = cc.canonical_email
ON CONFLICT (slug) DO UPDATE
SET company_name = EXCLUDED.company_name,
    recruiter_id = EXCLUDED.recruiter_id,
    updated_at   = NOW();

-- ── Bước 5: Tắt email cho canonical recruiter ────────────────────────────────
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
    FALSE, -- email_notifications_enabled
    FALSE, -- daily_digest_enabled
    FALSE, -- high_match_email_enabled
    FALSE, -- email_action_enabled
    FALSE, -- auto_invite_enabled
    FALSE, -- job_scan_enabled
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

-- Tắt email cho alias account cũ (scraped+hash@careerfit.local) còn tồn tại
INSERT INTO automation_policy (
    user_id,
    email_notifications_enabled,
    daily_digest_enabled,
    high_match_email_enabled,
    email_action_enabled,
    created_at,
    updated_at
)
SELECT
    ua.id,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
FROM user_account ua
WHERE ua.email LIKE 'scraped+%@careerfit.local'
ON CONFLICT (user_id) DO UPDATE
SET email_notifications_enabled = FALSE,
    daily_digest_enabled         = FALSE,
    high_match_email_enabled     = FALSE,
    email_action_enabled         = FALSE,
    updated_at                   = NOW();

-- ── Bước 6: Deactivate alias accounts không còn sở hữu JD ──────────────────
-- Chỉ deactivate account có email dạng scraped+hash@careerfit.local (alias cũ)
-- Không đụng account thật hoặc demo (ca/re/ad)
UPDATE user_account ua
SET is_active  = FALSE,
    updated_at = NOW()
WHERE ua.email LIKE 'scraped+%@careerfit.local'
  AND NOT EXISTS (
      SELECT 1 FROM job j WHERE j.recruiter_id = ua.id
  );

-- ── Cleanup: drop temp function ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS _canonical_slug(TEXT);
