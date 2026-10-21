-- =============================================================================
-- 003 · System settings
--
-- Operating parameters of the monitoring pipeline (how often readings are
-- stored, how long they are kept, how often the evaluation runs). Changing a
-- row changes the behaviour; nothing here is compiled into the application.
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(64) PRIMARY KEY,
  value DOUBLE PRECISION NOT NULL,
  unit_id VARCHAR(32) REFERENCES units(id),
  description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO units (id, symbol, name) VALUES
  ('s', 's', 'second'),
  ('h', 'h', 'hour'),
  ('d', 'd', 'day'),
  ('count', 'count', 'count')
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('readings.publish_period_s', 60, 's', 'How often a simulated gateway publishes each measurement to the database'),
  ('readings.raw_keep_h', 12, 'h', 'Raw readings older than this are summarised into hourly rows and removed'),
  ('readings.hourly_keep_d', 30, 'd', 'Hourly summaries older than this are removed'),
  ('readings.stale_factor', 3, 'count', 'A measurement is stale after this many publish periods without a reading (when it has no own stale time)'),
  ('evaluation.period_s', 60, 's', 'How often the server evaluates readings into findings and health'),
  ('evaluation.trend_window_h', 6, 'h', 'Window used for trend features (change and rate) in findings'),
  ('evaluation.deviation_samples', 5, 'count', 'Consecutive readings outside the reference before a behaviour deviation is raised'),
  ('evaluation.clear_samples', 5, 'count', 'Consecutive readings inside the reference before a behaviour deviation clears'),
  ('health.sample_keep_h', 24, 'h', 'Machine health samples older than this are removed'),
  ('health.bucket_s', 10, 's', 'Width of one stored machine health sample')
ON CONFLICT (key) DO NOTHING;
