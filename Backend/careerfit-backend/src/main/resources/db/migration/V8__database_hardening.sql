-- ==========================================
-- V8 Migration: Database hardening
-- Adds data integrity checks, optimistic-lock columns and query indexes.
-- ==========================================

-- Optimistic locking columns for high-write or user-editable rows.
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE employer_profile ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE cv ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE job ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE matching ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE application ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE automation_policy ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Keep email uniqueness stable even if callers vary letter casing.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_email_lower
    ON user_account (LOWER(email));

-- Only one default CV may exist per candidate. Keep latest default if old data has duplicates.
WITH ranked_defaults AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY candidate_id
               ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS rn
    FROM cv
    WHERE is_default = TRUE
)
UPDATE cv
SET is_default = FALSE,
    updated_at = NOW()
WHERE id IN (SELECT id FROM ranked_defaults WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cv_one_default_per_candidate
    ON cv (candidate_id)
    WHERE is_default = TRUE;

-- Domain/data-quality checks.
ALTER TABLE candidate
    ADD CONSTRAINT chk_candidate_years_non_negative
        CHECK (years_of_experience IS NULL OR years_of_experience >= 0),
    ADD CONSTRAINT chk_candidate_salary_range
        CHECK (
            desired_salary_min IS NULL
            OR desired_salary_max IS NULL
            OR desired_salary_min <= desired_salary_max
        ),
    ADD CONSTRAINT chk_candidate_auto_apply_threshold
        CHECK (auto_apply_threshold >= 0 AND auto_apply_threshold <= 100);

ALTER TABLE automation_policy
    ADD CONSTRAINT chk_policy_auto_apply_threshold
        CHECK (auto_apply_threshold >= 0 AND auto_apply_threshold <= 100),
    ADD CONSTRAINT chk_policy_high_match_threshold
        CHECK (high_match_threshold >= 0 AND high_match_threshold <= 100),
    ADD CONSTRAINT chk_policy_email_limits
        CHECK (max_email_per_day >= 0 AND notification_cooldown_hours >= 0),
    ADD CONSTRAINT chk_policy_frequency
        CHECK (job_scan_frequency_hours > 0 AND replacement_delay_minutes >= 0);

ALTER TABLE matching
    ADD CONSTRAINT chk_matching_raw_score_range
        CHECK (raw_score >= 0 AND raw_score <= 1),
    ADD CONSTRAINT chk_matching_normalized_score_range
        CHECK (normalized_score >= 0 AND normalized_score <= 100);

ALTER TABLE job
    ADD CONSTRAINT chk_job_salary_non_negative
        CHECK (
            (salary_min IS NULL OR salary_min >= 0)
            AND (salary_max IS NULL OR salary_max >= 0)
        ),
    ADD CONSTRAINT chk_job_salary_range
        CHECK (
            salary_min IS NULL
            OR salary_max IS NULL
            OR salary_min <= salary_max
        ),
    ADD CONSTRAINT chk_job_salary_mode_fields
        CHECK (
            salary_mode = 'NEGOTIABLE'
            OR salary_mode = 'HIDDEN'
            OR (salary_mode = 'RANGE' AND salary_min IS NOT NULL AND salary_max IS NOT NULL)
            OR (salary_mode = 'UP_TO' AND salary_max IS NOT NULL)
            OR (salary_mode = 'FROM' AND salary_min IS NOT NULL)
        ),
    ADD CONSTRAINT chk_job_salary_type
        CHECK (salary_type IS NULL OR salary_type IN ('MONTHLY', 'HOURLY', 'YEARLY')),
    ADD CONSTRAINT chk_job_counters_non_negative
        CHECK (applicant_count >= 0 AND view_count >= 0);

ALTER TABLE job_trend_snapshot
    ADD CONSTRAINT chk_job_trend_counts_non_negative
        CHECK (view_count >= 0 AND application_count >= 0);

ALTER TABLE job_market_snapshot
    ADD CONSTRAINT chk_market_counts_non_negative
        CHECK (
            total_posted_jobs >= 0
            AND active_jobs >= 0
            AND new_jobs >= 0
            AND employer_count >= 0
        );

-- Query-path indexes for paginated dashboards and feeds.
CREATE INDEX IF NOT EXISTS idx_user_role_active
    ON user_account (role, is_active);

CREATE INDEX IF NOT EXISTS idx_candidate_user_id
    ON candidate (user_id);

CREATE INDEX IF NOT EXISTS idx_job_recruiter_status_created
    ON job (recruiter_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_active_created
    ON job (created_at DESC)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_cv_candidate_created
    ON cv (candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_candidate_applied
    ON application (candidate_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_job_status_applied
    ON application (job_id, status, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_matching_cv_score
    ON matching (cv_id, normalized_score DESC);

CREATE INDEX IF NOT EXISTS idx_matching_job_potential_score
    ON matching (job_id, is_potential, normalized_score DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_actor_created
    ON feedback (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_matching
    ON feedback (matching_id);

CREATE INDEX IF NOT EXISTS idx_rec_interaction_candidate_created
    ON recommendation_interaction (candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_token_user_purpose_expiry
    ON email_token (user_id, purpose, expires_at);

CREATE INDEX IF NOT EXISTS idx_notification_job_next_retry
    ON notification_job (status, next_retry_at, created_at);
