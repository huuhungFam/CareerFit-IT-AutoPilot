ALTER TABLE email_action_token
    ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES application(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_email_action_token_application
    ON email_action_token(application_id);
