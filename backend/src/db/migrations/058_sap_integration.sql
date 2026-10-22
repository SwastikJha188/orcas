-- =============================================================================
-- 058 · SAP integration (Maintenance › SAP)
--
-- Ported from the ULTRON console's SAP S/4HANA integration. One SAP system per
-- plant. ULTRON reads equipment, notifications, maintenance orders, material
-- stock, measurement documents and production orders over OData into a cache,
-- and writes notifications (and measurement documents) through an outbox that
-- retries with back-off. Every exchange is written to the audit log.
--
--   sap_editions / sap_auth_types / sap_resources   lookups (resource = one
--       OData entity set: its standard path, the fields that key a record and
--       the write it allows, if any)
--   sap_connections          the plant's SAP system; credentials are encrypted
--       by the server (AES-256-GCM, SAP_CREDENTIALS_ENCRYPTION_KEY) and never
--       leave it. The last connection test is read from the audit log.
--   sap_object_cache         the latest records per resource
--   sap_sync_runs (+ _resources)   one row per sync, one per resource read
--   sap_outbox               writes to SAP, each with an idempotency key
--   sap_audit_log            every request to SAP and every change here
--   sap_material_mappings    which SAP material a machine part uses
--
-- Machine ↔ SAP equipment stays in sap_equipment_records (000).
-- =============================================================================

CREATE TABLE IF NOT EXISTS sap_editions (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  sort_order SMALLINT NOT NULL
);

INSERT INTO sap_editions (id, label, sort_order) VALUES
  ('cloud_public',      'S/4HANA Cloud, public edition',  10),
  ('cloud_private',     'S/4HANA Cloud, private edition', 20),
  ('on_premise',        'S/4HANA on premise',             30),
  ('integration_suite', 'SAP Integration Suite',          40)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sap_auth_types (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  sort_order SMALLINT NOT NULL
);

INSERT INTO sap_auth_types (id, label, sort_order) VALUES
  ('oauth_client_credentials', 'OAuth 2.0 client credentials', 10),
  ('basic',                    'User name and password',       20)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sap_resources (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  api_name VARCHAR(80) NOT NULL,
  default_path TEXT NOT NULL CHECK (default_path LIKE '/%' AND default_path NOT LIKE '//%'),
  key_fields TEXT[] NOT NULL,
  -- The audit action of the one write ULTRON may make to this resource; NULL = read only.
  write_action VARCHAR(48),
  sort_order SMALLINT NOT NULL
);

INSERT INTO sap_resources (id, label, api_name, default_path, key_fields, write_action, sort_order) VALUES
  ('equipment', 'Equipment', 'API_EQUIPMENT',
     '/sap/opu/odata/sap/API_EQUIPMENT/Equipment', ARRAY['Equipment','EquipmentUUID'], NULL, 10),
  ('notifications', 'Notifications', 'API_MAINTENANCENOTIFICATION',
     '/sap/opu/odata4/sap/api_maintenancenotification/srvd_a2x/sap/api_maintenancenotification/0001/Notification',
     ARRAY['MaintenanceNotification','Notification'], 'notification.create', 20),
  ('maintenanceOrders', 'Maintenance orders', 'API_MAINTENANCEORDER_0002',
     '/sap/opu/odata/sap/API_MAINTENANCEORDER_0002/MaintenanceOrder', ARRAY['MaintenanceOrder'], NULL, 30),
  ('materialStock', 'Material stock', 'API_MATERIAL_STOCK_SRV',
     '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod',
     ARRAY['Material','Plant','StorageLocation','Batch','InventoryStockType'], NULL, 40),
  ('measurementDocuments', 'Measurement documents', 'API_MEASUREMENTDOCUMENT',
     '/sap/opu/odata4/sap/api_measurementdocument/srvd_a2x/sap/MeasurementDocument/0001/MeasurementDocument',
     ARRAY['MeasurementDocument'], 'measurement.create', 50),
  ('productionOrders', 'Production orders', 'API_PRODUCTION_ORDER_2_SRV',
     '/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2', ARRAY['ProductionOrder'], NULL, 60)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sap_connections (
  id VARCHAR(64) PRIMARY KEY,
  plant_id VARCHAR(64) NOT NULL UNIQUE REFERENCES plants(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL CHECK (length(trim(name)) > 0),
  edition_id VARCHAR(32) NOT NULL REFERENCES sap_editions(id),
  base_url TEXT NOT NULL,
  auth_type_id VARCHAR(32) NOT NULL REFERENCES sap_auth_types(id),
  token_url TEXT,
  encrypted_credentials TEXT NOT NULL,
  -- The plant's code in SAP (WERKS), e.g. 1000.
  sap_plant VARCHAR(16),
  -- Notification type ULTRON raises (M1 = maintenance request in standard SAP).
  notification_type VARCHAR(4) NOT NULL DEFAULT 'M1',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paths that differ from the resource's standard path on this SAP system.
CREATE TABLE IF NOT EXISTS sap_connection_paths (
  connection_id VARCHAR(64) NOT NULL REFERENCES sap_connections(id) ON DELETE CASCADE,
  resource_id VARCHAR(32) NOT NULL REFERENCES sap_resources(id),
  path TEXT NOT NULL CHECK (path LIKE '/%' AND path NOT LIKE '//%'),
  PRIMARY KEY (connection_id, resource_id)
);

CREATE TABLE IF NOT EXISTS sap_object_cache (
  connection_id VARCHAR(64) NOT NULL REFERENCES sap_connections(id) ON DELETE CASCADE,
  resource_id VARCHAR(32) NOT NULL REFERENCES sap_resources(id),
  object_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id, resource_id, object_key)
);
CREATE INDEX IF NOT EXISTS sap_object_cache_recent ON sap_object_cache (connection_id, resource_id, synced_at DESC);

CREATE TABLE IF NOT EXISTS sap_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  connection_id VARCHAR(64) NOT NULL REFERENCES sap_connections(id) ON DELETE CASCADE,
  requested_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);
CREATE INDEX IF NOT EXISTS sap_sync_runs_recent ON sap_sync_runs (connection_id, started_at DESC);

-- One row per resource a run read: how many records, or why it failed.
CREATE TABLE IF NOT EXISTS sap_sync_run_resources (
  run_id BIGINT NOT NULL REFERENCES sap_sync_runs(id) ON DELETE CASCADE,
  resource_id VARCHAR(32) NOT NULL REFERENCES sap_resources(id),
  records INTEGER CHECK (records >= 0),
  pages SMALLINT CHECK (pages >= 0),
  truncated BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  PRIMARY KEY (run_id, resource_id),
  CHECK ((records IS NULL) <> (error IS NULL))
);

CREATE TABLE IF NOT EXISTS sap_outbox (
  id BIGSERIAL PRIMARY KEY,
  connection_id VARCHAR(64) NOT NULL REFERENCES sap_connections(id) ON DELETE CASCADE,
  resource_id VARCHAR(32) NOT NULL REFERENCES sap_resources(id),
  -- What in ULTRON the write is about (a machine's problem), when anything.
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE SET NULL,
  rule_code VARCHAR(64),
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  state VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','retry','completed','failed')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  object_key TEXT,
  correlation_id UUID NOT NULL,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sap_outbox_runnable ON sap_outbox (next_attempt_at, created_at) WHERE state IN ('pending','retry');
CREATE INDEX IF NOT EXISTS sap_outbox_connection ON sap_outbox (connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sap_outbox_problem ON sap_outbox (machine_id, rule_code);

CREATE TABLE IF NOT EXISTS sap_audit_log (
  id BIGSERIAL PRIMARY KEY,
  connection_id VARCHAR(64) REFERENCES sap_connections(id) ON DELETE CASCADE,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(48) NOT NULL,
  resource_id VARCHAR(32) REFERENCES sap_resources(id),
  object_key TEXT,
  direction VARCHAR(8) NOT NULL DEFAULT 'internal' CHECK (direction IN ('to_sap','from_sap','internal')),
  status VARCHAR(8) NOT NULL CHECK (status IN ('success','warning','failed')),
  http_status SMALLINT CHECK (http_status BETWEEN 100 AND 599),
  duration_ms INTEGER CHECK (duration_ms >= 0),
  correlation_id UUID,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sap_audit_log_connection ON sap_audit_log (connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sap_audit_log_tests ON sap_audit_log (connection_id, created_at DESC) WHERE action = 'connection.test';

CREATE TABLE IF NOT EXISTS sap_material_mappings (
  id BIGSERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  subassembly_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE CASCADE,
  description VARCHAR(200) NOT NULL CHECK (length(trim(description)) > 0),
  sap_material VARCHAR(40) NOT NULL CHECK (length(trim(sap_material)) > 0),
  storage_location VARCHAR(8),
  required_quantity REAL CHECK (required_quantity > 0),
  unit VARCHAR(8),
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (machine_id, sap_material)
);
CREATE INDEX IF NOT EXISTS sap_material_mappings_machine ON sap_material_mappings (machine_id);
