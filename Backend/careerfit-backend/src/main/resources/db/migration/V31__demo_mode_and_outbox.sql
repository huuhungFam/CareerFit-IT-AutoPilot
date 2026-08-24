-- Phase 1: Schema changes for demo mode and durable outbox

ALTER TABLE automation_policy
    ADD COLUMN IF NOT EXISTS demo_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure ca and re have demo mode ON
UPDATE automation_policy
SET demo_mode_enabled = TRUE
WHERE user_id IN (
    SELECT id FROM user_account WHERE email IN ('ca', 're')
);

-- Durable notification outbox table
CREATE TABLE IF NOT EXISTS notification_outbox (
    id UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    email_type VARCHAR(80) NOT NULL,
    target_type VARCHAR(80) NOT NULL,
    target_key VARCHAR(120) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_outbox UNIQUE (recipient_user_id, email_type, target_type, target_key)
);

CREATE INDEX idx_notification_outbox_polling
    ON notification_outbox (status, scheduled_at)
    WHERE status = 'PENDING';

CREATE INDEX idx_notification_outbox_recipient
    ON notification_outbox (recipient_user_id, scheduled_at DESC);
