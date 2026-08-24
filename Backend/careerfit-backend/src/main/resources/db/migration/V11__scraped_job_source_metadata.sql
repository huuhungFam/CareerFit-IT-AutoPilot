-- V11: Source metadata for real scraped job imports.

ALTER TABLE job
    ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS external_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_external_hash
    ON job (external_hash)
    WHERE external_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_source_platform
    ON job (source_platform);

CREATE INDEX IF NOT EXISTS idx_job_scraped_at
    ON job (scraped_at DESC);
