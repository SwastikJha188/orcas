-- Integrity gaps and dead columns found by the 2026-10-21 schema audit.
--
-- 1. Foreign keys the live database never got. maintenance_records and
--    user_sessions existed before 000/001 ran, so their CREATE TABLE IF NOT
--    EXISTS (and the REFERENCES in it) was skipped. Orphans are cleared first:
--    one maintenance record pointed at a deleted work order, one session at a
--    deleted user.
-- 2. work_orders.rule_id and cases.rule_code hold a rule's code (unique per
--    machine) with nothing enforcing it; they now reference rules(machine_id,
--    code). Deleting a rule clears the reference, renaming its code follows it.
-- 3. Dead measurement columns: signal_lo / signal_hi / signal_unit_id were
--    never filled, flatline_samples / flatline_min_span are filled but no code
--    reads them. v_measurement_context exposed the flatline pair, so it and
--    v_edge_points (built on it) are recreated unchanged otherwise.
-- 4. fault_library.active and .conditional repeated rev_status ('Retired' /
--    'Conditional'); the service derives them from rev_status now.
-- 5. Indexes for foreign keys on the busy tables (joins by rule or
--    measurement, and the cascades when a measurement or rule is deleted).

-- 1 ---------------------------------------------------------------------------
UPDATE maintenance_records SET work_order_id = NULL
 WHERE work_order_id IS NOT NULL AND work_order_id NOT IN (SELECT id FROM work_orders);
UPDATE maintenance_records SET inspector_user_id = NULL
 WHERE inspector_user_id IS NOT NULL AND inspector_user_id NOT IN (SELECT id FROM users);
DELETE FROM maintenance_records WHERE machine_id NOT IN (SELECT id FROM machines);
-- A database built from 000 already has these (same names); drop-and-add leaves one definition either way.
ALTER TABLE maintenance_records
  DROP CONSTRAINT IF EXISTS maintenance_records_machine_id_fkey,
  DROP CONSTRAINT IF EXISTS maintenance_records_inspector_user_id_fkey,
  DROP CONSTRAINT IF EXISTS maintenance_records_work_order_id_fkey,
  ADD CONSTRAINT maintenance_records_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  ADD CONSTRAINT maintenance_records_inspector_user_id_fkey FOREIGN KEY (inspector_user_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT maintenance_records_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;

DELETE FROM user_sessions s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);
ALTER TABLE user_sessions
  DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey,
  ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);

-- 2 ---------------------------------------------------------------------------
UPDATE work_orders w SET rule_id = NULL
 WHERE rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rules r WHERE r.machine_id = w.machine_id AND r.code = w.rule_id);
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_rule_fkey FOREIGN KEY (machine_id, rule_id) REFERENCES rules(machine_id, code)
    ON UPDATE CASCADE ON DELETE SET NULL (rule_id);

UPDATE cases c SET rule_code = NULL
 WHERE rule_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rules r WHERE r.machine_id = c.machine_id AND r.code = c.rule_code);
ALTER TABLE cases
  ADD CONSTRAINT cases_rule_fkey FOREIGN KEY (machine_id, rule_code) REFERENCES rules(machine_id, code)
    ON UPDATE CASCADE ON DELETE SET NULL (rule_code);

-- 3 ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_edge_points;
DROP VIEW IF EXISTS v_measurement_context;

ALTER TABLE measurements
  DROP COLUMN IF EXISTS signal_lo,
  DROP COLUMN IF EXISTS signal_hi,
  DROP COLUMN IF EXISTS signal_unit_id,
  DROP COLUMN IF EXISTS flatline_samples,
  DROP COLUMN IF EXISTS flatline_min_span;

CREATE VIEW v_measurement_context AS
SELECT m.id AS measurement_id,
       m.tag,
       m.name,
       m.value_kind,
       m.origin_id,
       m.quantity_id,
       m.unit_id,
       u.symbol AS unit,
       m.statistic_id,
       m.direction_id,
       m.decimals,
       m.range_lo,
       m.range_hi,
       m.publish_period_s,
       m.stale_after_s,
       m.noise_sigma,
       m.sort_order,
       p.id AS point_id,
       p.code AS point_code,
       p.location AS point_location,
       sa.id AS subassembly_id,
       sa.subassembly_id AS subassembly_code,
       sa.name AS subassembly_name,
       sy.id AS system_id,
       sy.system_id AS system_code,
       sy.name AS system_name,
       mc.id AS machine_id,
       mc.name AS machine_name,
       mc.plant_id
  FROM measurements m
  JOIN measurement_points p ON p.id = m.point_id
  JOIN machine_subassemblies sa ON sa.id = p.subassembly_id
  JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id
  JOIN machines mc ON mc.id = sy.machine_id
  LEFT JOIN units u ON u.id = m.unit_id;

-- Unchanged here; 046 rebuilds it without the copied columns.
CREATE VIEW v_edge_points AS
SELECT p.id, p.source_id, p.tag, p.name, p.slot, p.channel, p.address, p.unit, p.data_type, p.sample_rate,
       p.alert_limit, p.danger_limit, p.enabled, p.source_tag, p.measurement_id,
       c.machine_id, c.tag AS signal_tag
  FROM edge_points p
  LEFT JOIN v_measurement_context c ON c.measurement_id = p.measurement_id;

-- 4 ---------------------------------------------------------------------------
ALTER TABLE fault_library DROP COLUMN IF EXISTS active, DROP COLUMN IF EXISTS conditional;

-- 5 ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_findings_rule ON findings (rule_id);
CREATE INDEX IF NOT EXISTS idx_findings_measurement ON findings (measurement_id);
CREATE INDEX IF NOT EXISTS idx_machine_events_measurement ON machine_events (measurement_id);
CREATE INDEX IF NOT EXISTS idx_rule_inputs_measurement ON rule_inputs (measurement_id);
