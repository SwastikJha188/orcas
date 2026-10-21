-- =============================================================================
-- 008 · Reference derivation settings
-- =============================================================================

INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('reference.derive_sigma', 3, 'count', 'A derived reference range is the mean ± this many standard deviations of the window''s usable readings'),
  ('reference.min_samples', 30, 'count', 'Readings a measurement needs in the window before a derived reference includes it')
ON CONFLICT (key) DO NOTHING;
