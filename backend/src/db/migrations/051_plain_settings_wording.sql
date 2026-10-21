-- =============================================================================
-- 051 · Plain settings wording
--
-- Monitoring settings (Configure) read in everyday words: no "finding",
-- "reference band" or "publish period". The fixture carries the same text.
-- =============================================================================

UPDATE system_settings SET description = 'How long a person stays signed in before they must sign in again' WHERE key = 'auth.session_days';
UPDATE system_settings SET description = 'A slow-change warning clears when the reading has moved less than this share of its normal range' WHERE key = 'evaluation.change_clear_fraction';
UPDATE system_settings SET description = 'A slow-change warning is raised when a reading has moved this share of its normal range, even while it is still inside its limits' WHERE key = 'evaluation.change_fraction';
UPDATE system_settings SET description = 'Readings in a row back inside the normal range before an unusual-behaviour warning clears' WHERE key = 'evaluation.clear_samples';
UPDATE system_settings SET description = 'Readings in a row outside the normal range before an unusual-behaviour warning is raised' WHERE key = 'evaluation.deviation_samples';
UPDATE system_settings SET description = 'Readings needed before ULTRON judges whether a value is slowly changing' WHERE key = 'evaluation.min_trend_samples';
UPDATE system_settings SET description = 'How often ULTRON checks new readings and updates alarms and machine health' WHERE key = 'evaluation.period_s';
UPDATE system_settings SET description = 'Readings in a row in a normal state before an on/off sensor''s warning clears (when the sensor has no limit of its own)' WHERE key = 'evaluation.state_clear_samples';
UPDATE system_settings SET description = 'Readings in a row in an abnormal state before an on/off sensor raises a warning (when the sensor has no limit of its own)' WHERE key = 'evaluation.state_raise_samples';
UPDATE system_settings SET description = 'How far back ULTRON looks when judging whether a value is slowly changing' WHERE key = 'evaluation.trend_window_h';
UPDATE system_settings SET description = 'Unusable readings in a row before a sensor''s data is marked as not trustworthy' WHERE key = 'evaluation.unreliable_samples';
UPDATE system_settings SET description = 'How often each machine''s health is saved' WHERE key = 'health.bucket_s';
UPDATE system_settings SET description = 'How long saved machine health is kept' WHERE key = 'health.sample_keep_h';
UPDATE system_settings SET description = 'How long hourly averages of readings are kept' WHERE key = 'readings.hourly_keep_d';
UPDATE system_settings SET description = 'How often a gateway sends each reading to ULTRON' WHERE key = 'readings.publish_period_s';
UPDATE system_settings SET description = 'How long every single reading is kept before it is turned into hourly averages' WHERE key = 'readings.raw_keep_h';
UPDATE system_settings SET description = 'How many send intervals can pass without a reading before a sensor is shown as out of date (when the sensor has no time of its own)' WHERE key = 'readings.stale_factor';
UPDATE system_settings SET description = 'How wide a learned normal range is: the average plus or minus this many standard deviations' WHERE key = 'reference.derive_sigma';
UPDATE system_settings SET description = 'Readings a sensor needs before ULTRON learns its normal range' WHERE key = 'reference.min_samples';
