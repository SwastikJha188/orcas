-- =============================================================================
-- 024 · Three condition levels: Normal · Alert · Critical
--
-- The middle severity is called Alert (was Advisory). The key is renamed in
-- place; findings, machine events and measurement states follow through
-- ON UPDATE CASCADE. Plant status and the descriptive texts that name the
-- level are updated to match.
-- =============================================================================

ALTER TABLE findings DROP CONSTRAINT findings_severity_id_fkey,
  ADD CONSTRAINT findings_severity_id_fkey FOREIGN KEY (severity_id) REFERENCES severities(id) ON UPDATE CASCADE;
ALTER TABLE machine_events DROP CONSTRAINT machine_events_severity_id_fkey,
  ADD CONSTRAINT machine_events_severity_id_fkey FOREIGN KEY (severity_id) REFERENCES severities(id) ON UPDATE CASCADE;
ALTER TABLE measurement_states DROP CONSTRAINT measurement_states_severity_id_fkey,
  ADD CONSTRAINT measurement_states_severity_id_fkey FOREIGN KEY (severity_id) REFERENCES severities(id) ON UPDATE CASCADE;

UPDATE severities SET id = 'Alert' WHERE id = 'Advisory';

ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_status_check;
UPDATE plants SET status = 'Alert' WHERE status = 'Advisory';
ALTER TABLE plants ADD CONSTRAINT plants_status_check CHECK (status IN ('Operational', 'Alert', 'Standby', 'Maintenance'));

UPDATE rules SET logic = regexp_replace(logic, '\mAdvisory\M', 'Alert', 'g') WHERE logic ~ '\mAdvisory\M';
UPDATE rules SET hold = regexp_replace(hold, '\mAdvisory\M', 'Alert', 'g') WHERE hold ~ '\mAdvisory\M';
UPDATE health_model_parameters SET description = regexp_replace(description, '\mAdvisory\M', 'Alert', 'g') WHERE description ~ '\mAdvisory\M';
UPDATE plants SET description = regexp_replace(description, '\mAdvisory\M', 'Alert', 'g') WHERE description ~ '\mAdvisory\M';
UPDATE component_replacement_logs SET condition_before = regexp_replace(condition_before, '\mAdvisory\M', 'Alert', 'g') WHERE condition_before ~ '\mAdvisory\M';
