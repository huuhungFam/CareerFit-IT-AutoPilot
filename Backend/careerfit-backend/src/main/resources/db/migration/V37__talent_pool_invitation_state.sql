-- Preserve recruiter invitation history without keeping withdrawn invitations visible.
ALTER TABLE application
    ADD COLUMN IF NOT EXISTS invitation_origin BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS invitation_withdrawn BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing live invitations are invitation-origin records. Older accepted/declined
-- rows cannot be inferred reliably, so only active invitation history is backfilled.
UPDATE application
SET invitation_origin = TRUE
WHERE status = 'INVITED';
