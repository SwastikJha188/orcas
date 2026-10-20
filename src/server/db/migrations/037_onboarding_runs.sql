-- =============================================================================
-- 037 · Onboarding runs
--
-- Each time the app asks Claude Code (Haiku) to read an onboarding's waiting
-- uploads (src/server/onboarding/claude-runner.ts): its state, the step it is
-- on, the tail of its log and what it cost, so the page can show progress and
-- a failed run can be read and retried.
-- =============================================================================

CREATE TABLE IF NOT EXISTS onboarding_runs (
  id           SERIAL PRIMARY KEY,
  package_id   VARCHAR(64) NOT NULL REFERENCES onboarding_packages(id) ON DELETE CASCADE,
  status       VARCHAR(16) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed', 'stopped')),
  model        VARCHAR(64) NOT NULL,
  pid          INTEGER,
  last_step    TEXT,
  log          TEXT NOT NULL DEFAULT '',
  error        TEXT,
  cost_usd     DOUBLE PRECISION,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_onboarding_runs_package ON onboarding_runs(package_id, started_at DESC);
