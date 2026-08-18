-- Phase 6 reset invariant: quick-login human accounts must always have a policy.
-- V6 seeds the accounts after the older policy seed, so a fresh database needs
-- this idempotent insert before V31 can meaningfully expose Demo Mode.
INSERT INTO automation_policy (user_id, demo_mode_enabled)
SELECT id, TRUE
FROM user_account
WHERE email IN ('ca', 're')
ON CONFLICT (user_id) DO UPDATE
SET demo_mode_enabled = TRUE,
    updated_at = CURRENT_TIMESTAMP;
