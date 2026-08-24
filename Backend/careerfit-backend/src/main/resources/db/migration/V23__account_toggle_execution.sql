ALTER TABLE automation_policy
    ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;

ALTER TABLE job
    ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ;

UPDATE job
SET application_deadline = created_at + INTERVAL '30 days'
WHERE application_deadline IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_application_deadline
    ON job (application_deadline)
    WHERE status = 'ACTIVE';
