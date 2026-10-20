-- =============================================================================
-- 009 · Normalise the legacy asset tables
--
-- Removes stored copies of values that are derived or fabricated, and repeating
-- groups, now that the monitoring core (001–008) holds the source data:
--
--   machines.status / health        → service_state (manual) + evaluated health
--   machine_systems / subassemblies → health / status derived from scores;
--                                     sub-assembly machine / system keys come
--                                     through machine_system_ref_id
--   mapped_signals, sensor_definitions → measurements and their limits, states,
--                                     points, acquisition paths and rules
--   trend_records / trend_points    → readings
--   diagnosis_records / findings / peaks → findings
--   operating_events                → machine_events
--   process_stages JSONB            → stage parts, streams and measurements
--   rack_chassis runtime strings    → removed (not measured)
--   rack_slots.sync_state           → removed (not measured)
--   sap_equipment_records.active_work_order → work_orders
--   machines.process_node_id        → hierarchy_nodes.machine_id
--   equipment / machine optional facts may be unknown (NULL), never invented
-- =============================================================================

-- Machines: service state is entered; condition and health are evaluated.
ALTER TABLE machines ADD COLUMN IF NOT EXISTS service_state VARCHAR(16) NOT NULL DEFAULT 'Operational'
  CHECK (service_state IN ('Operational', 'Standby', 'Maintenance'));
UPDATE machines SET service_state = status WHERE status IN ('Standby', 'Maintenance');
DROP INDEX IF EXISTS idx_machines_status;
DROP INDEX IF EXISTS idx_machines_process_node;
ALTER TABLE machines DROP COLUMN IF EXISTS status;
ALTER TABLE machines DROP COLUMN IF EXISTS health;
ALTER TABLE machines DROP COLUMN IF EXISTS process_node_id;
ALTER TABLE machines ALTER COLUMN serial_number DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN commissioned DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN bay_location DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN coordinates DROP NOT NULL;
ALTER TABLE equipment_models ALTER COLUMN power_rating DROP NOT NULL;
ALTER TABLE equipment_models ALTER COLUMN operating_speed DROP NOT NULL;
ALTER TABLE equipment_models DROP CONSTRAINT IF EXISTS equipment_models_diagram_type_check;

-- Systems and components: health / status are evaluated, never stored here.
ALTER TABLE machine_systems DROP COLUMN IF EXISTS health;
ALTER TABLE machine_systems DROP COLUMN IF EXISTS status;
ALTER TABLE machine_subassemblies DROP COLUMN IF EXISTS health;
ALTER TABLE machine_subassemblies DROP COLUMN IF EXISTS status;
DROP INDEX IF EXISTS idx_subassemblies_machine;
ALTER TABLE machine_subassemblies DROP CONSTRAINT IF EXISTS machine_subassemblies_machine_id_subassembly_id_key;
ALTER TABLE machine_subassemblies DROP COLUMN IF EXISTS machine_id;
ALTER TABLE machine_subassemblies DROP COLUMN IF EXISTS system_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subassemblies_code ON machine_subassemblies(machine_system_ref_id, subassembly_id);

-- Events: operating_events → machine_events.
INSERT INTO machine_events (machine_id, event_type_id, occurred_at, recorded_at, severity_id, title, description, source, actor_user_id)
SELECT e.machine_id,
       CASE e.type WHEN 'Telemetry Advisory' THEN 'telemetry_advisory' WHEN 'Maintenance Log' THEN 'maintenance'
                   WHEN 'Inspection' THEN 'inspection' ELSE 'operating_change' END,
       COALESCE(e.created_at, NOW()), COALESCE(e.created_at, NOW()), e.severity, e.title, e.description, e.source, e.actor_user_id
  FROM operating_events e;
DROP TABLE IF EXISTS operating_events;

-- Process stages: repeating groups out of JSONB, fabricated values dropped.
ALTER TABLE process_stages RENAME TO process_stages_legacy;
ALTER INDEX IF EXISTS idx_process_stages_machine RENAME TO idx_process_stages_legacy_machine;
ALTER TABLE process_stages_legacy DROP CONSTRAINT IF EXISTS process_stages_machine_id_stage_id_key;
CREATE TABLE process_stages (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  step_number VARCHAR(8),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  subtitle TEXT,
  transformation TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (machine_id, code)
);
CREATE INDEX idx_process_stages_machine ON process_stages(machine_id, sort_order);
CREATE TABLE process_stage_parts (
  stage_id INTEGER NOT NULL REFERENCES process_stages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (stage_id, name)
);
CREATE TABLE process_stage_streams (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES process_stages(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('input', 'output')),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(16) NOT NULL CHECK (category IN ('Material', 'Water', 'Energy', 'Media', 'Slurry', 'Gas', 'Product', 'Reject', 'Utility')),
  specification TEXT,
  counterpart VARCHAR(255),
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_process_stage_streams_stage ON process_stage_streams(stage_id, sort_order);
CREATE TABLE process_stage_measurements (
  stage_id INTEGER NOT NULL REFERENCES process_stages(id) ON DELETE CASCADE,
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (stage_id, measurement_id)
);

INSERT INTO process_stages (machine_id, code, step_number, name, role, subtitle, transformation, sort_order)
SELECT machine_id, stage_id, step_number, name, role, subtitle, transformation, ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY id)
  FROM process_stages_legacy;

INSERT INTO process_stage_parts (stage_id, name, sort_order)
SELECT DISTINCT ON (s.id, p.name) s.id, p.name, p.ord
  FROM process_stages_legacy l
  JOIN process_stages s ON s.machine_id = l.machine_id AND s.code = l.stage_id
  CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(l.associated_parts, '[]'::jsonb)) WITH ORDINALITY AS p(name, ord);

INSERT INTO process_stage_streams (stage_id, direction, name, category, specification, counterpart, sort_order)
SELECT s.id, d.direction, x->>'name', x->>'category', x->>'rateOrSpec', x->>'sourceOrDestination', x.ord
  FROM process_stages_legacy l
  JOIN process_stages s ON s.machine_id = l.machine_id AND s.code = l.stage_id
  CROSS JOIN LATERAL (VALUES ('input', l.inputs), ('output', l.outputs)) AS d(direction, items)
  CROSS JOIN LATERAL jsonb_array_elements(d.items) WITH ORDINALITY AS x(x, ord)
 WHERE x->>'category' IN ('Material', 'Water', 'Energy', 'Media', 'Slurry', 'Gas', 'Product', 'Reject', 'Utility');

-- A parameter label names its tag in short form ("Kiln Feed Rate (FLO-01)"): link it to the machine's measurement.
INSERT INTO process_stage_measurements (stage_id, measurement_id, sort_order)
SELECT DISTINCT ON (s.id, m.measurement_id) s.id, m.measurement_id, p.ord
  FROM process_stages_legacy l
  JOIN process_stages s ON s.machine_id = l.machine_id AND s.code = l.stage_id
  CROSS JOIN LATERAL jsonb_array_elements(l.parameters) WITH ORDINALITY AS p(j, ord)
  CROSS JOIN LATERAL (SELECT substring(p.j->>'label' FROM '\(([A-Z0-9]+)-(\d+)\)') AS prefix, substring(p.j->>'label' FROM '\([A-Z0-9]+-(\d+)\)') AS num) k
  JOIN LATERAL (
    SELECT c.measurement_id FROM v_measurement_context c
     WHERE c.machine_id = l.machine_id AND k.prefix IS NOT NULL
       AND (c.tag = k.prefix || '-' || k.num OR c.tag ~ ('^' || k.prefix || '-[A-Z0-9]+-' || k.num || '$'))
     ORDER BY length(c.tag) LIMIT 1
  ) m ON TRUE;

DROP TABLE process_stages_legacy;

-- Readings and findings replace the stored trend / diagnosis copies.
DROP TABLE IF EXISTS trend_points;
DROP TABLE IF EXISTS trend_records;
DROP TABLE IF EXISTS diagnosis_peak_frequencies;
DROP TABLE IF EXISTS diagnosis_findings;
DROP TABLE IF EXISTS diagnosis_records;

-- Racks: runtime health was never measured; keep the documented configuration.
ALTER TABLE rack_chassis DROP COLUMN IF EXISTS uptime;
ALTER TABLE rack_chassis DROP COLUMN IF EXISTS psu_status;
ALTER TABLE rack_chassis DROP COLUMN IF EXISTS packet_loss;
ALTER TABLE rack_chassis DROP COLUMN IF EXISTS latency;
ALTER TABLE rack_slots DROP COLUMN IF EXISTS sync_state;

-- ERP record: the active work order is the open work order.
ALTER TABLE sap_equipment_records DROP COLUMN IF EXISTS active_work_order;
ALTER TABLE sap_equipment_records ALTER COLUMN floc DROP NOT NULL;
ALTER TABLE sap_equipment_records ALTER COLUMN work_center DROP NOT NULL;
ALTER TABLE sap_equipment_records ALTER COLUMN cost_center DROP NOT NULL;

-- Sensor catalogue: the monitoring core holds every attribute now.
DROP TABLE IF EXISTS mapped_signals;
DROP TABLE IF EXISTS sensor_definitions;
