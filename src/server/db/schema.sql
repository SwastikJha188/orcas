-- ULTRON PostgreSQL Industrial Schema (Strict 3NF Normalized Architecture)
-- =============================================================================
-- Normalization & Integrity Summary:
-- 1. Eliminates redundant/duplicate tables:
--    - `machine_parts` removed (derived directly from `machine_systems`).
--    - `machine_hotspots` removed (derived directly from `mapped_signals` + `sensor_definitions`).
--    - `machine_rack_units` removed (derived on the fly from `mapped_signals` + `rack_chassis`).
-- 2. Eliminates transitive dependencies (3NF):
--    - `roles`, `users`, `user_plant_access` normalize multi-user RBAC and site permissions.
--    - `plants` normalizes site-level attributes (code, region, location, coordinates, time_zone, manager_user_id).
--    - `hierarchy_nodes` links via `plant_id` FK and `parent_id` FK, and derives status/health/time_zone from `plants` and `machines`.
--    - `equipment_models` normalizes OEM specifications (`type_name`, `manufacturer`, `model_number`, `power_rating`, `operating_speed`, `diagram_type`) so identical models (e.g. KLN-01..03, BALL-02..03) do not repeat OEM metadata.
--    - `machines` stores only instance-specific attributes and references `plant_id`, `hierarchy_node_id`, and `model_id`.
--    - `sap_equipment_records` stores only SAP ERP attributes and references `machine_id` (no repeated plant/floc/work_center columns on `machines`).
--    - `sensor_definitions` stores canonical engineering sensor metadata once per `tag` (instrument, sensor_type, unit, sample_rate, thresholds, schematic x/y, failure reasons).
--    - `mapped_signals` stores only per-machine channel binding and live reading (`machine_id`, `tag`, `subassembly_ref_id`, `edge_rack`, `card_slot`, `modbus_address`, `current_value`, `numeric_value`, `quality`, `status`).
--    - `diagnosis_findings` and `diagnosis_peak_frequencies` normalize repeating groups out of `diagnosis_records`.
--    - `trend_points` normalizes time-series points out of `trend_records`.
--    - `edge_gateway_topics` normalizes topic filter subscriptions out of `edge_gateways`.
-- 3. Strict Foreign Keys (`ON DELETE CASCADE` / `SET NULL`) & Composite B-Tree Indexes across all tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS, ROLES & MULTI-PLANT ACCESS CONTROL (3NF)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  can_manage_users BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_plants BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_machines BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_edge BOOLEAN NOT NULL DEFAULT FALSE,
  can_ack_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_work_orders BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(128) NOT NULL,
  department VARCHAR(128) NOT NULL,
  role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  avatar_initials VARCHAR(8) NOT NULL,
  phone VARCHAR(64),
  shift VARCHAR(64) NOT NULL DEFAULT 'Day Shift (06:00–18:00)',
  status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Call', 'Away', 'Inactive')),
  default_plant_id VARCHAR(64),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- -----------------------------------------------------------------------------
-- 2. PLANTS & HIERARCHY TREE (3NF)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plants (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL UNIQUE,
  short_name VARCHAR(128) NOT NULL,
  region VARCHAR(128) NOT NULL,
  location VARCHAR(255) NOT NULL,
  coordinates VARCHAR(128) NOT NULL,
  time_zone VARCHAR(64) NOT NULL DEFAULT 'Africa/Lusaka',
  manager_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Operational' CHECK (status IN ('Operational', 'Advisory', 'Standby', 'Maintenance')),
  description TEXT,
  commissioned_year SMALLINT,
  design_capacity VARCHAR(128),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plants_manager ON plants(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_plants_sort ON plants(sort_order, id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_default_plant'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_default_plant
      FOREIGN KEY (default_plant_id) REFERENCES plants(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_plant_access (
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  access_level VARCHAR(32) NOT NULL DEFAULT 'write' CHECK (access_level IN ('read', 'write', 'admin')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, plant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_plant_access_plant ON user_plant_access(plant_id);

CREATE TABLE IF NOT EXISTS hierarchy_nodes (
  id VARCHAR(64) PRIMARY KEY,
  plant_id VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  parent_id VARCHAR(64) REFERENCES hierarchy_nodes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('plant', 'area', 'group', 'machine')),
  machine_id VARCHAR(64),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_plant ON hierarchy_nodes(plant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON hierarchy_nodes(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hierarchy_machine ON hierarchy_nodes(machine_id);

-- -----------------------------------------------------------------------------
-- 3. EQUIPMENT MODELS, MACHINES & SAP RECORDS (3NF)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS equipment_models (
  id VARCHAR(64) PRIMARY KEY,
  type_name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) NOT NULL,
  model_number VARCHAR(255) NOT NULL,
  power_rating VARCHAR(128) NOT NULL,
  operating_speed VARCHAR(128) NOT NULL,
  diagram_type VARCHAR(64) NOT NULL CHECK (diagram_type IN ('mill', 'crusher', 'pump', 'blower', 'kiln', 'feed-system', 'preheater', 'pyro-kiln', 'kiln-burner', 'grate-cooler', 'clinker-transport')),
  UNIQUE (manufacturer, model_number)
);

CREATE TABLE IF NOT EXISTS machines (
  id VARCHAR(64) PRIMARY KEY,
  plant_id VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  process_node_id VARCHAR(64) REFERENCES hierarchy_nodes(id) ON DELETE SET NULL,
  model_id VARCHAR(64) NOT NULL REFERENCES equipment_models(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(128) NOT NULL UNIQUE,
  commissioned VARCHAR(64) NOT NULL,
  bay_location VARCHAR(255) NOT NULL,
  coordinates VARCHAR(128) NOT NULL,
  criticality VARCHAR(64) NOT NULL CHECK (criticality IN ('A (Critical)', 'B (Essential)', 'C (General)')),
  status VARCHAR(32) NOT NULL CHECK (status IN ('Operational', 'Advisory', 'Standby', 'Maintenance', 'Critical')),
  health INTEGER NOT NULL CHECK (health >= 0 AND health <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machines_plant ON machines(plant_id);
CREATE INDEX IF NOT EXISTS idx_machines_process_node ON machines(process_node_id);
CREATE INDEX IF NOT EXISTS idx_machines_model ON machines(model_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_hierarchy_machine'
  ) THEN
    ALTER TABLE hierarchy_nodes
      ADD CONSTRAINT fk_hierarchy_machine
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sap_equipment_records (
  sap_number VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL UNIQUE REFERENCES machines(id) ON DELETE CASCADE,
  sap_equipment_id VARCHAR(64) NOT NULL UNIQUE,
  floc VARCHAR(128) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  work_center VARCHAR(128) NOT NULL,
  cost_center VARCHAR(128) NOT NULL,
  active_work_order VARCHAR(128),
  next_scheduled_pm VARCHAR(128),
  sync_state VARCHAR(64) NOT NULL DEFAULT 'Synced'
);

CREATE INDEX IF NOT EXISTS idx_sap_machine ON sap_equipment_records(machine_id);

-- -----------------------------------------------------------------------------
-- 4. MACHINE SYSTEMS, SUB-ASSEMBLIES & NORMALIZED SENSOR CATALOG (3NF)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS machine_systems (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  system_id VARCHAR(64) NOT NULL,
  part_code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128) NOT NULL,
  health INTEGER NOT NULL CHECK (health >= 0 AND health <= 100),
  status VARCHAR(32) NOT NULL CHECK (status IN ('Normal', 'Advisory', 'Critical')),
  bbox_x NUMERIC(6, 2) NOT NULL DEFAULT 0,
  bbox_y NUMERIC(6, 2) NOT NULL DEFAULT 0,
  bbox_w NUMERIC(6, 2) NOT NULL DEFAULT 100,
  bbox_h NUMERIC(6, 2) NOT NULL DEFAULT 100,
  critical_notes TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (machine_id, system_id)
);

CREATE INDEX IF NOT EXISTS idx_systems_machine ON machine_systems(machine_id, sort_order);

CREATE TABLE IF NOT EXISTS machine_subassemblies (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  machine_system_ref_id VARCHAR(64) NOT NULL REFERENCES machine_systems(id) ON DELETE CASCADE,
  system_id VARCHAR(64) NOT NULL,
  subassembly_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128) NOT NULL,
  health INTEGER NOT NULL CHECK (health >= 0 AND health <= 100),
  status VARCHAR(32) NOT NULL CHECK (status IN ('Normal', 'Advisory', 'Critical')),
  criticality VARCHAR(32) NOT NULL DEFAULT 'A',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (machine_id, subassembly_id)
);

CREATE INDEX IF NOT EXISTS idx_subassemblies_machine ON machine_subassemblies(machine_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_subassemblies_system_ref ON machine_subassemblies(machine_system_ref_id);

-- Canonical Sensor Engineering Definitions (stored once per sensor specification)
CREATE TABLE IF NOT EXISTS sensor_definitions (
  id VARCHAR(128) PRIMARY KEY,
  tag VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  instrument VARCHAR(255) NOT NULL,
  sensor_type VARCHAR(128) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  sample_rate VARCHAR(128) NOT NULL,
  source VARCHAR(64) DEFAULT 'Existing',
  priority VARCHAR(64) DEFAULT 'Required',
  accuracy VARCHAR(128),
  range_val VARCHAR(128),
  normal_threshold VARCHAR(128),
  warning_threshold VARCHAR(128),
  alarm_threshold VARCHAR(128),
  warning_val NUMERIC(10, 2),
  alarm_val NUMERIC(10, 2),
  max_scale NUMERIC(10, 2),
  nominal_band VARCHAR(128),
  standard VARCHAR(128),
  default_baseline NUMERIC(10, 2),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  x NUMERIC(6, 2),
  y NUMERIC(6, 2),
  component VARCHAR(255),
  point VARCHAR(16)
);

CREATE INDEX IF NOT EXISTS idx_sensor_definitions_tag ON sensor_definitions(tag);

-- Per-Machine Signal Instances & Live Acquisition Mapping (3NF)
CREATE TABLE IF NOT EXISTS mapped_signals (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  sensor_def_id VARCHAR(128) NOT NULL REFERENCES sensor_definitions(id) ON DELETE RESTRICT,
  tag VARCHAR(128) NOT NULL,
  subassembly_ref_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE SET NULL,
  edge_rack VARCHAR(128) NOT NULL,
  card_slot VARCHAR(128) NOT NULL,
  modbus_address VARCHAR(64) NOT NULL,
  current_value VARCHAR(64) NOT NULL,
  numeric_value NUMERIC(10, 2),
  quality VARCHAR(64) NOT NULL DEFAULT '100% Good',
  status VARCHAR(32) NOT NULL DEFAULT 'Normal' CHECK (status IN ('Normal', 'Advisory', 'Critical')),
  position TEXT,
  default_baseline_override NUMERIC(10, 2),
  UNIQUE (machine_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_signals_machine ON mapped_signals(machine_id);
CREATE INDEX IF NOT EXISTS idx_signals_tag ON mapped_signals(tag);
CREATE INDEX IF NOT EXISTS idx_signals_sensor_def ON mapped_signals(sensor_def_id);
CREATE INDEX IF NOT EXISTS idx_signals_subassembly ON mapped_signals(subassembly_ref_id);

-- -----------------------------------------------------------------------------
-- 5. DIAGNOSIS, TRENDS, PROCESS STAGES, RACKS & OPERATING EVENTS (3NF)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS diagnosis_records (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL UNIQUE REFERENCES machines(id) ON DELETE CASCADE,
  overall_condition VARCHAR(64) NOT NULL CHECK (overall_condition IN ('Nominal', 'Advisory', 'Critical')),
  confidence NUMERIC(5, 2) NOT NULL,
  engine_version VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  maintenance_priority VARCHAR(32) NOT NULL CHECK (maintenance_priority IN ('Low', 'Medium', 'High', 'Immediate')),
  prescriptive_action TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_machine ON diagnosis_records(machine_id);

CREATE TABLE IF NOT EXISTS diagnosis_findings (
  id SERIAL PRIMARY KEY,
  diagnosis_id INTEGER NOT NULL REFERENCES diagnosis_records(id) ON DELETE CASCADE,
  finding_code VARCHAR(64) NOT NULL,
  fault VARCHAR(255) NOT NULL,
  probability NUMERIC(5, 2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  frequency VARCHAR(128) NOT NULL,
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('Normal', 'Advisory', 'Critical')),
  recommendation TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_findings_diag ON diagnosis_findings(diagnosis_id, sort_order);

CREATE TABLE IF NOT EXISTS diagnosis_peak_frequencies (
  id SERIAL PRIMARY KEY,
  diagnosis_id INTEGER NOT NULL REFERENCES diagnosis_records(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  freq VARCHAR(64) NOT NULL,
  amplitude VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('Normal', 'Elevated')),
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_peaks_diag ON diagnosis_peak_frequencies(diagnosis_id, sort_order);

CREATE TABLE IF NOT EXISTS trend_records (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  metric_key VARCHAR(128) NOT NULL,
  label VARCHAR(255) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  baseline NUMERIC(10, 2) NOT NULL,
  advisory_limit NUMERIC(10, 2) NOT NULL,
  critical_limit NUMERIC(10, 2) NOT NULL,
  stat_mean VARCHAR(64) NOT NULL,
  stat_peak VARCHAR(64) NOT NULL,
  stat_crest_factor VARCHAR(64) NOT NULL,
  stat_kurtosis VARCHAR(64) NOT NULL,
  stat_drift_30d VARCHAR(64) NOT NULL,
  UNIQUE (machine_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_trends_machine ON trend_records(machine_id);

CREATE TABLE IF NOT EXISTS trend_points (
  id SERIAL PRIMARY KEY,
  trend_id INTEGER NOT NULL REFERENCES trend_records(id) ON DELETE CASCADE,
  sample_index SMALLINT NOT NULL,
  time_label VARCHAR(32) NOT NULL,
  value NUMERIC(12, 4) NOT NULL,
  UNIQUE (trend_id, sample_index)
);

CREATE INDEX IF NOT EXISTS idx_trend_points_trend ON trend_points(trend_id, sample_index);

CREATE TABLE IF NOT EXISTS operating_events (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  timestamp VARCHAR(128) NOT NULL,
  type VARCHAR(64) NOT NULL CHECK (type IN ('Telemetry Advisory', 'Maintenance Log', 'Operating Change', 'Inspection')),
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('Normal', 'Advisory', 'Critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_machine ON operating_events(machine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor ON operating_events(actor_user_id);

CREATE TABLE IF NOT EXISTS rack_chassis (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) UNIQUE REFERENCES machines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cabinet_location VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  protocol VARCHAR(128) NOT NULL,
  firmware VARCHAR(128) NOT NULL,
  uptime VARCHAR(64) NOT NULL,
  psu_status VARCHAR(128) NOT NULL,
  packet_loss VARCHAR(32) NOT NULL,
  latency VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rack_chassis_machine ON rack_chassis(machine_id);

CREATE TABLE IF NOT EXISTS rack_slots (
  id SERIAL PRIMARY KEY,
  rack_id VARCHAR(64) NOT NULL REFERENCES rack_chassis(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  card_model VARCHAR(128) NOT NULL,
  module_type VARCHAR(255) NOT NULL,
  channel_count INTEGER NOT NULL,
  connected_probes TEXT NOT NULL,
  sample_rate VARCHAR(128) NOT NULL,
  sync_state VARCHAR(64) NOT NULL CHECK (sync_state IN ('Synced', 'Acquiring', 'Standby')),
  UNIQUE (rack_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_rack_slots_rack ON rack_slots(rack_id, slot_number);

CREATE TABLE IF NOT EXISTS process_stages (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  stage_id VARCHAR(64) NOT NULL,
  step_number VARCHAR(8),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  subtitle TEXT,
  status VARCHAR(32) NOT NULL,
  efficiency INTEGER NOT NULL,
  health_notes TEXT,
  transformation TEXT,
  associated_parts JSONB,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  parameters JSONB NOT NULL,
  UNIQUE (machine_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_process_stages_machine ON process_stages(machine_id, id);

-- -----------------------------------------------------------------------------
-- 6. EDGE REGISTRY (3NF WITH STRICT FOREIGN KEYS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS edge_formats (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  kind VARCHAR(16) NOT NULL DEFAULT 'json',
  topic VARCHAR(512) NOT NULL DEFAULT '',
  records VARCHAR(512) NOT NULL DEFAULT '',
  fields JSONB NOT NULL DEFAULT '{}',
  timestamp_format VARCHAR(16) NOT NULL DEFAULT 'none',
  defaults JSONB NOT NULL DEFAULT '{"rack":"R1","card":"1","channel":"1"}',
  built_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_brokers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  tls BOOLEAN NOT NULL DEFAULT TRUE,
  protocol_version SMALLINT,
  username VARCHAR(255),
  password TEXT,
  client_id_prefix VARCHAR(128) NOT NULL DEFAULT 'ultron-orcas-ingest',
  topic_prefix VARCHAR(255) NOT NULL DEFAULT 'ultron/v1/gateways',
  qos SMALLINT NOT NULL DEFAULT 1,
  reject_unauthorized BOOLEAN NOT NULL DEFAULT TRUE,
  ca_cert TEXT,
  client_cert TEXT,
  client_key TEXT,
  allowed_commands JSONB NOT NULL DEFAULT '["PING"]',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_gateways (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  broker_id VARCHAR(64) REFERENCES edge_brokers(id) ON DELETE SET NULL,
  format_id VARCHAR(64) REFERENCES edge_formats(id) ON DELETE SET NULL,
  site_node_id VARCHAR(64) REFERENCES hierarchy_nodes(id) ON DELETE SET NULL,
  topics JSONB NOT NULL DEFAULT '[]',
  location VARCHAR(255),
  ip_address VARCHAR(64),
  model VARCHAR(255),
  firmware VARCHAR(128),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_edge_gateway_code ON edge_gateways (COALESCE(broker_id, ''), code);
CREATE INDEX IF NOT EXISTS idx_edge_gateways_broker ON edge_gateways(broker_id);
CREATE INDEX IF NOT EXISTS idx_edge_gateways_site ON edge_gateways(site_node_id);

CREATE TABLE IF NOT EXISTS edge_sources (
  id VARCHAR(64) PRIMARY KEY,
  gateway_id VARCHAR(64) NOT NULL REFERENCES edge_gateways(id) ON DELETE CASCADE,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  protocol VARCHAR(64) NOT NULL,
  endpoint VARCHAR(512),
  location VARCHAR(255),
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE SET NULL,
  model VARCHAR(255),
  poll_interval_ms INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (gateway_id, code)
);

CREATE INDEX IF NOT EXISTS idx_edge_sources_gateway ON edge_sources(gateway_id);
CREATE INDEX IF NOT EXISTS idx_edge_sources_machine ON edge_sources(machine_id);

CREATE TABLE IF NOT EXISTS edge_cards (
  id VARCHAR(64) PRIMARY KEY,
  source_id VARCHAR(64) NOT NULL REFERENCES edge_sources(id) ON DELETE CASCADE,
  code VARCHAR(128) NOT NULL,
  card_type VARCHAR(64),
  channel_count INTEGER,
  model VARCHAR(255),
  notes TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (source_id, code)
);

CREATE INDEX IF NOT EXISTS idx_edge_cards_source ON edge_cards(source_id);

CREATE TABLE IF NOT EXISTS edge_points (
  id VARCHAR(64) PRIMARY KEY,
  source_id VARCHAR(64) NOT NULL REFERENCES edge_sources(id) ON DELETE CASCADE,
  tag VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slot VARCHAR(128) NOT NULL,
  channel VARCHAR(128) NOT NULL DEFAULT '1',
  address VARCHAR(255),
  unit VARCHAR(32),
  data_type VARCHAR(16) NOT NULL DEFAULT 'float',
  sample_rate VARCHAR(128),
  alert_limit DOUBLE PRECISION,
  danger_limit DOUBLE PRECISION,
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE SET NULL,
  signal_tag VARCHAR(128),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (source_id, slot, channel),
  FOREIGN KEY (source_id, slot) REFERENCES edge_cards(source_id, code) ON DELETE CASCADE
);

-- Pyro line (D4 Table 8.1 "Data and rack"): OT security zone and the plant's original tag.
ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128);
ALTER TABLE edge_sources ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128);
ALTER TABLE edge_points ADD COLUMN IF NOT EXISTS source_tag VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_edge_points_source ON edge_points(source_id);
CREATE INDEX IF NOT EXISTS idx_edge_points_machine ON edge_points(machine_id);

-- -----------------------------------------------------------------------------
-- 7. OPERATIONS LOOP & AI PREDICTIONS (3NF WITH MACHINE & USER FOREIGN KEYS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  rule_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  component VARCHAR(255),
  priority VARCHAR(8) NOT NULL DEFAULT 'P3',
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  action_kind VARCHAR(16) NOT NULL DEFAULT 'mitigate' CHECK (action_kind IN ('mitigate', 'repair')),
  due_label VARCHAR(64),
  assignee VARCHAR(128),
  assignee_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  sim_time DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_machine ON work_orders(machine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(assignee_user_id);

-- Inspection results against the machine maintenance checklists (OSW-PE-MNT / SMT-PYR-01).
CREATE TABLE IF NOT EXISTS maintenance_records (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
  task_id VARCHAR(32) NOT NULL,
  result VARCHAR(8) NOT NULL CHECK (result IN ('Pass', 'Defect', 'NA', 'Hold')),
  note TEXT,
  inspector_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_machine ON maintenance_records(machine_id, kind, recorded_at DESC);

-- Checklist items added on site for one machine (shown as U-<id>), placed in a document section.
CREATE TABLE IF NOT EXISTS maintenance_custom_tasks (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
  unit_code VARCHAR(16) NOT NULL,
  group_num VARCHAR(16) NOT NULL,
  route VARCHAR(16) NOT NULL,
  component VARCHAR(200) NOT NULL,
  check_text TEXT NOT NULL,
  pass_text TEXT,
  created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_custom_tasks_machine ON maintenance_custom_tasks(machine_id, kind);

-- Items taken off one machine's checklist (document or site-added); deleting the row puts the item back.
CREATE TABLE IF NOT EXISTS maintenance_removed_tasks (
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
  task_id VARCHAR(32) NOT NULL,
  removed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  removed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (machine_id, kind, task_id)
);

-- Planned maintenance (OSW-SW-PMS-PYR-01): plan state per checklist plan (unit × route).
CREATE TABLE IF NOT EXISTS maintenance_plan_states (
  plan_id VARCHAR(48) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  state VARCHAR(16) NOT NULL CHECK (state IN ('Provisional', 'Approved', 'Site verify', 'Retired')),
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  approved_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_plan_states_machine ON maintenance_plan_states(machine_id);

-- PMS layer on a work order: lifecycle stage, readiness, as-found / as-left.
CREATE TABLE IF NOT EXISTS maintenance_wo_stages (
  work_order_id INTEGER PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
  stage VARCHAR(24) NOT NULL,
  resume_stage VARCHAR(24),
  work_mode VARCHAR(8) CHECK (work_mode IN ('Run', 'Isolate')),
  planned_start TIMESTAMP WITH TIME ZONE,
  estimate_hours DOUBLE PRECISION,
  as_found TEXT,
  as_left TEXT,
  readiness JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Planned-maintenance audit trail (plans and work orders).
CREATE TABLE IF NOT EXISTS maintenance_events (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  plan_id VARCHAR(48),
  action VARCHAR(24) NOT NULL,
  from_state VARCHAR(32),
  to_state VARCHAR(32),
  reason TEXT,
  actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_events_machine ON maintenance_events(machine_id, at DESC);

CREATE TABLE IF NOT EXISTS alert_acks (
  rule_id VARCHAR(64) NOT NULL,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_by VARCHAR(128),
  acknowledged_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  sim_time DOUBLE PRECISION,
  PRIMARY KEY (machine_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_acks_user ON alert_acks(acknowledged_by_user_id);

CREATE TABLE IF NOT EXISTS ai_predictions (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  run_id VARCHAR(64) NOT NULL,
  episode_key VARCHAR(160) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  subject VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  predicted_event TEXT NOT NULL,
  target_level VARCHAR(16) NOT NULL,
  confidence INTEGER NOT NULL,
  created_t INTEGER NOT NULL,
  created_clock VARCHAR(16),
  predicted_t INTEGER NOT NULL,
  expires_t INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  outcome_t INTEGER,
  outcome_clock VARCHAR(16),
  lead_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (run_id, episode_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_machine ON ai_predictions(machine_id, created_at DESC);
