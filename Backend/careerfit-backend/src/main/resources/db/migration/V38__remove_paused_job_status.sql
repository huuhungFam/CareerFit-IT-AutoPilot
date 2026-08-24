-- PAUSED had the same operational behavior as CLOSED and no dedicated workflow.
-- Preserve historical postings by closing any paused jobs before tightening the constraint.
UPDATE job
SET status = 'CLOSED'
WHERE status = 'PAUSED';

ALTER TABLE job DROP CONSTRAINT IF EXISTS job_status_check;
ALTER TABLE job
    ADD CONSTRAINT job_status_check
        CHECK (status IN ('ACTIVE', 'CLOSED', 'DRAFT', 'HIDDEN_BY_ADMIN', 'BANNED'));
