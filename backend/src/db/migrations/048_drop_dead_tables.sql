-- Drops tables nothing reads or writes any more (2026-10-21 schema audit).
-- No foreign key from a kept table points at any of them. Their data is in the
-- pre-audit backup.
--
-- Legacy tables that predate the migrations (no migration creates them, no
-- code uses them): boot_on_ground_records, engineering_analyses,
-- resource_requests, shutdown_plans, inspection_rounds, smtp_notification_logs,
-- component_replacement_logs, machine_bom_items, finding_feedback_records
-- (replaced by rule_verdicts, 043), machine_operating_states (the case pages
-- read the evaluator's machine_state_periods instead).
--
-- plant_health_samples: dropped by 019 and recreated outside the migrations;
-- empty.
--
-- Empty tables no feature fills: rule_parameters, measurement_formulas.
--
-- Retired features whose API had no caller: process stages (/api/process),
-- rack slots (/api/racks; rack_chassis stays for /api/rack-units), the client-
-- synced alarm journal (alarm_events, alert_acks; findings and
-- finding_acknowledgements are the alarm record) and the AI prediction log
-- (ai_predictions, /api/predictions).

DROP TABLE IF EXISTS
  boot_on_ground_records,
  engineering_analyses,
  resource_requests,
  shutdown_plans,
  inspection_rounds,
  smtp_notification_logs,
  component_replacement_logs,
  machine_bom_items,
  finding_feedback_records,
  machine_operating_states,
  plant_health_samples,
  rule_parameters,
  measurement_formulas,
  process_stage_measurements,
  process_stage_parts,
  process_stage_streams,
  process_stages,
  rack_slots,
  alarm_events,
  alert_acks,
  ai_predictions;
