ALTER TABLE email_action_token RENAME COLUMN token TO token_hash;

DROP INDEX IF EXISTS idx_email_action_token_token;
CREATE UNIQUE INDEX idx_email_action_token_hash ON email_action_token(token_hash);

-- Existing one-click links are intentionally invalidated by hashing their stored values.
UPDATE email_action_token
SET token_hash = encode(sha256(token_hash::bytea), 'hex');
