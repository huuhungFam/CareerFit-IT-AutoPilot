-- IMPORTED is provenance metadata. Imported jobs and their generated recruiter
-- accounts are fully owned by CareerFit for the local demonstration workflow.
-- The source URL/hash remain available for traceability and import idempotency.

-- All baseline credentials are intentionally uniform for the local demo only:
-- password: 12345678
UPDATE user_account
SET password_hash = '$2a$10$IXfEB8pLaeAUqwZ8ftZUC.KMl9FoaUGNn5pB5sinVpjyki/oj1unm',
    email_verified = TRUE,
    updated_at = NOW();
