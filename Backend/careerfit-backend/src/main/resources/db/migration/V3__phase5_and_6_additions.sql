-- ==========================================
-- V3 Migration: Application & Analytics additions
-- ==========================================
--
-- V1 already creates application and job_market_snapshot. V3 keeps the phase
-- additions incremental so Flyway can run from a clean database.

ALTER TABLE application
    ADD COLUMN IF NOT EXISTS cover_letter TEXT,
    ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_application_candidate_job ON application(candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_application_job_id ON application(job_id);
CREATE INDEX IF NOT EXISTS idx_market_snapshot_date ON job_market_snapshot(snapshot_date DESC);
