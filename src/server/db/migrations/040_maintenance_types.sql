-- =============================================================================
-- 040 · Maintenance by type: preventive, predictive / planned, proactive
--
-- Preventive   the checklist rounds grouped as the plant works them: daily
--              (each shift + daily), weekly, every 15 days, monthly, longer
--              intervals / shutdowns, and the instrument checklist.
-- Predictive   every alarm the server evaluation raises (a limit crossed or a
--              diagnostic pattern on a scored rule) issues a "go and check"
--              task automatically; the person who checks records what they
--              found, and a confirmed problem becomes a repair request.
--              Engineers also plan jobs by hand (work orders with a date).
-- Proactive    part service lives: life criterion against the machine's
--              running-hours counter; parts are replaced before they run out.
-- =============================================================================

/* ---------------------------------------------------------------- preventive */

CREATE TABLE IF NOT EXISTS maintenance_preventive_groups (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(48) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO maintenance_preventive_groups (id, label, sort_order) VALUES
  ('daily', 'Daily', 1),
  ('weekly', 'Weekly', 2),
  ('fortnightly', '15 days', 3),
  ('monthly', 'Monthly', 4),
  ('longer', 'Longer & shutdown', 5),
  ('instruments', 'Instruments', 6)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE maintenance_routes ADD COLUMN IF NOT EXISTS preventive_group_id VARCHAR(16) REFERENCES maintenance_preventive_groups(id);

-- The 15-day round (no document task uses it yet; engineers add items to it).
INSERT INTO maintenance_routes (id, label, interval_hours, sort_order, plan_code, trigger_label)
VALUES ('fortnightly', '15-day', 360, 3, 'F', 'Calendar')
ON CONFLICT (id) DO NOTHING;

UPDATE maintenance_routes SET sort_order = CASE id
  WHEN 'shift' THEN 0 WHEN 'daily' THEN 1 WHEN 'weekly' THEN 2 WHEN 'fortnightly' THEN 3 WHEN 'monthly' THEN 4
  WHEN 'quarterly' THEN 5 WHEN 'annual' THEN 6 WHEN 'stop' THEN 7 WHEN 'event' THEN 8 WHEN 'live' THEN 9
  WHEN 'oem' THEN 10 WHEN 'site' THEN 11 ELSE sort_order END;

UPDATE maintenance_routes SET preventive_group_id = CASE id
  WHEN 'shift' THEN 'daily' WHEN 'daily' THEN 'daily' WHEN 'weekly' THEN 'weekly' WHEN 'fortnightly' THEN 'fortnightly'
  WHEN 'monthly' THEN 'monthly' WHEN 'quarterly' THEN 'longer' WHEN 'annual' THEN 'longer' WHEN 'stop' THEN 'longer'
  WHEN 'event' THEN 'longer' WHEN 'live' THEN 'instruments' WHEN 'oem' THEN 'instruments' WHEN 'site' THEN 'instruments'
  ELSE preventive_group_id END;

INSERT INTO maintenance_kind_routes (kind, route_id, addable, sort_order) VALUES ('equipment', 'fortnightly', TRUE, 3)
ON CONFLICT (kind, route_id) DO NOTHING;
UPDATE maintenance_kind_routes SET sort_order = CASE route_id
  WHEN 'shift' THEN 0 WHEN 'daily' THEN 1 WHEN 'weekly' THEN 2 WHEN 'fortnightly' THEN 3 WHEN 'monthly' THEN 4
  WHEN 'quarterly' THEN 5 WHEN 'annual' THEN 6 WHEN 'stop' THEN 7 WHEN 'event' THEN 8 ELSE sort_order END
WHERE kind = 'equipment';

INSERT INTO maintenance_frequencies (code, route_id, label, canonical) VALUES ('15 days', 'fortnightly', '15 days', TRUE)
ON CONFLICT (code) DO NOTHING;

/* ---------------------------------------------------------------- types */

CREATE TABLE IF NOT EXISTS maintenance_types (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(48) NOT NULL,
  description TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO maintenance_types (id, label, description, sort_order) VALUES
  ('preventive', 'Preventive', 'Fixed rounds from the maintenance checklists: daily, weekly, every 15 days, monthly and longer.', 1),
  ('predictive', 'Predictive & planned', 'Checks raised automatically by alarms, and jobs engineers plan.', 2),
  ('proactive', 'Proactive', 'Parts replaced or overhauled before their service life runs out.', 3)
ON CONFLICT (id) DO NOTHING;

/* ---------------------------------------------------------------- predictive: alert checks */

-- Priority a check raised by an alarm of this severity gets (its due time is the priority's response time).
ALTER TABLE severities ADD COLUMN IF NOT EXISTS check_priority_id VARCHAR(8) REFERENCES work_order_priorities(id);
UPDATE severities SET check_priority_id = 'P1' WHERE id = 'Critical' AND check_priority_id IS NULL;
UPDATE severities SET check_priority_id = 'P2' WHERE id = 'Alert' AND check_priority_id IS NULL;

-- One "go and check" task per alarm finding. Machine, time raised, severity and
-- what to check all come from the finding (and its rule / measurement).
CREATE TABLE IF NOT EXISTS alert_checks (
  id SERIAL PRIMARY KEY,
  finding_id BIGINT NOT NULL UNIQUE REFERENCES findings(id) ON DELETE CASCADE,
  result VARCHAR(16) CHECK (result IN ('fine', 'problem')),
  note TEXT,
  checked_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  checked_at TIMESTAMP WITH TIME ZONE,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  CHECK ((result IS NULL) = (checked_at IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_alert_checks_open ON alert_checks(finding_id) WHERE result IS NULL;

/* ---------------------------------------------------------------- proactive: part service lives */

-- Life criterion of a part (OEM / plant), in running hours ('h') or days ('d') of
-- plant time. `used` was recorded when the machine's running-hours counter read
-- `counter_h`; what is used now = used + (counter now − counter_h) (÷ 24 for days).
CREATE TABLE IF NOT EXISTS component_service_lives (
  id VARCHAR(32) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  subassembly_ref_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  basis CHAR(1) NOT NULL CHECK (basis IN ('h', 'd')),
  life NUMERIC NOT NULL CHECK (life > 0),
  due_share NUMERIC NOT NULL CHECK (due_share > 0 AND due_share <= 1),
  used NUMERIC NOT NULL CHECK (used >= 0),
  counter_h NUMERIC NOT NULL,
  installed VARCHAR(64),
  duty VARCHAR(160),
  record_source VARCHAR(255),
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_component_service_lives_machine ON component_service_lives(machine_id, sort_order);

CREATE TABLE IF NOT EXISTS component_service_events (
  id SERIAL PRIMARY KEY,
  component_id VARCHAR(32) NOT NULL REFERENCES component_service_lives(id) ON DELETE CASCADE,
  action VARCHAR(16) NOT NULL CHECK (action IN ('replaced', 'corrected')),
  used_before NUMERIC,
  counter_h NUMERIC NOT NULL,
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_component_service_events_component ON component_service_events(component_id, at DESC);

-- The pyro line's service records (D4 Table 8.3 / SW-ALL-01). The plant has not
-- supplied its records (D4 Table 9.1); these are the simulation's records, as
-- used since the plant started (running-hours counter 0).
INSERT INTO component_service_lives (id, machine_id, subassembly_ref_id, name, basis, life, due_share, used, counter_h, installed, duty, record_source, sort_order)
SELECT v.id, v.machine_id,
       (SELECT sa.id FROM machine_subassemblies sa JOIN machine_systems s ON s.id = sa.machine_system_ref_id
         WHERE s.machine_id = v.machine_id AND sa.subassembly_id = v.sub LIMIT 1),
       v.name, v.basis, v.life, 0.9, v.used, 0, v.installed, v.duty,
       'Simulation record: the plant has not supplied its service records yet', v.sort_order
  FROM (VALUES
    ('FSL-C1', 'PYR-FED-01', 'fsl-aeration', 'Aeration blower filter / belts', 'h', 8000, 6100, '2026-01-24 (belt set)', 'Duty blower, continuous', 1),
    ('KFS-C1', 'PYR-FED-01', 'kfs-dosing', 'Air-slide fabric', 'h', 16000, 14480, '2024-09-02', 'Continuous aeration', 2),
    ('KFS-C2', 'PYR-FED-01', 'kfs-elevator', 'Elevator belt and buckets', 'h', 30000, 17900, '2025-03-11', 'Kiln feed, continuous', 3),
    ('PHC-C1', 'PYR-PHC-01', 'phc-idfan', 'ID fan bearings (regrease / replace)', 'h', 26000, 11800, '2025-06-30', 'Variable speed', 4),
    ('KLN-C1', 'PYR-KLN-01', 'kln-aux', 'Main-drive brake pads', 'd', 730, 500, '2025-05-27', 'Holding brake, stops only', 5),
    ('KLN-C2', 'PYR-KLN-01', 'kln-lube', 'Gearbox oil charge', 'h', 8000, 7230, '2025-12-01', 'Circulating, filtered', 6),
    ('BRN-C1', 'PYR-BRN-01', 'brn-burner', 'Burner tip', 'd', 365, 190, '2026-04-07', 'Continuous firing', 7),
    ('CLR-C1', 'PYR-CLR-01', 'clr-hot', 'Grate plates, compartment 1', 'h', 20000, 18850, '2024-07-15', 'Hot inlet zone', 8),
    ('HMR-C1', 'PYR-CCT-01', 'hmr-rotor', 'Hammer set', 'h', 6000, 4250, '2026-02-09', 'Clinker, continuous', 9),
    ('CSL-C1', 'PYR-CCT-01', 'csl-silo', 'Baghouse filter bags', 'h', 17500, 9600, '2025-04-18', 'Pulse-jet, continuous', 10)
  ) AS v(id, machine_id, sub, name, basis, life, used, installed, duty, sort_order)
  JOIN machines m ON m.id = v.machine_id
ON CONFLICT (id) DO NOTHING;

/* ---------------------------------------------------------------- job sources */

-- Why a work order exists, when it was raised from one of the maintenance types
-- (an inspection defect is preventive through maintenance_records; a check
-- through alert_checks).
CREATE TABLE IF NOT EXISTS maintenance_job_sources (
  work_order_id INTEGER PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
  type_id VARCHAR(16) NOT NULL REFERENCES maintenance_types(id),
  component_id VARCHAR(32) REFERENCES component_service_lives(id) ON DELETE SET NULL,
  subassembly_ref_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE SET NULL
);
