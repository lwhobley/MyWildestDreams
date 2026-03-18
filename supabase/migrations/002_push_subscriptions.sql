-- ─── Push Subscriptions Table ─────────────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,  -- client public key
  auth         TEXT NOT NULL,  -- auth secret
  user_agent   TEXT,
  platform     TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'ios', 'android')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX push_subscriptions_active_idx ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- RLS: users manage only their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- ─── Notification Log (for debugging + deduplication) ────────────────────────
CREATE TABLE notification_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,   -- 'morning_reminder' | 'render_complete' | 'streak_alert' | 'weekly_report'
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered    BOOLEAN NOT NULL DEFAULT FALSE,
  error        TEXT
);

CREATE INDEX notification_log_user_id_idx ON notification_log(user_id);
CREATE INDEX notification_log_sent_at_idx ON notification_log(sent_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notification log" ON notification_log FOR SELECT USING (auth.uid() = user_id);
