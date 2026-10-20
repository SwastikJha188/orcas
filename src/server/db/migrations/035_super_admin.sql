-- =============================================================================
-- 035 · Oswar super administrator
--
-- Every account is scoped to the plants in its user_plant_access rows. A role
-- with all_plants opens every plant (present and future) without access rows
-- and may manage every user, including other all-plants accounts.
--
-- The Oswar Teck platform account (usr-oswar) holds that role. Its password is
-- never stored here: it comes from ULTRON_DEMO_OSWAR_EMAIL / _PASSWORD in the
-- environment and is hashed into users.password_hash on first use.
-- =============================================================================

ALTER TABLE roles ADD COLUMN IF NOT EXISTS all_plants BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO roles (
  id, name, description,
  can_manage_users, can_manage_plants, can_manage_machines, can_manage_edge,
  can_ack_alerts, can_manage_work_orders, sort_order, all_plants
)
VALUES (
  'role-super-admin', 'Oswar Super Administrator',
  'Oswar Teck platform owner. Opens every plant and manages plants, users, roles, machines and data collectors.',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 0, TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, full_name, title, department, role_id, status, default_plant_id)
VALUES ('usr-oswar', 'admin@oswarteck.com', 'Oswar Teck', 'Super Administrator', 'Oswar Teck', 'role-super-admin', 'Active', NULL)
ON CONFLICT (id) DO NOTHING;
