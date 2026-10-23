-- =============================================================================
-- 060 · AI models for reading uploads
--
-- The Claude models the onboarding / photo-drawing processor can run (Claude
-- Code `--model`). Exactly one row is the current choice; Configure lets an
-- administrator switch it. Each run records the model it used
-- (onboarding_runs.model), so earlier results keep their model.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_models (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  sort SMALLINT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_models_one_current ON ai_models (is_current) WHERE is_current;

INSERT INTO ai_models (id, label, description, sort, is_current) VALUES
  ('claude-opus-5-5', 'Opus 5.5', 'Most capable; slowest and most costly per upload', 1, TRUE),
  ('claude-sonnet-5-5', 'Sonnet 5.5', 'Balanced speed and quality', 2, FALSE),
  ('claude-haiku-5-5', 'Haiku 5.5', 'Fastest and cheapest', 3, FALSE)
ON CONFLICT (id) DO NOTHING;
