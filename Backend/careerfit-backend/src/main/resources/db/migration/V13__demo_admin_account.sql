-- V13: Seed the frontend demo admin account so `ad` / `1` logs in through the real backend.
-- BCrypt hash for "1" (same demo hash used by V6).
INSERT INTO user_account (
    id, email, password_hash, full_name, role,
    email_verified, is_active, preferred_language, created_at, updated_at
)
VALUES (
    '45454545-4545-4545-4545-454545454545',
    'ad',
    '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi',
    'System Admin',
    'ADMIN',
    true,
    true,
    'vi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified,
    is_active = EXCLUDED.is_active,
    preferred_language = EXCLUDED.preferred_language,
    updated_at = CURRENT_TIMESTAMP;
