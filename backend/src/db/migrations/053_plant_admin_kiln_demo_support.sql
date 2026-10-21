-- =============================================================================
-- 053 · Plant administrator, single-machine demo, support tickets
--
-- Three kinds of account:
--   · the Oswar super administrator (035): every plant, every user, Simulation;
--   · a plant administrator: one plant's users, machines, gateways and work,
--     and may raise support tickets to Oswar Teck; no Simulation;
--   · a single-machine demo: one machine of a plant (user_machine_access) and
--     its parts, on the machine's own live simulation.
--
-- Passwords are never stored here: they come from ULTRON_DEMO_<NAME>_EMAIL /
-- _PASSWORD in the environment and are hashed into users.password_hash on the
-- server's first sign-in (auth-service).
-- =============================================================================

-- Who may raise a support ticket to Oswar Teck (the super administrator answers them).
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_raise_tickets BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO roles (
  id, name, description,
  can_manage_users, can_manage_plants, can_manage_machines, can_manage_edge,
  can_ack_alerts, can_manage_work_orders, sort_order, all_plants, can_raise_tickets
)
VALUES (
  'role-plant-admin', 'Plant Administrator',
  'Runs one plant: its users, machines, gateways and work orders, and raises support tickets to Oswar Teck.',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 1, FALSE, TRUE
)
ON CONFLICT (id) DO NOTHING;

UPDATE roles SET can_raise_tickets = TRUE WHERE id IN ('role-admin', 'role-plant-mgr', 'role-plant-admin');

INSERT INTO users (id, email, full_name, title, department, role_id, status, default_plant_id)
VALUES
  ('usr-plant-admin', 'mwila.chanda@ultron.industrial', 'Mwila Chanda', 'Plant Manager', 'Plant management', 'role-plant-admin', 'Active', 'plant-pyro'),
  ('usr-kiln-demo', 'kiln.demo@ultron.industrial', 'Kiln demo', 'Demo account', 'Oswar Teck', 'role-operator', 'Active', 'plant-kln')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_plant_access (user_id, plant_id, access_level)
VALUES ('usr-plant-admin', 'plant-pyro', 'admin'), ('usr-kiln-demo', 'plant-kln', 'write')
ON CONFLICT DO NOTHING;

-- An account with rows here sees only these machines of its plants (and their parts);
-- without rows it sees every machine of its plants.
CREATE TABLE IF NOT EXISTS user_machine_access (
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, machine_id)
);

INSERT INTO user_machine_access (user_id, machine_id) VALUES ('usr-kiln-demo', 'KLN-01') ON CONFLICT DO NOTHING;

-- Support tickets: raised by a plant's people, answered by Oswar Teck.
CREATE TABLE IF NOT EXISTS support_ticket_statuses (
  id VARCHAR(16) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
INSERT INTO support_ticket_statuses (id, label, sort_order)
VALUES ('open', 'Open', 0), ('answered', 'Answered', 1), ('closed', 'Closed', 2)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  plant_id VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE SET NULL,
  raised_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  status_id VARCHAR(16) NOT NULL DEFAULT 'open' REFERENCES support_ticket_statuses(id),
  reply TEXT,
  replied_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  notify_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_tickets_plant ON support_tickets (plant_id, created_at DESC);
