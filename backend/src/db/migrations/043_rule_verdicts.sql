-- Operators' answer to "Is this problem real?" on the Analysis page, stored for everyone
-- (it used to live in one browser only). Each answer is kept with who gave it and when;
-- the latest row for a rule is its current answer, a row with no kind withdraws it.
CREATE TABLE IF NOT EXISTS verdict_kinds (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  sort_order INTEGER NOT NULL
);
INSERT INTO verdict_kinds (id, name, sort_order) VALUES
  ('confirm', 'Real problem', 1),
  ('false-alarm', 'False alarm', 2),
  ('new-normal', 'Accept as normal', 3)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS rule_verdicts (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  verdict_kind_id VARCHAR(16) REFERENCES verdict_kinds(id),
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rule_verdicts_rule ON rule_verdicts(rule_id, recorded_at DESC);
