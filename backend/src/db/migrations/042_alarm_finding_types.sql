-- Which kinds of finding are alarms. An open alarm is a reading past its limit or a
-- matched problem pattern (plus alarms recorded by hand); early warnings such as
-- "behaving differently than usual" or "steadily changing" stay findings on Diagnosis
-- and Analysis but are not counted as alarms. Home's alarm list, the Problems page and
-- the rail's alarm count all read this, so they always show the same number.
ALTER TABLE finding_types ADD COLUMN IF NOT EXISTS raises_alarm BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE finding_types SET raises_alarm = TRUE WHERE id IN ('limit_exceeded', 'rule_pattern');
