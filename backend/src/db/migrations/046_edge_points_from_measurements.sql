-- =============================================================================
-- 046 · Edge points hold the hardware only
--
-- A point is one channel of a source (card + channel, address, data type,
-- read rate) linked to the measurement it feeds (measurement_id). Its tag,
-- name, unit and alert / danger limits were stored copies of the measurement's
-- tag, name, units.symbol and measurement_limits, and had drifted: some units
-- were not in `units`, and points carried alert limits the evaluator never
-- used. They are removed; v_edge_points reads tag, name and unit from the
-- measurement (v_measurement_context), and limits stay in measurement_limits
-- only, where the evaluator reads them.
--
-- * edge_points.tag goes too: live data is matched on gateway / rack / card /
--   channel, never on the tag, so it was only a copy of measurements.tag. The
--   device's own name for the channel (DCS / PLC / historian tag) is
--   edge_points.source_tag.
-- * Placeholder text in source_tag / address ("pending plant tag list",
--   "pending D3 walkdown …") is not a value: unknown is NULL.
-- =============================================================================

DROP VIEW IF EXISTS v_edge_points;

-- A point that feeds no measurement keeps its tag as its device tag.
UPDATE edge_points SET source_tag = tag WHERE measurement_id IS NULL AND source_tag IS NULL;

UPDATE edge_points SET source_tag = NULL WHERE source_tag ILIKE 'pending%';
UPDATE edge_points SET address = NULL WHERE address ILIKE 'pending%';

ALTER TABLE edge_points DROP COLUMN IF EXISTS tag;
ALTER TABLE edge_points DROP COLUMN IF EXISTS name;
ALTER TABLE edge_points DROP COLUMN IF EXISTS unit;
ALTER TABLE edge_points DROP COLUMN IF EXISTS alert_limit;
ALTER TABLE edge_points DROP COLUMN IF EXISTS danger_limit;

CREATE VIEW v_edge_points AS
SELECT p.id, p.source_id, p.slot, p.channel, p.address, p.data_type, p.sample_rate, p.enabled, p.source_tag, p.measurement_id,
       c.machine_id, c.tag, c.name, c.unit
  FROM edge_points p
  LEFT JOIN v_measurement_context c ON c.measurement_id = p.measurement_id;
