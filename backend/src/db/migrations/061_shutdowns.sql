-- =============================================================================
-- 061 · Shutdowns: one planned stop of a plant's machines, from plan to restart
--
-- shutdowns               name, planned window and state of one planned stop
-- shutdown_machines       the machines it stops; kiln cool-down hours (person-set,
--                         null = not known) and the service state to give back
--                         at the restart (the machine shows "Maintenance" while
--                         it is stopped, so stop-caused readings raise no alarms)
-- shutdown_items          the work done in it: checklist items, work orders and
--                         part replacements; moved items go to the next shutdown
-- shutdown_crews          people per trade (maintenance_owners) and their hours a day
-- shutdown_isolations     lock-off points, blanks and permits: who isolated and
--                         released each one. Recorded only: stopping, locking off
--                         and safe entry follow the plant's own procedures.
-- shutdown_events         audit trail; when each state began is read from it
-- =============================================================================

CREATE TABLE IF NOT EXISTS shutdown_states (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO shutdown_states (id, label, sort_order) VALUES
  ('draft', 'Being planned', 0),
  ('approved', 'Approved', 1),
  ('stopping', 'Stopping', 2),
  ('in_progress', 'Work under way', 3),
  ('restarting', 'Restarting', 4),
  ('closed', 'Closed', 5),
  ('cancelled', 'Cancelled', 6)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS shutdowns (
  id SERIAL PRIMARY KEY,
  plant_id VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  planned_start TIMESTAMPTZ NOT NULL,
  planned_end TIMESTAMPTZ NOT NULL,
  state_id VARCHAR(16) NOT NULL DEFAULT 'draft' REFERENCES shutdown_states(id),
  notes TEXT,
  created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (planned_end > planned_start)
);

CREATE INDEX IF NOT EXISTS idx_shutdowns_plant ON shutdowns (plant_id, planned_start);
-- One shutdown under way per plant at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shutdowns_active ON shutdowns (plant_id) WHERE state_id IN ('stopping', 'in_progress', 'restarting');

CREATE TABLE IF NOT EXISTS shutdown_machines (
  shutdown_id INTEGER NOT NULL REFERENCES shutdowns(id) ON DELETE CASCADE,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  cooldown_hours NUMERIC CHECK (cooldown_hours IS NULL OR cooldown_hours >= 0),
  restore_service_state VARCHAR(16) CHECK (restore_service_state IN ('Operational', 'Standby', 'Maintenance')),
  PRIMARY KEY (shutdown_id, machine_id)
);

CREATE TABLE IF NOT EXISTS shutdown_item_kinds (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO shutdown_item_kinds (id, label, sort_order) VALUES
  ('task', 'Checklist item', 0),
  ('work_order', 'Work order', 1),
  ('part', 'Part replacement', 2)
ON CONFLICT (id) DO NOTHING;

-- A checklist item names its machine (task ids repeat on every machine); a work
-- order and a part already belong to one, read through their own rows.
CREATE TABLE IF NOT EXISTS shutdown_items (
  id SERIAL PRIMARY KEY,
  shutdown_id INTEGER NOT NULL REFERENCES shutdowns(id) ON DELETE CASCADE,
  kind_id VARCHAR(16) NOT NULL REFERENCES shutdown_item_kinds(id),
  machine_id VARCHAR(64),
  checklist_kind VARCHAR(16) CHECK (checklist_kind IN ('equipment', 'sensor')),
  task_id VARCHAR(32),
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id VARCHAR(32) REFERENCES component_service_lives(id) ON DELETE CASCADE,
  -- Hours of work for a checklist item or a part (a work order keeps its own estimate).
  estimate_hours NUMERIC CHECK (estimate_hours IS NULL OR estimate_hours > 0),
  -- Is the part in the store (part replacements; a work order keeps its own readiness).
  parts_state VARCHAR(16) CHECK (parts_state IN ('pending', 'confirmed', 'blocked', 'na')),
  -- Added while the line was stopped (work found during the shutdown).
  found BOOLEAN NOT NULL DEFAULT FALSE,
  moved_reason TEXT,
  moved_at TIMESTAMPTZ,
  moved_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  added_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (shutdown_id, machine_id) REFERENCES shutdown_machines(shutdown_id, machine_id) ON DELETE CASCADE,
  CHECK (
    (kind_id = 'task' AND machine_id IS NOT NULL AND checklist_kind IS NOT NULL AND task_id IS NOT NULL AND work_order_id IS NULL AND part_id IS NULL)
    OR (kind_id = 'work_order' AND machine_id IS NULL AND work_order_id IS NOT NULL AND part_id IS NULL AND task_id IS NULL)
    OR (kind_id = 'part' AND machine_id IS NULL AND part_id IS NOT NULL AND work_order_id IS NULL AND task_id IS NULL)
  ),
  CHECK ((moved_at IS NULL) = (moved_reason IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shutdown_items_task ON shutdown_items (shutdown_id, machine_id, checklist_kind, task_id) WHERE kind_id = 'task';
CREATE UNIQUE INDEX IF NOT EXISTS uq_shutdown_items_wo ON shutdown_items (shutdown_id, work_order_id) WHERE kind_id = 'work_order';
CREATE UNIQUE INDEX IF NOT EXISTS uq_shutdown_items_part ON shutdown_items (shutdown_id, part_id) WHERE kind_id = 'part';

CREATE TABLE IF NOT EXISTS shutdown_crews (
  shutdown_id INTEGER NOT NULL REFERENCES shutdowns(id) ON DELETE CASCADE,
  owner_code VARCHAR(16) NOT NULL REFERENCES maintenance_owners(code),
  people SMALLINT NOT NULL CHECK (people > 0),
  hours_per_day NUMERIC NOT NULL CHECK (hours_per_day > 0 AND hours_per_day <= 24),
  PRIMARY KEY (shutdown_id, owner_code)
);

CREATE TABLE IF NOT EXISTS shutdown_isolation_kinds (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  -- A blank or spectacle plate fitted in a line (every one is removed before the restart).
  is_blank BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

-- The energies the isolation map covers (OSW-PE-MNT-PYR-01 GEN-011) and line blanks (GEN-051).
INSERT INTO shutdown_isolation_kinds (id, label, is_blank, sort_order) VALUES
  ('electrical', 'Electrical', FALSE, 0),
  ('mechanical', 'Mechanical', FALSE, 1),
  ('pneumatic', 'Compressed air', FALSE, 2),
  ('hydraulic', 'Hydraulic', FALSE, 3),
  ('thermal', 'Heat or steam', FALSE, 4),
  ('gravity', 'Stored or gravity energy', FALSE, 5),
  ('blank', 'Blank or spectacle plate', TRUE, 6)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS shutdown_isolations (
  id SERIAL PRIMARY KEY,
  shutdown_id INTEGER NOT NULL,
  machine_id VARCHAR(64) NOT NULL,
  kind_id VARCHAR(16) NOT NULL REFERENCES shutdown_isolation_kinds(id),
  point VARCHAR(160) NOT NULL,
  permit_ref VARCHAR(64),
  isolated_at TIMESTAMPTZ,
  isolated_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,
  released_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (shutdown_id, machine_id) REFERENCES shutdown_machines(shutdown_id, machine_id) ON DELETE CASCADE,
  CHECK (released_at IS NULL OR isolated_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_shutdown_isolations ON shutdown_isolations (shutdown_id);

CREATE TABLE IF NOT EXISTS shutdown_events (
  id SERIAL PRIMARY KEY,
  shutdown_id INTEGER NOT NULL REFERENCES shutdowns(id) ON DELETE CASCADE,
  action VARCHAR(32) NOT NULL,
  from_state VARCHAR(16) REFERENCES shutdown_states(id),
  to_state VARCHAR(16) REFERENCES shutdown_states(id),
  reason TEXT,
  actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shutdown_events ON shutdown_events (shutdown_id, at);

-- After the restart, readings are compared with the hours before the stop.
INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('shutdown.compare_window_h', 2, 'h', 'Hours of readings before the stop and after the restart that are compared when a shutdown ends')
ON CONFLICT (key) DO NOTHING;
