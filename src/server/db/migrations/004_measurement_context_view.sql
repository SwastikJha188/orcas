-- =============================================================================
-- 004 · Measurement context view
--
-- The full identity of a measurement (Purpose step 3: plant → machine →
-- component → point → measurement) resolved through the foreign keys only,
-- so no table has to repeat its parents' keys. Application code reads the
-- hierarchy through this view.
-- =============================================================================

CREATE OR REPLACE VIEW v_measurement_context AS
SELECT
  m.id AS measurement_id,
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
  m.flatline_samples,
  m.flatline_min_span,
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

-- One tag per machine (the tag is the measurement's name in the plant's
-- documents); enforced across the hierarchy, since measurements do not carry
-- the machine key themselves.
CREATE OR REPLACE FUNCTION enforce_measurement_tag_unique() RETURNS trigger AS $$
DECLARE
  dup TEXT;
BEGIN
  SELECT c.measurement_id INTO dup
    FROM v_measurement_context c
   WHERE c.tag = NEW.tag AND c.measurement_id <> NEW.id
     AND c.machine_id = (
       SELECT sy.machine_id FROM measurement_points p
         JOIN machine_subassemblies sa ON sa.id = p.subassembly_id
         JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id
        WHERE p.id = NEW.point_id)
   LIMIT 1;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'tag % already used by measurement % on this machine', NEW.tag, dup;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_measurement_tag_unique ON measurements;
CREATE TRIGGER trg_measurement_tag_unique BEFORE INSERT OR UPDATE OF tag, point_id ON measurements
  FOR EACH ROW EXECUTE FUNCTION enforce_measurement_tag_unique();
