-- V29__fix_normalization_and_identity.sql
-- Thêm extension pgcrypto để băm chuỗi
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Thêm account_source vào user_account để phân biệt LOCAL vs IMPORTED
ALTER TABLE user_account 
ADD COLUMN account_source VARCHAR(20) DEFAULT 'LOCAL' NOT NULL;

ALTER TABLE user_account 
ADD CONSTRAINT chk_user_account_source CHECK (account_source IN ('LOCAL', 'IMPORTED'));

-- 2. Backfill IMPORTED cho các tài khoản được sinh ra từ import trước đó
-- Lấy từ id của recruiter sở hữu JD, HOẶC từ scraped+...
UPDATE user_account
SET account_source = 'IMPORTED'
WHERE email LIKE 'scraped+%@careerfit.local'
   OR id IN (
       SELECT recruiter_id FROM job WHERE external_hash IS NOT NULL
   );

-- 3. Cập nhật identity (external_hash) của 974 JD hiện tại
-- Check xem có URL bị NULL không, nếu không NULL thì cập nhật
DO $$ 
DECLARE
    null_url_count INT;
    collision_count INT;
BEGIN
    SELECT COUNT(*) INTO null_url_count FROM job WHERE external_hash IS NOT NULL AND source_url IS NULL;
    IF null_url_count > 0 THEN
        RAISE EXCEPTION 'Cannot update identity: Found % imported jobs with NULL source_url.', null_url_count;
    END IF;

    -- Kiểm tra duplicate source keys trước khi cập nhật
    SELECT COUNT(*) INTO collision_count
    FROM (
        SELECT lower(trim(source_platform)), trim(source_url)
        FROM job
        WHERE external_hash IS NOT NULL
        GROUP BY lower(trim(source_platform)), trim(source_url)
        HAVING COUNT(*) > 1
    ) dupes;

    IF collision_count > 0 THEN
        RAISE EXCEPTION 'Cannot update identity: Found % duplicate (platform, url) pairs in existing data.', collision_count;
    END IF;

    -- Thực hiện băm lại identity
    UPDATE job
    SET external_hash = encode(digest(lower(trim(source_platform)) || '|' || trim(source_url), 'sha256'), 'hex')
    WHERE external_hash IS NOT NULL;
END $$;
