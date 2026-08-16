CREATE TABLE content_report (
    id UUID PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES user_account(id),
    target_type VARCHAR(10) NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(40) NOT NULL,
    comment VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolved_by UUID REFERENCES user_account(id),
    resolution_note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    CONSTRAINT content_report_target_type_check CHECK (target_type IN ('JOB', 'CV')),
    CONSTRAINT content_report_reason_check CHECK (reason IN (
        'IMPERSONATION', 'FRAUD_SCAM', 'FALSE_INFORMATION', 'INAPPROPRIATE_CONTENT',
        'DISCRIMINATION_HARASSMENT', 'PRIVACY_VIOLATION', 'SPAM', 'OTHER'
    )),
    CONSTRAINT content_report_status_check CHECK (status IN ('PENDING', 'DISMISSED', 'ACTIONED'))
);

CREATE INDEX idx_content_report_queue
    ON content_report(status, target_type, created_at DESC);
CREATE INDEX idx_content_report_target
    ON content_report(target_type, target_id, created_at DESC);
CREATE UNIQUE INDEX uq_content_report_pending_reporter_target
    ON content_report(reporter_id, target_type, target_id)
    WHERE status = 'PENDING';

ALTER TABLE job
    ADD COLUMN pending_report_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE job DROP CONSTRAINT IF EXISTS job_status_check;
ALTER TABLE job
    ADD CONSTRAINT job_status_check
        CHECK (status IN ('ACTIVE', 'CLOSED', 'DRAFT', 'PAUSED', 'HIDDEN_BY_ADMIN', 'BANNED'));

ALTER TABLE cv
    ADD COLUMN pending_report_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cv DROP CONSTRAINT IF EXISTS cv_status_check;
ALTER TABLE cv
    ADD CONSTRAINT cv_status_check
        CHECK (status IN (
            'UPLOADED', 'VALIDATING', 'REVIEW_REQUIRED', 'DRAFT',
            'PROCESSING', 'SCORING_DONE', 'FAILED', 'BANNED'
        ));
