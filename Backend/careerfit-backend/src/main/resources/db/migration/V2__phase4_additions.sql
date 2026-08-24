-- ============================================================
-- V2__phase4_additions.sql
-- CareerFit IT AutoPilot – Phase 4 additions
-- Adds: email_action_token table (one-click feedback tokens)
--       feedback table cleanup (ensure actor_id FK is correct)
--       candidate profile additional fields
-- ============================================================

-- ── email_action_token ─────────────────────────────────────────────────────────
-- New table for one-click tokenized email actions (GOOD_MATCH, BAD_MATCH, etc.)
-- Separate from the old email_action table which is for scheduling/tracking.

CREATE TABLE IF NOT EXISTS email_action_token (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token        VARCHAR(64) NOT NULL,
    recipient_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    matching_id  UUID REFERENCES matching(id) ON DELETE CASCADE,
    action_type  VARCHAR(50) NOT NULL
                   CHECK (action_type IN (
                     'GOOD_MATCH','POTENTIAL','BAD_MATCH',
                     'NOT_INTERESTED','VIEW_JOB','UNSUBSCRIBE_DIGEST'
                   )),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','REDEEMED','EXPIRED')),
    expires_at   TIMESTAMPTZ NOT NULL,
    redeemed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_action_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_email_action_token_token   ON email_action_token (token);
CREATE INDEX IF NOT EXISTS idx_email_action_token_expires ON email_action_token (expires_at);
CREATE INDEX IF NOT EXISTS idx_email_action_token_recip   ON email_action_token (recipient_id);

-- ── candidate: add avatar_url field ──────────────────────────────────────────

ALTER TABLE candidate
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- ── job: add deadline and applicant_count fields ──────────────────────────────

ALTER TABLE job
    ADD COLUMN IF NOT EXISTS deadline          DATE,
    ADD COLUMN IF NOT EXISTS applicant_count   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS view_count        INTEGER NOT NULL DEFAULT 0;

-- ── matching: add recruiter-side label ───────────────────────────────────────

ALTER TABLE matching
    ADD COLUMN IF NOT EXISTS recruiter_label VARCHAR(30)
        CHECK (recruiter_label IN ('APPROVED','POTENTIAL','REJECTED','PENDING'));

-- ── job_market_snapshot: composite index for dashboard queries ───────────────

CREATE INDEX IF NOT EXISTS idx_job_market_snapshot_date
    ON job_market_snapshot (snapshot_date DESC);
