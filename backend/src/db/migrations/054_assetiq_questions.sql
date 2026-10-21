-- =============================================================================
-- 054 · AssetIQ questions per account
--
-- Each account gets its own ten suggested questions in AssetIQ. A question
-- names an answer kind (`intent`) and its parameters; the answer itself is
-- worked out when it is asked, from that account's live data (machine health,
-- open alarms, remaining-life estimates, forecasts, findings, maintenance and
-- support tickets). Nothing in an answer is stored here.
--
-- Intents: plant_status, first_action, open_alarms, worst_machine,
-- explain_machine {machineId}, machine_health {machineId}, part_detail
-- {machineId, part}, next_failure, alarm_forecast, untrusted_sensors,
-- last_hours {hours}, maintenance_due, compare_machines, support_tickets,
-- plants_overview. `scope: "all"` answers across every plant the account
-- opens instead of the plant picked in the top bar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS assetiq_questions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL,
  question VARCHAR(200) NOT NULL,
  intent VARCHAR(32) NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, sort_order)
);

INSERT INTO assetiq_questions (user_id, sort_order, question, intent, params) VALUES
  -- Thandiwe Phiri · reliability engineer, Cement Plant
  ('usr-pyro', 1, 'How is the plant running right now?', 'plant_status', '{}'),
  ('usr-pyro', 2, 'What should I do first?', 'first_action', '{}'),
  ('usr-pyro', 3, 'Which alarms are open, and which has nobody acknowledged?', 'open_alarms', '{}'),
  ('usr-pyro', 4, 'Which machine needs attention most, and why?', 'worst_machine', '{}'),
  ('usr-pyro', 5, 'What is wrong with the grate cooler?', 'explain_machine', '{"machineId":"PYR-CLR-01"}'),
  ('usr-pyro', 6, 'How healthy is the rotary kiln, and which part is weakest?', 'machine_health', '{"machineId":"PYR-KLN-01"}'),
  ('usr-pyro', 7, 'What is most likely to need repair next, and when?', 'next_failure', '{}'),
  ('usr-pyro', 8, 'Which readings will reach an alarm limit in the next 7 days?', 'alarm_forecast', '{}'),
  ('usr-pyro', 9, 'Are any sensors giving readings I should not trust?', 'untrusted_sensors', '{}'),
  ('usr-pyro', 10, 'What changed on the line in the last 6 hours?', 'last_hours', '{"hours":6}'),

  -- Mwila Chanda · plant administrator, Cement Plant
  ('usr-plant-admin', 1, 'How is my plant doing today?', 'plant_status', '{}'),
  ('usr-plant-admin', 2, 'Which machine needs attention most, and why?', 'worst_machine', '{}'),
  ('usr-plant-admin', 3, 'What should my team do first?', 'first_action', '{}'),
  ('usr-plant-admin', 4, 'Which alarms has nobody acknowledged yet?', 'open_alarms', '{}'),
  ('usr-plant-admin', 5, 'What maintenance is due or overdue?', 'maintenance_due', '{}'),
  ('usr-plant-admin', 6, 'What is most likely to need repair next, and when?', 'next_failure', '{}'),
  ('usr-plant-admin', 7, 'Which readings will reach an alarm limit in the next 7 days?', 'alarm_forecast', '{}'),
  ('usr-plant-admin', 8, 'How do my six machines compare?', 'compare_machines', '{}'),
  ('usr-plant-admin', 9, 'What changed in the last 6 hours?', 'last_hours', '{"hours":6}'),
  ('usr-plant-admin', 10, 'Do we have support tickets waiting for an answer?', 'support_tickets', '{}'),

  -- Arjun Mehta · reliability engineer, Vacuum Casting Plant
  ('usr-vpc', 1, 'How are the casting machines running right now?', 'plant_status', '{}'),
  ('usr-vpc', 2, 'How do the three casting machines compare?', 'compare_machines', '{}'),
  ('usr-vpc', 3, 'Which casting machine needs attention most, and why?', 'worst_machine', '{}'),
  ('usr-vpc', 4, 'What is wrong with Unit 03?', 'explain_machine', '{"machineId":"VPC-068"}'),
  ('usr-vpc', 5, 'How healthy is Unit 01, and which part is weakest?', 'machine_health', '{"machineId":"VPC-066"}'),
  ('usr-vpc', 6, 'Which alarms are open, and which has nobody acknowledged?', 'open_alarms', '{}'),
  ('usr-vpc', 7, 'What is most likely to need repair next, and when?', 'next_failure', '{}'),
  ('usr-vpc', 8, 'Which readings will reach an alarm limit in the next 7 days?', 'alarm_forecast', '{}'),
  ('usr-vpc', 9, 'Are any sensors giving readings I should not trust?', 'untrusted_sensors', '{}'),
  ('usr-vpc', 10, 'What should I do first?', 'first_action', '{}'),

  -- Kiln demo · one machine, KLN-01
  ('usr-kiln-demo', 1, 'How healthy is the kiln right now?', 'machine_health', '{"machineId":"KLN-01"}'),
  ('usr-kiln-demo', 2, 'What is wrong with the kiln?', 'explain_machine', '{"machineId":"KLN-01"}'),
  ('usr-kiln-demo', 3, 'What should I do first?', 'first_action', '{}'),
  ('usr-kiln-demo', 4, 'Which alarms are open on the kiln?', 'open_alarms', '{}'),
  ('usr-kiln-demo', 5, 'How is the inlet seal doing?', 'part_detail', '{"machineId":"KLN-01","part":"inlet lamella seal"}'),
  ('usr-kiln-demo', 6, 'How are the three support stations doing?', 'part_detail', '{"machineId":"KLN-01","part":"support station"}'),
  ('usr-kiln-demo', 7, 'Which part of the kiln will need repair first, and when?', 'next_failure', '{}'),
  ('usr-kiln-demo', 8, 'Which readings will reach an alarm limit in the next 7 days?', 'alarm_forecast', '{}'),
  ('usr-kiln-demo', 9, 'Are any of the kiln''s sensors giving readings I should not trust?', 'untrusted_sensors', '{}'),
  ('usr-kiln-demo', 10, 'What changed on the kiln in the last 6 hours?', 'last_hours', '{"hours":6}'),

  -- Swastik Jha · enterprise administrator (kiln-seal, concentrator and hydraulics plants)
  ('usr-swastik', 1, 'Which of my plants needs attention most?', 'plants_overview', '{}'),
  ('usr-swastik', 2, 'How is this plant running right now?', 'plant_status', '{}'),
  ('usr-swastik', 3, 'Which machine in this plant needs attention most, and why?', 'worst_machine', '{}'),
  ('usr-swastik', 4, 'How do the machines in this plant compare?', 'compare_machines', '{}'),
  ('usr-swastik', 5, 'Which alarms are open, and which has nobody acknowledged?', 'open_alarms', '{}'),
  ('usr-swastik', 6, 'What should be done first?', 'first_action', '{}'),
  ('usr-swastik', 7, 'What is most likely to need repair next, and when?', 'next_failure', '{}'),
  ('usr-swastik', 8, 'Which readings will reach an alarm limit in the next 7 days?', 'alarm_forecast', '{}'),
  ('usr-swastik', 9, 'Are any sensors giving readings I should not trust?', 'untrusted_sensors', '{}'),
  ('usr-swastik', 10, 'What changed in the last 6 hours?', 'last_hours', '{"hours":6}'),

  -- Oswar Teck · super administrator (every plant)
  ('usr-oswar', 1, 'Which plant needs attention most?', 'plants_overview', '{}'),
  ('usr-oswar', 2, 'Do any plants have support tickets waiting for an answer?', 'support_tickets', '{}'),
  ('usr-oswar', 3, 'Which machine across all plants needs attention most?', 'worst_machine', '{"scope":"all"}'),
  ('usr-oswar', 4, 'Which alarms are open across all plants?', 'open_alarms', '{"scope":"all"}'),
  ('usr-oswar', 5, 'How is the plant picked at the top running right now?', 'plant_status', '{}'),
  ('usr-oswar', 6, 'What should be done first in this plant?', 'first_action', '{}'),
  ('usr-oswar', 7, 'What is most likely to need repair next in this plant, and when?', 'next_failure', '{}'),
  ('usr-oswar', 8, 'Which readings in this plant will reach an alarm limit in the next 7 days?', 'alarm_forecast', '{}'),
  ('usr-oswar', 9, 'Are any sensors in this plant giving readings I should not trust?', 'untrusted_sensors', '{}'),
  ('usr-oswar', 10, 'What changed in this plant in the last 6 hours?', 'last_hours', '{"hours":6}')
ON CONFLICT (user_id, sort_order) DO NOTHING;
