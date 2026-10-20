-- =============================================================================
-- 006 · Health model scope
--
-- * machine_systems.scored: process-context systems describe the operating
--   point, not machine condition, and do not count toward the machine score.
-- * One parameter set covers both models: the vacuum-casting model simply
--   gives deviation no weight and combines components by their mean.
-- =============================================================================

ALTER TABLE machine_systems ADD COLUMN IF NOT EXISTS scored BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO health_model_parameters (model_id, key, value, description) VALUES
  ('penalty-v1', 'system_min_weight', 0.5, 'Weight of the worst component when a system score is formed (the rest goes to the mean)'),
  ('penalty-vpc-v1', 'system_min_weight', 0, 'Weight of the worst component when a system score is formed (the rest goes to the mean)'),
  ('penalty-vpc-v1', 'z_free', 3, '|z| below this costs nothing'),
  ('penalty-vpc-v1', 'z_weight', 0, 'Points per unit of |z| above the free band (deviation is not scored in this model)'),
  ('penalty-vpc-v1', 'z_cap', 0, 'Most points deviation alone can cost'),
  ('penalty-vpc-v1', 'rule_watch', 0, 'Points for a rule that is building up (watch)')
ON CONFLICT (model_id, key) DO NOTHING;

-- The kiln-seal fleet's process-context system is not scored (D5 §9).
UPDATE machine_systems SET scored = FALSE WHERE system_id ~ '^PRC-';
