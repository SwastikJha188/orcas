-- =============================================================================
-- 014 · Maintenance checklists in the database
--
-- The machine and sensor maintenance checklists (OSW-PE-MNT/SMT-PYR-01,
-- OSW-PE-MNT/SMT-VPC-01), their vocabulary (rounds, intervals, owners, modes,
-- scopes) and which checklist units apply to which machine. Previously compiled
-- into the application; the inspection results already lived here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS maintenance_routes (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  -- Calendar interval in hours; NULL when the round is not calendar-driven (stop, event, OEM, live).
  interval_hours REAL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

-- Rounds offered per checklist kind, in display order; `addable` rounds take site-added items.
CREATE TABLE IF NOT EXISTS maintenance_kind_routes (
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
  route_id VARCHAR(16) NOT NULL REFERENCES maintenance_routes(id),
  addable BOOLEAN NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, route_id)
);

-- Interval wording as the documents print it, and the round it belongs to.
CREATE TABLE IF NOT EXISTS maintenance_frequencies (
  code VARCHAR(32) PRIMARY KEY,
  route_id VARCHAR(16) NOT NULL REFERENCES maintenance_routes(id),
  label VARCHAR(64) NOT NULL,
  -- The wording used when a site-added item joins this round.
  canonical BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_frequencies_canonical ON maintenance_frequencies(route_id) WHERE canonical;

CREATE TABLE IF NOT EXISTS maintenance_owners (
  code VARCHAR(16) PRIMARY KEY,
  label VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_modes (
  code VARCHAR(16) PRIMARY KEY,
  label VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_scopes (
  code VARCHAR(16) PRIMARY KEY,
  label VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_documents (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
  number VARCHAR(64) NOT NULL UNIQUE,
  revision VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  issued VARCHAR(64) NOT NULL,
  status VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_units (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES maintenance_documents(id) ON DELETE CASCADE,
  code VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  conditional BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (document_id, code)
);

CREATE TABLE IF NOT EXISTS maintenance_groups (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES maintenance_units(id) ON DELETE CASCADE,
  num VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (unit_id, num)
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES maintenance_groups(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  tag VARCHAR(64),
  component VARCHAR(255) NOT NULL,
  priority VARCHAR(16),
  pass_text TEXT NOT NULL,
  frequency VARCHAR(32) NOT NULL REFERENCES maintenance_frequencies(code),
  owner VARCHAR(16) NOT NULL REFERENCES maintenance_owners(code),
  mode VARCHAR(16) NOT NULL REFERENCES maintenance_modes(code),
  scope VARCHAR(16) NOT NULL REFERENCES maintenance_scopes(code),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (group_id, code)
);

CREATE TABLE IF NOT EXISTS maintenance_task_steps (
  task_id INTEGER NOT NULL REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  step_no SMALLINT NOT NULL,
  label VARCHAR(32),
  text TEXT NOT NULL,
  PRIMARY KEY (task_id, step_no)
);

-- Which document a machine's checklist of each kind follows (title block).
CREATE TABLE IF NOT EXISTS machine_maintenance_documents (
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
  document_id INTEGER NOT NULL REFERENCES maintenance_documents(id) ON DELETE CASCADE,
  PRIMARY KEY (machine_id, kind)
);

-- The checklist units a machine is built from (GEN + its units, §1.2).
CREATE TABLE IF NOT EXISTS machine_maintenance_units (
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL REFERENCES maintenance_units(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (machine_id, unit_id)
);

-- Site-added items point at their section and round instead of repeating codes.
ALTER TABLE maintenance_custom_tasks ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES maintenance_groups(id) ON DELETE CASCADE;
ALTER TABLE maintenance_custom_tasks ADD COLUMN IF NOT EXISTS route_id VARCHAR(16) REFERENCES maintenance_routes(id);
