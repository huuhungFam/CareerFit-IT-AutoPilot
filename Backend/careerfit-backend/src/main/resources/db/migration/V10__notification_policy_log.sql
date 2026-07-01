ALTER TABLE automation_policy
    ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    email_type VARCHAR(80) NOT NULL,
    context_key VARCHAR(120),
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_user_created
    ON notification_delivery_log (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_dedupe
    ON notification_delivery_log (recipient_user_id, email_type, context_key, status, created_at DESC);
