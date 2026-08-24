-- V9: Advanced analytics event stream.

CREATE TABLE IF NOT EXISTS analytics_event (
    id UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES user_account(id) ON DELETE SET NULL,
    actor_role VARCHAR(30),
    event_type VARCHAR(60) NOT NULL,
    subject_type VARCHAR(60),
    subject_id UUID,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_time
    ON analytics_event (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_event_actor_time
    ON analytics_event (actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_event_subject_time
    ON analytics_event (subject_type, subject_id, occurred_at DESC);
