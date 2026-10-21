-- =============================================================================
-- 016 · Machine short code; site-added checklist items by reference
--
-- * machines.code: the plant's own equipment code (FED-01, VPC-067, KLN-01 …),
--   used in maintenance plan ids and on drawings. The pyro line's machines
--   carry the D4 unit code after their "PYR-" prefix; every other machine's
--   code is its id.
-- * maintenance_custom_tasks refer to their checklist section (group_id) and
--   round (route_id) instead of repeating unit / section / round codes.
-- =============================================================================

ALTER TABLE machines ADD COLUMN IF NOT EXISTS code VARCHAR(32);
UPDATE machines SET code = CASE WHEN id LIKE 'PYR-%' THEN substring(id FROM 5) ELSE id END WHERE code IS NULL;
ALTER TABLE machines ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_plant_code ON machines(plant_id, code);

-- Site-added items: resolve their section and round, then drop the copied codes.
UPDATE maintenance_custom_tasks ct
   SET group_id = g.id
  FROM maintenance_groups g
  JOIN maintenance_units u ON u.id = g.unit_id
  JOIN machine_maintenance_units mu ON mu.unit_id = u.id
 WHERE ct.group_id IS NULL AND mu.machine_id = ct.machine_id AND u.code = ct.unit_code AND g.num = ct.group_num;
UPDATE maintenance_custom_tasks SET route_id = route WHERE route_id IS NULL;
DELETE FROM maintenance_custom_tasks WHERE group_id IS NULL OR route_id IS NULL;
ALTER TABLE maintenance_custom_tasks ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE maintenance_custom_tasks ALTER COLUMN route_id SET NOT NULL;
ALTER TABLE maintenance_custom_tasks DROP COLUMN IF EXISTS unit_code;
ALTER TABLE maintenance_custom_tasks DROP COLUMN IF EXISTS group_num;
ALTER TABLE maintenance_custom_tasks DROP COLUMN IF EXISTS route;
