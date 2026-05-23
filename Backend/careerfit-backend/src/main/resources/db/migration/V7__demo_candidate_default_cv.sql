-- ============================================================
-- V7__demo_candidate_default_cv.sql
-- Ensures the short demo Candidate account (ca / 1) can render
-- the personalized job-card feed without requiring manual setup.
-- ============================================================

INSERT INTO cv (
    id, candidate_id, display_name, source, is_default,
    raw_text, parsed_summary, top_skills, extracted_terms,
    language, status, file_path, file_original_name, failure_reason,
    last_scored_at, created_at, updated_at
)
VALUES (
    '52525252-5252-5252-5252-525252525252',
    '34343434-3434-3434-3434-343434343434',
    'Demo Candidate - Fullstack CV',
    'MANUAL',
    true,
    'React TypeScript Spring Boot PostgreSQL REST API fullstack product engineering',
    'Fullstack engineer with React, TypeScript, Spring Boot and PostgreSQL experience.',
    '["React", "TypeScript", "Spring Boot", "PostgreSQL", "REST"]'::jsonb,
    '{"react":0.90,"typescript":0.84,"spring":0.78,"postgresql":0.72,"rest":0.50}'::jsonb,
    'en',
    'SCORING_DONE',
    null,
    null,
    null,
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_default = true,
    raw_text = EXCLUDED.raw_text,
    parsed_summary = EXCLUDED.parsed_summary,
    top_skills = EXCLUDED.top_skills,
    extracted_terms = EXCLUDED.extracted_terms,
    language = EXCLUDED.language,
    status = EXCLUDED.status,
    last_scored_at = NOW(),
    updated_at = NOW();

UPDATE cv
SET is_default = false,
    updated_at = NOW()
WHERE candidate_id = '34343434-3434-3434-3434-343434343434'
  AND id <> '52525252-5252-5252-5252-525252525252';

INSERT INTO matching (
    id, cv_id, job_id, raw_score, normalized_score, label,
    is_potential, match_reasons, potential_reason,
    needs_recompute, recruiter_label, created_at, updated_at
)
VALUES
(
    '72727272-7272-7272-7272-727272727201',
    '52525252-5252-5252-5252-525252525252',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    0.920000,
    92.00,
    'HIGH',
    false,
    '["React", "TypeScript", "Spring Boot", "PostgreSQL"]'::jsonb,
    null,
    false,
    'PENDING',
    NOW(),
    NOW()
),
(
    '72727272-7272-7272-7272-727272727202',
    '52525252-5252-5252-5252-525252525252',
    '60000000-0000-0000-0000-000000000003',
    0.780000,
    78.00,
    'HIGH',
    false,
    '["React", "TypeScript", "Redux"]'::jsonb,
    null,
    false,
    'PENDING',
    NOW(),
    NOW()
),
(
    '72727272-7272-7272-7272-727272727203',
    '52525252-5252-5252-5252-525252525252',
    '60000000-0000-0000-0000-000000000001',
    0.690000,
    69.00,
    'MEDIUM',
    true,
    '["Spring Boot", "PostgreSQL", "REST"]'::jsonb,
    '"Transferable backend skills detected for a healthcare platform role."'::jsonb,
    false,
    'PENDING',
    NOW(),
    NOW()
)
ON CONFLICT (cv_id, job_id) DO UPDATE
SET raw_score = EXCLUDED.raw_score,
    normalized_score = EXCLUDED.normalized_score,
    label = EXCLUDED.label,
    is_potential = EXCLUDED.is_potential,
    match_reasons = EXCLUDED.match_reasons,
    potential_reason = EXCLUDED.potential_reason,
    needs_recompute = false,
    recruiter_label = EXCLUDED.recruiter_label,
    updated_at = NOW();

