-- Passwordless login was removed. Email feedback actions use email_action_token
-- and are intentionally unaffected by this migration.

UPDATE user_settings
SET settings = settings - 'passwordlessEnabled'
WHERE settings ? 'passwordlessEnabled';

ALTER TABLE automation_policy
    DROP COLUMN IF EXISTS passwordless_enabled;

DROP TABLE IF EXISTS email_token;
