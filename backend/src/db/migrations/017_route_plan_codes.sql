-- =============================================================================
-- 017 · Maintenance round codes and triggers
--
-- Each round's code in plan ids (PLN-KLN-01-W) and how the plan library names
-- its trigger (OSW-SW-PMS-PYR-01 §4).
-- =============================================================================

ALTER TABLE maintenance_routes ADD COLUMN IF NOT EXISTS plan_code VARCHAR(8);
ALTER TABLE maintenance_routes ADD COLUMN IF NOT EXISTS trigger_label VARCHAR(64);

UPDATE maintenance_routes SET plan_code = v.code, trigger_label = v.trigger
  FROM (VALUES
    ('shift', 'SH', 'Calendar'), ('daily', 'D', 'Calendar'), ('weekly', 'W', 'Calendar'), ('monthly', 'M', 'Calendar'),
    ('quarterly', 'Q', 'Calendar'), ('annual', 'A', 'Calendar'), ('stop', 'STOP', 'Shutdown window'),
    ('event', 'EVT', 'Condition / event'), ('live', 'LIVE', 'Live (ULTRON)'), ('oem', 'OEM', 'OEM interval'), ('site', 'SITE', 'Site survey')
  ) AS v(id, code, trigger)
 WHERE maintenance_routes.id = v.id;

ALTER TABLE maintenance_routes ALTER COLUMN plan_code SET NOT NULL;
ALTER TABLE maintenance_routes ALTER COLUMN trigger_label SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_routes_plan_code ON maintenance_routes(plan_code);
