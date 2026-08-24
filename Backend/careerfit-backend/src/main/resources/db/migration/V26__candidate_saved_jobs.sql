CREATE TABLE candidate_saved_job (
    id UUID PRIMARY KEY,
    candidate_user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_candidate_saved_job UNIQUE (candidate_user_id, job_id)
);

CREATE INDEX idx_candidate_saved_job_candidate
    ON candidate_saved_job(candidate_user_id, created_at DESC);

CREATE INDEX idx_candidate_saved_job_job
    ON candidate_saved_job(job_id);
