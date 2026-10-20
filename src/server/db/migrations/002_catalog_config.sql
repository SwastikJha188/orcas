-- =============================================================================
-- 002 · Configuration that used to be hard-coded in the application
--
-- * measurement specification text kept from the source documents
-- * the documented acquisition path of a measurement (rack / card / address)
-- * which engine simulates a machine (and with which seed / profile)
-- * the plant's primary machine (plant-wide features follow it)
-- * work-order priorities and their response times
-- * the Machine Health Index models and their parameters
-- =============================================================================

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS sensor_type VARCHAR(255);
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS install_status VARCHAR(128);
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS priority VARCHAR(64);
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS standard TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS acquisition_text TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS range_text TEXT;
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS normal_text VARCHAR(128);

-- Documented wiring of a measurement (D5 signal schedules). The live edge
-- registry (edge_points) links to the measurement separately.
CREATE TABLE IF NOT EXISTS measurement_acquisition (
  measurement_id VARCHAR(128) PRIMARY KEY REFERENCES measurements(id) ON DELETE CASCADE,
  rack VARCHAR(255) NOT NULL,
  card VARCHAR(255) NOT NULL,
  address VARCHAR(128)
);

ALTER TABLE edge_points ADD COLUMN IF NOT EXISTS measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_edge_points_measurement ON edge_points(measurement_id);

-- Machines driven by a simulation engine (a stand-in for the real gateway).
CREATE TABLE IF NOT EXISTS simulation_engines (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL
);
INSERT INTO simulation_engines (id, name, description) VALUES
  ('kiln', 'Kiln-seal engine', 'Rotary kiln drive, support, shell and seal model (D4/D5-OSW-PE-KLN)'),
  ('pyro', 'Pyro line engine', 'Coupled pyroprocessing line model (D4/D5-OSW-PE-PYR)'),
  ('vpc', 'Vacuum casting engine', 'Schultheiss VPC 066 casting cycle model')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS machine_simulations (
  machine_id VARCHAR(64) PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  engine_id VARCHAR(16) NOT NULL REFERENCES simulation_engines(id),
  seed INTEGER,
  profile VARCHAR(32),
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE plants ADD COLUMN IF NOT EXISTS primary_machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS work_order_priorities (
  id VARCHAR(8) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  response_minutes INTEGER NOT NULL CHECK (response_minutes > 0),
  description TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
INSERT INTO work_order_priorities (id, name, response_minutes, description, sort_order) VALUES
  ('P1', 'Immediate', 60, 'Act now: a critical condition or safety risk', 1),
  ('P2', 'Urgent', 240, 'Act within the shift', 2),
  ('P3', 'Planned', 1440, 'Plan within the day', 3),
  ('P4', 'Routine', 10080, 'Plan within the week', 4)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_work_orders_priority') THEN
    UPDATE work_orders SET priority = 'P3' WHERE priority NOT IN (SELECT id FROM work_order_priorities);
    ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_priority FOREIGN KEY (priority) REFERENCES work_order_priorities(id);
  END IF;
END $$;

-- Machine Health Index models. Parameters are the weights the engines and the
-- server use; the bands decide the status a score maps to.
INSERT INTO health_models (id, name, description) VALUES
  ('penalty-v1', 'Penalty model (kiln and pyro line)',
   'Each component starts at the ceiling and loses points for deviation from its reference (|z| above the free band), for engineering-limit severity and for active rule severity. Systems and the machine combine their parts as a weighted mean of the average and the worst part.'),
  ('penalty-vpc-v1', 'Penalty model (vacuum casting)',
   'Rule and limit penalties per subsystem; the machine combines the worst subsystem with the average.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO health_model_parameters (model_id, key, value, description) VALUES
  ('penalty-v1', 'ceiling', 99, 'Score of a component with no penalty'),
  ('penalty-v1', 'floor', 12, 'Lowest score a component can reach'),
  ('penalty-v1', 'z_free', 3, '|z| below this costs nothing'),
  ('penalty-v1', 'z_weight', 1.4, 'Points per unit of |z| above the free band'),
  ('penalty-v1', 'z_cap', 12, 'Most points deviation alone can cost'),
  ('penalty-v1', 'limit_critical', 22, 'Points for a measurement at its alarm boundary'),
  ('penalty-v1', 'limit_advisory', 9, 'Points for a measurement at its warning boundary'),
  ('penalty-v1', 'rule_critical', 30, 'Points for an active Critical rule'),
  ('penalty-v1', 'rule_advisory', 13, 'Points for an active Advisory rule'),
  ('penalty-v1', 'rule_watch', 4, 'Points for a rule that is building up (watch)'),
  ('penalty-v1', 'smoothing', 0.25, 'Exponential smoothing weight of each new score'),
  ('penalty-v1', 'display_deadband', 0.7, 'A shown score only moves when the smoothed score moves by more than this'),
  ('penalty-v1', 'combine_min_weight', 0.5, 'Weight of the worst part when parts are combined (the rest goes to the mean)'),
  ('penalty-v1', 'band_advisory', 85, 'Scores below this are Advisory'),
  ('penalty-v1', 'band_critical', 60, 'Scores below this are Critical'),
  ('penalty-vpc-v1', 'ceiling', 98, 'Score of a subsystem with no penalty'),
  ('penalty-vpc-v1', 'floor', 42, 'Lowest score a subsystem can reach'),
  ('penalty-vpc-v1', 'max_score', 99, 'Highest score after combination'),
  ('penalty-vpc-v1', 'rule_critical', 28, 'Points for an active Critical rule'),
  ('penalty-vpc-v1', 'rule_advisory', 14, 'Points for an active Advisory rule'),
  ('penalty-vpc-v1', 'limit_critical', 22, 'Points for a measurement at its alarm boundary'),
  ('penalty-vpc-v1', 'limit_advisory', 10, 'Points for a measurement at its warning boundary'),
  ('penalty-vpc-v1', 'combine_min_weight', 0.55, 'Weight of the worst subsystem in the machine score'),
  ('penalty-vpc-v1', 'band_advisory', 85, 'Scores below this are Advisory'),
  ('penalty-vpc-v1', 'band_critical', 60, 'Scores below this are Critical')
ON CONFLICT (model_id, key) DO NOTHING;

UPDATE machines SET health_model_id = CASE WHEN id LIKE 'VPC-%' THEN 'penalty-vpc-v1' ELSE 'penalty-v1' END
 WHERE health_model_id IS NULL;
