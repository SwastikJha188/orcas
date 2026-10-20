-- =============================================================================
-- 005 · Machine Health Index history
--
-- The evaluation stores each score it computes. Status is not stored: it is
-- derived from the score and the health model's bands when read.
-- =============================================================================

CREATE TABLE IF NOT EXISTS machine_health_scores (
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  scored_at TIMESTAMPTZ NOT NULL,
  score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
  PRIMARY KEY (machine_id, scored_at)
);

CREATE TABLE IF NOT EXISTS subassembly_health_scores (
  subassembly_id VARCHAR(64) NOT NULL REFERENCES machine_subassemblies(id) ON DELETE CASCADE,
  scored_at TIMESTAMPTZ NOT NULL,
  score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
  PRIMARY KEY (subassembly_id, scored_at)
);
CREATE INDEX IF NOT EXISTS idx_subassembly_health_scores_t ON subassembly_health_scores(scored_at);

INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('evaluation.change_fraction', 0.5, 'count', 'A sustained change is flagged when the trend window moved the value by this share of its reference band (still inside the limits)'),
  ('evaluation.min_trend_samples', 10, 'count', 'Readings a trend window needs before a change is judged')
ON CONFLICT (key) DO NOTHING;
