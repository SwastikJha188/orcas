-- =============================================================================
-- 062 · Shutdown work: the trade that does a work order or a part replacement
--
-- A checklist item names its trade (maintenance_tasks.owner); a work order and
-- a part record do not. The planner picks it, so the hours go to the right
-- crew on the shutdown timeline (null = not picked; those hours stay off it).
-- =============================================================================

ALTER TABLE shutdown_items ADD COLUMN IF NOT EXISTS owner_code VARCHAR(16) REFERENCES maintenance_owners(code);
ALTER TABLE shutdown_items DROP CONSTRAINT IF EXISTS shutdown_items_owner_kind_check;
ALTER TABLE shutdown_items ADD CONSTRAINT shutdown_items_owner_kind_check CHECK (owner_code IS NULL OR kind_id <> 'task');
