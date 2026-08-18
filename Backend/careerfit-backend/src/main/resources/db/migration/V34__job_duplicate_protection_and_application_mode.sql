-- Phase 5: additive metadata only. Existing imported rows are preserved unchanged.
ALTER TABLE job
    ADD COLUMN IF NOT EXISTS duplicate_fingerprint VARCHAR(64),
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'INTERNAL';

-- Scraped rows are external discovery listings. Seeded/local rows stay INTERNAL.
UPDATE job
SET source_type = 'IMPORTED'
WHERE (source_platform IS NOT NULL AND BTRIM(source_platform) <> '')
   OR (source_url IS NOT NULL AND BTRIM(source_url) <> '');

CREATE INDEX IF NOT EXISTS idx_job_duplicate_fingerprint
    ON job (duplicate_fingerprint)
    WHERE duplicate_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_source_type
    ON job (source_type);
