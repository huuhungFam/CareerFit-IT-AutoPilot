-- ============================================================
-- V1__init_schema.sql
-- CareerFit IT AutoPilot – initial schema
-- All tables, indexes, constraints, enums via CHECK constraints
-- ============================================================

-- ── user_account ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_account (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255),
    role             VARCHAR(20)  NOT NULL CHECK (role IN ('CANDIDATE', 'RECRUITER', 'ADMIN')),
    full_name        VARCHAR(255),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    email_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'vi',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_email UNIQUE (email)
);

-- ── candidate ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    phone                    VARCHAR(30),
    location                 VARCHAR(255),
    desired_title            VARCHAR(255),
    desired_seniority        VARCHAR(50),
    desired_skills           JSONB,
    desired_work_model       VARCHAR(50),
    desired_salary_min       NUMERIC(15, 2),
    desired_salary_max       NUMERIC(15, 2),
    desired_salary_currency  VARCHAR(10),
    years_of_experience      INTEGER,
    about_me                 TEXT,
    auto_apply_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    auto_apply_threshold     NUMERIC(5, 2) NOT NULL DEFAULT 90.00,
    preferred_language       VARCHAR(10) NOT NULL DEFAULT 'vi',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_user UNIQUE (user_id)
);

-- ── employer_profile ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employer_profile (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id  UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    company_name  VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL,
    logo_url      VARCHAR(500),
    cover_url     VARCHAR(500),
    summary       TEXT,
    description   TEXT,
    industry      VARCHAR(100),
    company_size  VARCHAR(50),
    location      VARCHAR(255),
    website_url   VARCHAR(500),
    benefits      JSONB,
    is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employer_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_employer_profile_slug       ON employer_profile (slug);
CREATE INDEX IF NOT EXISTS idx_employer_profile_featured   ON employer_profile (is_featured);

-- ── cv ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cv (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id      UUID NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    display_name      VARCHAR(255) NOT NULL,
    source            VARCHAR(20)  NOT NULL CHECK (source IN ('UPLOAD', 'MANUAL')),
    is_default        BOOLEAN NOT NULL DEFAULT FALSE,
    raw_text          TEXT,
    parsed_summary    TEXT,
    top_skills        JSONB,
    extracted_terms   JSONB,
    language          VARCHAR(10),
    status            VARCHAR(30) NOT NULL DEFAULT 'UPLOADED'
                        CHECK (status IN ('UPLOADED','VALIDATING','PROCESSING','SCORING_DONE','FAILED')),
    file_path         VARCHAR(500),
    file_original_name VARCHAR(255),
    failure_reason    VARCHAR(500),
    last_scored_at    TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_candidate_id      ON cv (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_candidate_default ON cv (candidate_id, is_default);

-- ── candidate_portfolio_link ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_portfolio_link (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    type         VARCHAR(50),
    url          VARCHAR(500) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_link_candidate ON candidate_portfolio_link (candidate_id);

-- ── candidate_portfolio_project ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_portfolio_project (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    role         VARCHAR(255),
    summary      TEXT,
    tech_stack   JSONB,
    project_url  VARCHAR(500),
    impact       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_project_candidate ON candidate_portfolio_project (candidate_id);

-- ── job ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id           UUID NOT NULL REFERENCES user_account(id),
    title                  VARCHAR(255) NOT NULL,
    company                VARCHAR(255) NOT NULL,
    original_text          TEXT NOT NULL,
    required_skills        JSONB,
    nice_to_have_skills    JSONB,
    seniority_level        VARCHAR(50),
    employment_type        VARCHAR(50),
    location               VARCHAR(255),
    remote_type            VARCHAR(50),
    domain                 VARCHAR(100),
    -- Salary fields (conditional)
    salary_mode            VARCHAR(20) NOT NULL
                             CHECK (salary_mode IN ('NEGOTIABLE','RANGE','UP_TO','FROM','HIDDEN')),
    salary_min             NUMERIC(15, 2),
    salary_max             NUMERIC(15, 2),
    salary_currency        VARCHAR(10),
    salary_type            VARCHAR(20),  -- MONTHLY, HOURLY, YEARLY
    salary_is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    salary_display_text    VARCHAR(255),
    -- AI fields
    learned_profile_vector JSONB,
    tfidf_vector           JSONB,
    language               VARCHAR(10) NOT NULL DEFAULT 'vi',
    status                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                             CHECK (status IN ('ACTIVE','CLOSED','DRAFT','PAUSED')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_language    ON job (language);
CREATE INDEX IF NOT EXISTS idx_job_salary_mode ON job (salary_mode);
CREATE INDEX IF NOT EXISTS idx_job_salary_range ON job (salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_job_title       ON job (title);
CREATE INDEX IF NOT EXISTS idx_job_company     ON job (company);
CREATE INDEX IF NOT EXISTS idx_job_status      ON job (status);

-- ── matching ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matching (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id              UUID NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
    job_id             UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    raw_score          NUMERIC(10, 6) NOT NULL,
    normalized_score   NUMERIC(5, 2) NOT NULL,
    label              VARCHAR(20) NOT NULL CHECK (label IN ('LOW','MEDIUM','HIGH','POTENTIAL')),
    is_potential       BOOLEAN NOT NULL DEFAULT FALSE,
    match_reasons      JSONB,
    potential_reason   JSONB,
    needs_recompute    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_matching_cv_job UNIQUE (cv_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_matching_job_score ON matching (job_id, normalized_score DESC);
CREATE INDEX IF NOT EXISTS idx_matching_cv_id     ON matching (cv_id);

-- ── application ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS application (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id   UUID NOT NULL REFERENCES candidate(id),
    job_id         UUID NOT NULL REFERENCES job(id),
    matching_id    UUID REFERENCES matching(id),
    cv_id          UUID REFERENCES cv(id),
    status         VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','AUTO_APPLIED','APPROVED','REJECTED','INVITED','NOT_INTERESTED')),
    is_auto_applied BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_application_candidate_job UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_application_candidate_job ON application (candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_application_job_id        ON application (job_id);

-- ── feedback ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matching_id  UUID NOT NULL REFERENCES matching(id) ON DELETE CASCADE,
    actor_id     UUID NOT NULL REFERENCES user_account(id),
    actor_role   VARCHAR(20) NOT NULL CHECK (actor_role IN ('CANDIDATE','RECRUITER')),
    feedback_type VARCHAR(30) NOT NULL CHECK (feedback_type IN ('GOOD_MATCH','POTENTIAL','BAD_MATCH','NOT_INTERESTED')),
    source_channel VARCHAR(20) NOT NULL DEFAULT 'WEB' CHECK (source_channel IN ('WEB','EMAIL','DIGEST','AUTOPILOT')),
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_feedback_matching_actor UNIQUE (matching_id, actor_id)
);

-- ── recommendation_interaction ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recommendation_interaction (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate(id),
    job_id       UUID NOT NULL REFERENCES job(id),
    action       VARCHAR(30) NOT NULL
                   CHECK (action IN ('VIEWED','SKIPPED','APPLIED','SAVED','NOT_INTERESTED','SHOW_SIMILAR')),
    source       VARCHAR(20) NOT NULL DEFAULT 'WEB'
                   CHECK (source IN ('WEB','EMAIL','DIGEST','AUTOPILOT')),
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_interaction_candidate_job ON recommendation_interaction (candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_rec_interaction_created_at    ON recommendation_interaction (created_at DESC);

-- ── automation_policy ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_policy (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                      UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    auto_apply_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
    auto_apply_threshold         NUMERIC(5, 2) NOT NULL DEFAULT 90.00,
    auto_invite_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    daily_digest_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    daily_digest_time            TIME NOT NULL DEFAULT '08:00:00',
    user_timezone                VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    quiet_hours_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start            TIME NOT NULL DEFAULT '22:00:00',
    quiet_hours_end              TIME NOT NULL DEFAULT '07:00:00',
    job_scan_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
    job_scan_frequency_hours     INTEGER NOT NULL DEFAULT 1,
    high_match_email_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    high_match_threshold         NUMERIC(5, 2) NOT NULL DEFAULT 90.00,
    max_email_per_day            INTEGER NOT NULL DEFAULT 5,
    notification_cooldown_hours  INTEGER NOT NULL DEFAULT 24,
    replacement_after_skip_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    replacement_delay_minutes    INTEGER NOT NULL DEFAULT 45,
    email_action_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    passwordless_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_user UNIQUE (user_id)
);

-- ── email_action ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_action (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES user_account(id),
    action_type      VARCHAR(50) NOT NULL,
    target_type      VARCHAR(50),
    target_id        UUID,
    subject          VARCHAR(500),
    template_name    VARCHAR(100),
    status           VARCHAR(20) NOT NULL DEFAULT 'CREATED'
                       CHECK (status IN ('CREATED','SENT','OPENED','CONFIRMED','REJECTED','EXPIRED','FAILED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at          TIMESTAMPTZ,
    opened_at        TIMESTAMPTZ,
    executed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_action_recipient ON email_action (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_action_status    ON email_action (status);

-- ── email_token ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash  VARCHAR(64) NOT NULL,
    purpose     VARCHAR(50) NOT NULL
                  CHECK (purpose IN (
                    'PASSWORDLESS_LOGIN','APPROVE_MATCH','REJECT_MATCH',
                    'APPLY_JOB','ALLOW_AUTO_APPLY','CHANGE_THRESHOLD',
                    'INVITE_CANDIDATE','FEEDBACK_ACTION'
                  )),
    user_id     UUID NOT NULL REFERENCES user_account(id),
    action_id   UUID,
    target_type VARCHAR(50),
    target_id   UUID,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_email_token_hash ON email_token (token_hash);

-- ── notification_job ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_job (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type       VARCHAR(50) NOT NULL,
    payload        JSONB NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','PROCESSING','DONE','FAILED','CANCELLED')),
    retry_count    INTEGER NOT NULL DEFAULT 0,
    next_retry_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_job_status ON notification_job (status, next_retry_at);

-- ── audit_log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type     VARCHAR(20) NOT NULL CHECK (actor_type IN ('USER','SYSTEM')),
    actor_id       UUID,
    action_type    VARCHAR(100) NOT NULL,
    target_type    VARCHAR(50),
    target_id      UUID,
    result         VARCHAR(20) CHECK (result IN ('SUCCESS','FAILURE','DENIED')),
    source_channel VARCHAR(20) CHECK (source_channel IN ('WEB','EMAIL','DIGEST','AUTOPILOT','SYSTEM')),
    ip_address     VARCHAR(45),
    user_agent     VARCHAR(500),
    metadata       JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id   ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log (action_type);

-- ── job_trend_snapshot ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_trend_snapshot (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    view_count      INTEGER NOT NULL DEFAULT 0,
    application_count INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_trend_snapshot UNIQUE (job_id, snapshot_date)
);

-- ── job_market_snapshot ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_market_snapshot (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date        DATE NOT NULL,
    total_posted_jobs    INTEGER NOT NULL DEFAULT 0,
    active_jobs          INTEGER NOT NULL DEFAULT 0,
    new_jobs             INTEGER NOT NULL DEFAULT 0,
    employer_count       INTEGER NOT NULL DEFAULT 0,
    distribution_by_role   JSONB,
    distribution_by_salary JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_snapshot_date UNIQUE (snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_market_snapshot_date ON job_market_snapshot (snapshot_date DESC);
