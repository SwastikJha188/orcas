-- =============================================================================
-- 052 · Limit engine for machines without a dedicated model
--
-- Every machine with sensors gets readings. Machines that have no dedicated
-- engine (kiln, pyro, vpc) are simulated by the "limits" engine
-- (backend/src/plant/limit-sim.ts): each measurement reads around its
-- approved normal range, and one sensor at a time drifts toward its limits
-- and is then repaired. The demo profile sets how far a drift goes
-- (healthy: stays in range, advisory: reaches Alert, critical: reaches Trip).
--
-- Also: five low-side limits ("< 15 L/min (Low Warning)") were stored as high
-- limits with the alarm below the warning, so any normal reading counted as
-- past the alarm. They are low limits.
-- =============================================================================

UPDATE measurement_limits
   SET kind_id = 'lo'
 WHERE kind_id = 'hi' AND warn_value IS NOT NULL AND alarm_value IS NOT NULL AND alarm_value < warn_value;

INSERT INTO simulation_engines (id, name, description)
VALUES ('limits', 'Limit engine', 'Each sensor reads around its approved normal range; one at a time drifts toward its limits and is repaired')
ON CONFLICT (id) DO NOTHING;

INSERT INTO machine_simulations (machine_id, engine_id, seed, profile, enabled)
SELECT m.id, 'limits', 20261100 + ROW_NUMBER() OVER (ORDER BY m.plant_id, m.id),
       CASE WHEN ROW_NUMBER() OVER (ORDER BY m.plant_id, m.id) % 2 = 0 THEN 'critical' ELSE 'advisory' END, TRUE
  FROM machines m
 WHERE NOT EXISTS (SELECT 1 FROM machine_simulations s WHERE s.machine_id = m.id)
   AND EXISTS (SELECT 1 FROM v_measurement_context c WHERE c.machine_id = m.id AND c.value_kind = 'analog')
ON CONFLICT (machine_id) DO NOTHING;
