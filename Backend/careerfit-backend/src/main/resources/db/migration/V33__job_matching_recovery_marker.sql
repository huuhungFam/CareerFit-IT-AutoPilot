ALTER TABLE job ADD COLUMN IF NOT EXISTS matching_recovery_needed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_job_matching_recovery_needed
  ON job (status, matching_recovery_needed) WHERE matching_recovery_needed = TRUE;
