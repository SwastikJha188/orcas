-- =============================================================================
-- 059 · SAP: more of SAP, a schedule, measuring points, and the SAP simulator
--
-- ULTRON side
--   sap_resources            + order components, material descriptions and
--                              measuring points (read), measurement documents
--                              stay the one second write
--   sap_connections          + sync_every_min / publish_every_min: the
--                              server syncs and publishes readings on its own
--   sap_measuring_point_mappings   ULTRON measurement → SAP measuring point
--
-- SAP simulator (Simulation tab, super administrator)
--   A stand-in SAP S/4HANA system per plant that answers the same OData calls
--   a real one does. Its master data is made from the plant's own machines,
--   parts and measurements; its planner turns notifications into maintenance
--   orders, releases and finishes them, issues spare parts and reorders stock,
--   and keeps a rolling week of production orders on the plant's main machine.
--   Every status is read from the times stored here, so nothing ticks.
-- =============================================================================

INSERT INTO sap_resources (id, label, api_name, default_path, key_fields, write_action, sort_order) VALUES
  ('orderComponents', 'Order parts', 'API_MAINTENANCEORDER_0002',
     '/sap/opu/odata/sap/API_MAINTENANCEORDER_0002/MaintenanceOrderComponent',
     ARRAY['MaintenanceOrder','MaintenanceOrderComponent','Material'], NULL, 35),
  ('materials', 'Materials', 'API_PRODUCT_SRV',
     '/sap/opu/odata/sap/API_PRODUCT_SRV/A_ProductDescription', ARRAY['Product','Language'], NULL, 38),
  ('measuringPoints', 'Measuring points', 'API_MEASURINGPOINT',
     '/sap/opu/odata/sap/API_MEASURINGPOINT/MeasuringPoint', ARRAY['MeasuringPoint'], NULL, 45)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE sap_connections ADD COLUMN IF NOT EXISTS sync_every_min SMALLINT CHECK (sync_every_min BETWEEN 1 AND 1440);
ALTER TABLE sap_connections ADD COLUMN IF NOT EXISTS publish_every_min SMALLINT CHECK (publish_every_min BETWEEN 1 AND 1440);

-- Which SAP measuring point an ULTRON measurement's readings are written to.
CREATE TABLE IF NOT EXISTS sap_measuring_point_mappings (
  measurement_id VARCHAR(128) PRIMARY KEY REFERENCES measurements(id) ON DELETE CASCADE,
  sap_point VARCHAR(12) NOT NULL CHECK (length(trim(sap_point)) > 0),
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One publish per measurement and reading time: the reading a measurement document carries.
ALTER TABLE sap_outbox ADD COLUMN IF NOT EXISTS measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sap_outbox_measurement ON sap_outbox (measurement_id, created_at DESC) WHERE measurement_id IS NOT NULL;

/* ----------------------------------------------------------- simulator */

CREATE TABLE IF NOT EXISTS sap_sim_systems (
  plant_id VARCHAR(64) PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  seed INTEGER NOT NULL,
  -- The plant's code in SAP (WERKS).
  plant_code VARCHAR(4) NOT NULL,
  -- The communication user SAP issued to ULTRON: client id and a hash of its secret.
  client_id VARCHAR(40) NOT NULL,
  client_secret_hash CHAR(64) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The simulator has played SAP's own work (planner, stock, production) up to here.
  advanced_to TIMESTAMPTZ NOT NULL DEFAULT now(),
  planner_delay_min SMALLINT NOT NULL DEFAULT 20 CHECK (planner_delay_min BETWEEN 1 AND 1440),
  release_delay_min SMALLINT NOT NULL DEFAULT 30 CHECK (release_delay_min BETWEEN 0 AND 1440),
  work_hours REAL NOT NULL DEFAULT 4 CHECK (work_hours > 0 AND work_hours <= 72),
  verify_hours REAL NOT NULL DEFAULT 48 CHECK (verify_hours >= 0 AND verify_hours <= 720),
  preventive_every_days SMALLINT NOT NULL DEFAULT 14 CHECK (preventive_every_days BETWEEN 1 AND 365),
  production_hours REAL NOT NULL DEFAULT 10 CHECK (production_hours >= 1 AND production_hours <= 72),
  latency_ms SMALLINT NOT NULL DEFAULT 220 CHECK (latency_ms BETWEEN 0 AND 10000),
  failure_rate REAL NOT NULL DEFAULT 0.02 CHECK (failure_rate >= 0 AND failure_rate <= 1),
  -- One API that keeps timing out, to see retries and partial syncs.
  slow_resource_id VARCHAR(32) REFERENCES sap_resources(id),
  stock_level REAL NOT NULL DEFAULT 1 CHECK (stock_level >= 0 AND stock_level <= 10),
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- What each plant makes (production orders), per plant.
CREATE TABLE IF NOT EXISTS sap_sim_products (
  plant_id VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  material VARCHAR(40) NOT NULL,
  description VARCHAR(80) NOT NULL,
  unit VARCHAR(3) NOT NULL,
  rate_per_hour REAL NOT NULL CHECK (rate_per_hour > 0),
  PRIMARY KEY (plant_id, material)
);

-- Only plants that exist (an empty database gets them from the fixture, which carries these rows too).
INSERT INTO sap_sim_products (plant_id, material, description, unit, rate_per_hour)
SELECT v.* FROM (VALUES
  ('plant-pyro',  'CLK-OPC-01', 'Portland clinker',          'TO', 208),
  ('plant-pyro',  'CLK-SRC-01', 'Sulphate-resisting clinker', 'TO', 195),
  ('plant-kdemo', 'CLK-OPC-01', 'Portland clinker',          'TO', 208),
  ('plant-kln',   'CLK-OPC-01', 'Portland clinker',          'TO', 625),
  ('plant-conc',  'CON-CU-28',  'Copper concentrate 28 % Cu', 'TO', 140),
  ('plant-hyd',   'CAT-CU-A',   'Copper cathode grade A',    'TO', 9.5),
  ('plant-vpc',   'JWL-TREE-18', 'Cast tree 18 kt gold',     'EA', 3)
) AS v(plant_id, material, description, unit, rate_per_hour)
JOIN plants p ON p.id = v.plant_id
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sap_sim_equipment (
  plant_id VARCHAR(64) NOT NULL REFERENCES sap_sim_systems(plant_id) ON DELETE CASCADE,
  equipment VARCHAR(18) NOT NULL,
  -- The machine this SAP equipment stands for (the simulator's own link; ULTRON maps it itself).
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  description VARCHAR(40) NOT NULL,
  floc VARCHAR(40) NOT NULL,
  work_center VARCHAR(8) NOT NULL,
  cost_center VARCHAR(10) NOT NULL,
  PRIMARY KEY (plant_id, equipment),
  UNIQUE (plant_id, machine_id)
);

CREATE TABLE IF NOT EXISTS sap_sim_materials (
  plant_id VARCHAR(64) NOT NULL REFERENCES sap_sim_systems(plant_id) ON DELETE CASCADE,
  material VARCHAR(40) NOT NULL,
  description VARCHAR(40) NOT NULL,
  base_unit VARCHAR(3) NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  PRIMARY KEY (plant_id, material)
);

-- Equipment bill of material: the spares each equipment uses, per machine part.
CREATE TABLE IF NOT EXISTS sap_sim_bom (
  plant_id VARCHAR(64) NOT NULL,
  equipment VARCHAR(18) NOT NULL,
  material VARCHAR(40) NOT NULL,
  subassembly_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE CASCADE,
  quantity REAL NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (plant_id, equipment, material),
  FOREIGN KEY (plant_id, equipment) REFERENCES sap_sim_equipment(plant_id, equipment) ON DELETE CASCADE,
  FOREIGN KEY (plant_id, material) REFERENCES sap_sim_materials(plant_id, material) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sap_sim_stock (
  plant_id VARCHAR(64) NOT NULL,
  material VARCHAR(40) NOT NULL,
  storage_location VARCHAR(4) NOT NULL,
  opening_qty REAL NOT NULL CHECK (opening_qty >= 0),
  reorder_point REAL NOT NULL CHECK (reorder_point >= 0),
  reorder_qty REAL NOT NULL CHECK (reorder_qty > 0),
  lead_days REAL NOT NULL CHECK (lead_days > 0),
  PRIMARY KEY (plant_id, material, storage_location),
  FOREIGN KEY (plant_id, material) REFERENCES sap_sim_materials(plant_id, material) ON DELETE CASCADE
);

-- Goods issues (negative) and receipts (positive); stock = opening + movements up to now.
CREATE TABLE IF NOT EXISTS sap_sim_stock_movements (
  id BIGSERIAL PRIMARY KEY,
  plant_id VARCHAR(64) NOT NULL,
  material VARCHAR(40) NOT NULL,
  storage_location VARCHAR(4) NOT NULL,
  quantity REAL NOT NULL CHECK (quantity <> 0),
  at TIMESTAMPTZ NOT NULL,
  maintenance_order VARCHAR(12),
  FOREIGN KEY (plant_id, material, storage_location) REFERENCES sap_sim_stock(plant_id, material, storage_location) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sap_sim_stock_movements_material ON sap_sim_stock_movements (plant_id, material, storage_location, at);

CREATE TABLE IF NOT EXISTS sap_sim_notifications (
  plant_id VARCHAR(64) NOT NULL REFERENCES sap_sim_systems(plant_id) ON DELETE CASCADE,
  notification VARCHAR(12) NOT NULL,
  equipment VARCHAR(18) NOT NULL,
  notification_type VARCHAR(4) NOT NULL,
  priority VARCHAR(1),
  text VARCHAR(40) NOT NULL,
  long_text TEXT,
  reported_by VARCHAR(12) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (plant_id, notification),
  FOREIGN KEY (plant_id, equipment) REFERENCES sap_sim_equipment(plant_id, equipment) ON DELETE CASCADE
);

-- Order times are planned when the order is made; its status is read from them.
CREATE TABLE IF NOT EXISTS sap_sim_orders (
  plant_id VARCHAR(64) NOT NULL REFERENCES sap_sim_systems(plant_id) ON DELETE CASCADE,
  maintenance_order VARCHAR(12) NOT NULL,
  order_type VARCHAR(4) NOT NULL CHECK (order_type IN ('PM01','PM02')),
  equipment VARCHAR(18) NOT NULL,
  notification VARCHAR(12),
  description VARCHAR(40) NOT NULL,
  priority VARCHAR(1),
  created_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  finish_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL,
  CHECK (created_at <= released_at AND released_at <= start_at AND start_at < finish_at AND finish_at <= closed_at),
  PRIMARY KEY (plant_id, maintenance_order),
  FOREIGN KEY (plant_id, equipment) REFERENCES sap_sim_equipment(plant_id, equipment) ON DELETE CASCADE,
  FOREIGN KEY (plant_id, notification) REFERENCES sap_sim_notifications(plant_id, notification) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sap_sim_order_components (
  plant_id VARCHAR(64) NOT NULL,
  maintenance_order VARCHAR(12) NOT NULL,
  item SMALLINT NOT NULL,
  material VARCHAR(40) NOT NULL,
  storage_location VARCHAR(4) NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (plant_id, maintenance_order, item),
  FOREIGN KEY (plant_id, maintenance_order) REFERENCES sap_sim_orders(plant_id, maintenance_order) ON DELETE CASCADE,
  FOREIGN KEY (plant_id, material, storage_location) REFERENCES sap_sim_stock(plant_id, material, storage_location) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sap_sim_production_orders (
  plant_id VARCHAR(64) NOT NULL REFERENCES sap_sim_systems(plant_id) ON DELETE CASCADE,
  production_order VARCHAR(12) NOT NULL,
  material VARCHAR(40) NOT NULL,
  equipment VARCHAR(18) NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL CHECK (end_at > start_at),
  PRIMARY KEY (plant_id, production_order),
  FOREIGN KEY (plant_id, material) REFERENCES sap_sim_products(plant_id, material) ON DELETE CASCADE,
  FOREIGN KEY (plant_id, equipment) REFERENCES sap_sim_equipment(plant_id, equipment) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sap_sim_production_orders_time ON sap_sim_production_orders (plant_id, start_at);

CREATE TABLE IF NOT EXISTS sap_sim_measuring_points (
  plant_id VARCHAR(64) NOT NULL,
  measuring_point VARCHAR(12) NOT NULL,
  equipment VARCHAR(18) NOT NULL,
  -- The measurement this point stands for (the simulator's own link).
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  description VARCHAR(40) NOT NULL,
  unit VARCHAR(8),
  PRIMARY KEY (plant_id, measuring_point),
  FOREIGN KEY (plant_id, equipment) REFERENCES sap_sim_equipment(plant_id, equipment) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sap_sim_measurement_documents (
  plant_id VARCHAR(64) NOT NULL,
  document VARCHAR(20) NOT NULL,
  measuring_point VARCHAR(12) NOT NULL,
  reading REAL NOT NULL,
  unit VARCHAR(8),
  reading_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plant_id, document),
  FOREIGN KEY (plant_id, measuring_point) REFERENCES sap_sim_measuring_points(plant_id, measuring_point) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sap_sim_measurement_documents_point ON sap_sim_measurement_documents (plant_id, measuring_point, reading_at DESC);
