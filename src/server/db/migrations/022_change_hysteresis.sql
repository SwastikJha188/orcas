-- =============================================================================
-- 022 · Hysteresis for sustained-change findings
--
-- A sustained change is raised when the trend window moved a value by
-- evaluation.change_fraction of its reference band; it now clears only when
-- the movement falls below evaluation.change_clear_fraction, so a value hovering
-- at the threshold does not open and close findings every period.
-- =============================================================================

INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('evaluation.change_clear_fraction', 0.3, 'count', 'An open sustained-change finding clears when the trend window''s movement falls below this share of the reference band')
ON CONFLICT (key) DO NOTHING;
