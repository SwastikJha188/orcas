-- =============================================================================
-- 049 · Demo requests
--
-- Sent from the sign-in page by visitors who have no account yet. One row per
-- request; OSWAR/teck follows up by email.
-- =============================================================================

CREATE TABLE IF NOT EXISTS demo_requests (
  id          BIGSERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
  email       TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  company     TEXT NOT NULL CHECK (length(company) BETWEEN 1 AND 200),
  industry    TEXT CHECK (length(industry) <= 100),
  message     TEXT CHECK (length(message) <= 4000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_requests_created_at_idx ON demo_requests (created_at DESC);
