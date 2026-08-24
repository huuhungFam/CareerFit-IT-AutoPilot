-- V32: Add outbox recovery index for PROCESSING state
-- V16 intentionally removed passwordless, do not restore email_token.

-- Index to quickly find processing outbox items that are stuck and need recovery
CREATE INDEX IF NOT EXISTS idx_outbox_processing_scheduled
    ON notification_outbox(scheduled_at)
    WHERE status = 'PROCESSING';
