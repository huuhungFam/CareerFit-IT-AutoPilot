-- The application generates these action tokens for email buttons.  V21 used
-- obsolete INVITATION_* names and omitted APPLY, so an email could be accepted
-- by SMTP and then have its enclosing outbox transaction rolled back.
ALTER TABLE email_action_token
    DROP CONSTRAINT IF EXISTS email_action_token_action_type_check;

ALTER TABLE email_action_token
    ADD CONSTRAINT email_action_token_action_type_check
    CHECK (action_type IN (
        'GOOD_MATCH', 'POTENTIAL', 'BAD_MATCH', 'NOT_INTERESTED',
        'APPLY', 'ACCEPT_INVITATION', 'DECLINE_INVITATION',
        'VIEW_JOB', 'UNSUBSCRIBE_DIGEST'
    ));
