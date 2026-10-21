-- =============================================================================
-- 023 · Persistence for data-quality and state findings
--
-- An isolated unusable reading (a dropped or flagged sample) no longer opens a
-- data finding: it takes evaluation.unreliable_samples unusable readings in a
-- row. State-valued measurements without a limit row raise and clear with
-- evaluation.state_raise_samples / evaluation.state_clear_samples (previously
-- constants in the evaluation code).
-- =============================================================================

INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('evaluation.unreliable_samples', 3, 'count', 'Consecutive unusable readings before a measurement''s data is reported unreliable'),
  ('evaluation.state_raise_samples', 2, 'count', 'Consecutive readings in an abnormal state before a state measurement raises a finding (when it has no limit of its own)'),
  ('evaluation.state_clear_samples', 4, 'count', 'Consecutive readings in a normal state before a state measurement''s finding clears (when it has no limit of its own)')
ON CONFLICT (key) DO NOTHING;
