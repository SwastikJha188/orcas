-- ULTRON PostgreSQL Industrial Schema

CREATE TABLE IF NOT EXISTS hierarchy_nodes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL, -- 'plant', 'area', 'group', 'machine'
  parent_id VARCHAR(64) REFERENCES hierarchy_nodes(id) ON DELETE CASCADE,
  machine_id VARCHAR(64),
  status VARCHAR(32),
  health INTEGER,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS machines (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  process_cell VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  serial_number VARCHAR(128) NOT NULL,
  commissioned VARCHAR(64) NOT NULL,
  location VARCHAR(255) NOT NULL,
  coordinates VARCHAR(128) NOT NULL,
  power_rating VARCHAR(128) NOT NULL,
  operating_speed VARCHAR(128) NOT NULL,
  criticality VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  health INTEGER NOT NULL,
  sap_equipment_id VARCHAR(64) NOT NULL,
  floc VARCHAR(128) NOT NULL,
  cost_center VARCHAR(128) NOT NULL,
  plant VARCHAR(255) NOT NULL,
  work_center VARCHAR(128) NOT NULL,
  active_work_order VARCHAR(128),
  signals_count INTEGER DEFAULT 0,
  diagram_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS machine_parts (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  part_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  health INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  bbox JSONB NOT NULL,
  critical_notes TEXT
);

CREATE TABLE IF NOT EXISTS machine_hotspots (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  hotspot_id VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  parameter VARCHAR(64) NOT NULL,
  value VARCHAR(64) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  x NUMERIC(6, 2) NOT NULL,
  y NUMERIC(6, 2) NOT NULL,
  component VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS machine_systems (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  system_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128) NOT NULL,
  health INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  bbox JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS machine_subassemblies (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  system_id VARCHAR(64) NOT NULL,
  subassembly_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128) NOT NULL,
  health INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  criticality VARCHAR(32) NOT NULL,
  sensor_tags JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS mapped_signals (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  tag VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  instrument VARCHAR(255) NOT NULL,
  sensor_type VARCHAR(128) NOT NULL,
  edge_rack VARCHAR(128) NOT NULL,
  card_slot VARCHAR(128) NOT NULL,
  modbus_address VARCHAR(64) NOT NULL,
  current_value VARCHAR(64) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  quality VARCHAR(64) NOT NULL,
  sample_rate VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  position TEXT,
  system_id VARCHAR(64),
  subassembly_id VARCHAR(64),
  sub_assembly VARCHAR(128),
  source VARCHAR(64),
  priority VARCHAR(64),
  accuracy VARCHAR(128),
  range_val VARCHAR(128),
  normal_threshold VARCHAR(128),
  warning_threshold VARCHAR(128),
  alarm_threshold VARCHAR(128),
  numeric_value NUMERIC(10, 2),
  warning_val NUMERIC(10, 2),
  alarm_val NUMERIC(10, 2),
  max_scale NUMERIC(10, 2),
  nominal_band VARCHAR(128),
  standard VARCHAR(128),
  default_baseline NUMERIC(10, 2),
  reasons JSONB,
  x NUMERIC(6, 2),
  y NUMERIC(6, 2),
  component VARCHAR(255),
  point VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS diagnosis_records (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  overall_condition VARCHAR(64) NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL,
  engine_version VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  findings JSONB NOT NULL,
  peak_frequencies JSONB NOT NULL,
  maintenance_priority VARCHAR(32) NOT NULL,
  prescriptive_action TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trend_records (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  metric_key VARCHAR(128) NOT NULL,
  label VARCHAR(255) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  baseline NUMERIC(10, 2) NOT NULL,
  advisory_limit NUMERIC(10, 2) NOT NULL,
  critical_limit NUMERIC(10, 2) NOT NULL,
  points JSONB NOT NULL,
  stats JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS operating_events (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  timestamp VARCHAR(128) NOT NULL,
  type VARCHAR(64) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rack_chassis (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS rack_slots (
  id SERIAL PRIMARY KEY,
  rack_id VARCHAR(64) NOT NULL REFERENCES rack_chassis(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  card_model VARCHAR(128) NOT NULL,
  module_type VARCHAR(255) NOT NULL,
  channel_count INTEGER NOT NULL,
  connected_probes TEXT NOT NULL,
  sample_rate VARCHAR(128) NOT NULL,
  sync_state VARCHAR(64) NOT NULL
);

-- Rich per-machine acquisition enclosure model (MachineRackInfo + RackSlotSensor[])
-- rendered by the Rack sub-page. Stored as canonical JSON payloads.
CREATE TABLE IF NOT EXISTS machine_rack_units (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  rack_id VARCHAR(64) NOT NULL,
  rack_number INTEGER NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE (machine_id, rack_id)
);

CREATE TABLE IF NOT EXISTS sap_equipment_records (
  sap_number VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE CASCADE,
  floc VARCHAR(128) NOT NULL,
  description VARCHAR(255) NOT NULL,
  plant VARCHAR(255) NOT NULL,
  work_center VARCHAR(128) NOT NULL,
  cost_center VARCHAR(128) NOT NULL,
  active_work_order VARCHAR(128),
  next_scheduled_pm VARCHAR(128),
  sync_state VARCHAR(64)
);

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
  parameters JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON hierarchy_nodes(parent_id);
-- IANA zone of a plant (site), e.g. 'Africa/Lusaka'. NULL: show times in the viewer's zone.
ALTER TABLE hierarchy_nodes ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_parts_machine ON machine_parts(machine_id);
CREATE INDEX IF NOT EXISTS idx_systems_machine ON machine_systems(machine_id);
CREATE INDEX IF NOT EXISTS idx_subassemblies_machine ON machine_subassemblies(machine_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_machine ON machine_hotspots(machine_id);
CREATE INDEX IF NOT EXISTS idx_signals_machine ON mapped_signals(machine_id);
CREATE INDEX IF NOT EXISTS idx_signals_tag ON mapped_signals(tag);
CREATE INDEX IF NOT EXISTS idx_diagnosis_machine ON diagnosis_records(machine_id);
CREATE INDEX IF NOT EXISTS idx_trends_machine ON trend_records(machine_id);
CREATE INDEX IF NOT EXISTS idx_events_machine ON operating_events(machine_id);
CREATE INDEX IF NOT EXISTS idx_rack_slots_rack ON rack_slots(rack_id);

-- Idempotent migrations for existing deployments (adds canonical columns if missing)
DO $$ BEGIN
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS system_id VARCHAR(64);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS subassembly_id VARCHAR(64);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS nominal_band VARCHAR(128);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS standard VARCHAR(128);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS default_baseline NUMERIC(10, 2);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS reasons JSONB;
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS x NUMERIC(6, 2);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS y NUMERIC(6, 2);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS component VARCHAR(255);
  ALTER TABLE mapped_signals ADD COLUMN IF NOT EXISTS point VARCHAR(16);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- process_stages canonical columns (adds diagram-free domain fields if missing)
DO $$ BEGIN
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS step_number VARCHAR(8);
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS role VARCHAR(255);
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS subtitle TEXT;
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS health_notes TEXT;
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS transformation TEXT;
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS associated_parts JSONB;
  ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS parameters JSONB;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ---------------------------------------------------------------- edge registry
-- Brokers, gateways, the sources behind them (racks, PLCs, SCADA, DCS) and the
-- points each source carries. Configured in Devices; read by the MQTT runtime.

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
  site_node_id VARCHAR(64),
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

CREATE TABLE IF NOT EXISTS edge_sources (
  id VARCHAR(64) PRIMARY KEY,
  gateway_id VARCHAR(64) NOT NULL REFERENCES edge_gateways(id) ON DELETE CASCADE,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  protocol VARCHAR(64) NOT NULL,
  endpoint VARCHAR(512),
  location VARCHAR(255),
  machine_id VARCHAR(64),
  model VARCHAR(255),
  poll_interval_ms INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (gateway_id, code)
);

CREATE TABLE IF NOT EXISTS edge_points (
  id VARCHAR(64) PRIMARY KEY,
  source_id VARCHAR(64) NOT NULL REFERENCES edge_sources(id) ON DELETE CASCADE,
  tag VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slot INTEGER NOT NULL,
  channel INTEGER NOT NULL DEFAULT 1,
  address VARCHAR(255),
  unit VARCHAR(32),
  data_type VARCHAR(16) NOT NULL DEFAULT 'float',
  sample_rate VARCHAR(128),
  alert_limit DOUBLE PRECISION,
  danger_limit DOUBLE PRECISION,
  machine_id VARCHAR(64),
  signal_tag VARCHAR(128),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (source_id, slot, channel)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_edge_gateway_code ON edge_gateways (COALESCE(broker_id, ''), code);
CREATE INDEX IF NOT EXISTS idx_edge_sources_gateway ON edge_sources(gateway_id);
CREATE INDEX IF NOT EXISTS idx_edge_points_source ON edge_points(source_id);

-- Data formats: how each gateway's messages are read (src/lib/edge-format).
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

ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS format_id VARCHAR(64) REFERENCES edge_formats(id) ON DELETE SET NULL;
-- Extra MQTT topic filters the app subscribes to for this gateway (Devices › gateway › Topics).
ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS topics JSONB NOT NULL DEFAULT '[]';

DO $$ BEGIN
  -- Card and channel ids are text: gateways name them ("AI-3", "TT-101").
  ALTER TABLE edge_points ALTER COLUMN slot TYPE VARCHAR(128) USING slot::text;
  ALTER TABLE edge_points ALTER COLUMN channel TYPE VARCHAR(128) USING channel::text;
  ALTER TABLE edge_points ALTER COLUMN channel SET DEFAULT '1';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Cards (modules / slots) in a source. Points on a card share its code as their slot.
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

-- Operations loop: work orders raised from live findings, and alert acknowledgements.
CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL,
  rule_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  component VARCHAR(255),
  priority VARCHAR(8) NOT NULL DEFAULT 'P3',
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  action_kind VARCHAR(16) NOT NULL DEFAULT 'mitigate' CHECK (action_kind IN ('mitigate','repair')),
  due_label VARCHAR(64),
  assignee VARCHAR(128),
  notes TEXT,
  sim_time DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_orders_machine ON work_orders(machine_id, created_at DESC);

CREATE TABLE IF NOT EXISTS alert_acks (
  rule_id VARCHAR(64) NOT NULL,
  machine_id VARCHAR(64) NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_by VARCHAR(128),
  sim_time DOUBLE PRECISION,
  PRIMARY KEY (machine_id, rule_id)
);

-- AssetIQ prediction ledger: what the AI predicted, and later what actually happened.
CREATE TABLE IF NOT EXISTS ai_predictions (
  id VARCHAR(64) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL,
  run_id VARCHAR(64) NOT NULL,
  episode_key VARCHAR(160) NOT NULL,
  kind VARCHAR(16) NOT NULL,                -- 'signal' | 'rule'
  subject VARCHAR(64) NOT NULL,             -- signal tag or rule id
  label VARCHAR(255) NOT NULL,
  predicted_event TEXT NOT NULL,
  target_level VARCHAR(16) NOT NULL,        -- 'warning' | 'alarm' | 'confirm'
  confidence INTEGER NOT NULL,
  created_t INTEGER NOT NULL,               -- simulated minute
  created_clock VARCHAR(16),
  predicted_t INTEGER NOT NULL,
  expires_t INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending', -- pending | confirmed | missed | void
  outcome_t INTEGER,
  outcome_clock VARCHAR(16),
  lead_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (run_id, episode_key)
);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_machine ON ai_predictions(machine_id, created_at DESC);
