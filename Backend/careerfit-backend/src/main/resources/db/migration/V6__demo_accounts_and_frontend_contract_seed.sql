-- ============================================================
-- V6__demo_accounts_and_frontend_contract_seed.sql
-- Incremental seed for frontend integration demo accounts.
-- Safe on databases that already applied an earlier V4 seed.
-- ============================================================

-- BCrypt hash for "1" (cost 10)
-- $2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi

INSERT INTO user_account (id, email, password_hash, full_name, role, email_verified, is_active, preferred_language, created_at, updated_at)
VALUES
('12121212-1212-1212-1212-121212121212', 'ca', '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'Demo Candidate', 'CANDIDATE', true, true, 'vi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('23232323-2323-2323-2323-232323232323', 're', '$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi', 'Demo Recruiter', 'RECRUITER', true, true, 'vi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO employer_profile (id, recruiter_id, company_name, slug, industry, website_url, logo_url, summary, description, is_featured, created_at, updated_at)
VALUES
('24242424-2424-2424-2424-242424242424', '23232323-2323-2323-2323-232323232323', 'CareerFit Demo Lab', 'careerfit-demo-lab', 'HR Tech', 'https://careerfit.dev', 'https://ui-avatars.com/api/?name=CareerFit+Demo&background=006a62&color=fff', 'Demo recruiter workspace for frontend integration testing.', 'Demo recruiter workspace for frontend integration testing.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO UPDATE
SET recruiter_id = EXCLUDED.recruiter_id,
    company_name = EXCLUDED.company_name,
    industry = EXCLUDED.industry,
    website_url = EXCLUDED.website_url,
    logo_url = EXCLUDED.logo_url,
    summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    is_featured = EXCLUDED.is_featured,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO candidate (id, user_id, desired_title, desired_skills, location, years_of_experience, avatar_url, created_at, updated_at)
VALUES
('34343434-3434-3434-3434-343434343434', '12121212-1212-1212-1212-121212121212', 'Fullstack Engineer', '["React", "TypeScript", "Spring Boot", "PostgreSQL"]'::jsonb, 'Ho Chi Minh', 4, 'https://ui-avatars.com/api/?name=Demo+Candidate&background=00446e&color=fff', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (user_id) DO UPDATE
SET desired_title = EXCLUDED.desired_title,
    desired_skills = EXCLUDED.desired_skills,
    location = EXCLUDED.location,
    years_of_experience = EXCLUDED.years_of_experience,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO job (
    id, recruiter_id, title, company, location, employment_type, seniority_level,
    salary_mode, salary_min, salary_max, salary_currency, salary_type,
    salary_is_visible, salary_display_text, language, required_skills,
    original_text, status, view_count, applicant_count, deadline, created_at, updated_at
)
VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '23232323-2323-2323-2323-232323232323',
'Demo Fullstack Engineer', 'CareerFit Demo Lab', 'Ho Chi Minh, Remote', 'Full-time', 'Mid',
'RANGE', 1500, 2500, 'USD', 'MONTHLY', true, '1,500 - 2,500 USD', 'en',
'["React", "TypeScript", "Spring Boot", "PostgreSQL"]'::jsonb,
'Demo Fullstack Engineer at CareerFit Demo Lab. Build candidate-facing workflows with React, TypeScript, Spring Boot and PostgreSQL. This posting is seeded for frontend integration testing.',
'ACTIVE', 30, 0, CURRENT_DATE + 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    employment_type = EXCLUDED.employment_type,
    seniority_level = EXCLUDED.seniority_level,
    salary_mode = EXCLUDED.salary_mode,
    salary_min = EXCLUDED.salary_min,
    salary_max = EXCLUDED.salary_max,
    salary_currency = EXCLUDED.salary_currency,
    salary_type = EXCLUDED.salary_type,
    salary_is_visible = EXCLUDED.salary_is_visible,
    salary_display_text = EXCLUDED.salary_display_text,
    language = EXCLUDED.language,
    required_skills = EXCLUDED.required_skills,
    original_text = EXCLUDED.original_text,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;
