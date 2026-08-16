CREATE TABLE IF NOT EXISTS recruiter_cv_bookmark (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id       UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    cv_id        UUID NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_recruiter_cv_bookmark_job_candidate UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_cv_bookmark_job
    ON recruiter_cv_bookmark(job_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_cv_bookmark_candidate
    ON recruiter_cv_bookmark(candidate_id);

ALTER TABLE email_action_token
    ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES application(id) ON DELETE CASCADE;

ALTER TABLE email_action_token
    DROP CONSTRAINT IF EXISTS email_action_token_action_type_check;

ALTER TABLE email_action_token
    ADD CONSTRAINT email_action_token_action_type_check
    CHECK (action_type IN (
        'GOOD_MATCH','POTENTIAL','BAD_MATCH','NOT_INTERESTED',
        'VIEW_JOB','UNSUBSCRIBE_DIGEST',
        'INVITATION_ACCEPT','INVITATION_DECLINE'
    ));

CREATE INDEX IF NOT EXISTS idx_email_action_token_application
    ON email_action_token(application_id);
