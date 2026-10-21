-- =============================================================================
-- 047 · Asset tables without stored copies
--
-- Each fact is kept once; what follows from it is worked out when it is read.
--
-- plants.status        held 'Alert', a condition the server already works out from
--                      machine health scores; four plants showed a stale 'Alert'.
--                      It is now service_state (Operational / Standby / Maintenance),
--                      the person-set state, exactly like machines.service_state.
-- hierarchy_nodes.name copied plants.name (plant nodes) and machines.name (machine
--                      nodes) and had drifted. Plant and machine nodes now keep no
--                      name; v_hierarchy_nodes reads it from the plant or machine.
--                      A machine has one node, in its own plant.
-- user_plant_access.is_primary
--                      repeated users.default_plant_id; the primary plant is the
--                      access row whose plant is the user's default plant.
-- machine_subassemblies.criticality
--                      'A' under scored systems and 'Context' under unscored ones:
--                      it follows machine_systems.scored and is worked out from it.
-- measurement_ranges.doc_tag / status
--                      copies of measurements.tag and measurements.priority.
-- machine_systems.part_code
--                      the part's number within its machine (P1, P2 …), used as the
--                      part id by the API; PYR-FED-01 had P3 twice. A repeated code
--                      takes the machine's next free number, then codes are unique.
-- =============================================================================

-- plants: condition is calculated, only the service state is stored.
UPDATE plants SET status = 'Operational' WHERE status = 'Alert';
ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_status_check;
ALTER TABLE plants RENAME COLUMN status TO service_state;
ALTER TABLE plants ALTER COLUMN service_state TYPE VARCHAR(16);
ALTER TABLE plants ADD CONSTRAINT plants_service_state_check CHECK (service_state IN ('Operational', 'Standby', 'Maintenance'));

-- hierarchy_nodes: plant and machine nodes take their name from the plant / machine.
ALTER TABLE hierarchy_nodes ALTER COLUMN name DROP NOT NULL;
UPDATE hierarchy_nodes SET name = NULL WHERE type IN ('plant', 'machine');
ALTER TABLE hierarchy_nodes ADD CONSTRAINT hierarchy_nodes_name_check CHECK ((name IS NULL) = (type IN ('plant', 'machine')));
ALTER TABLE hierarchy_nodes ADD CONSTRAINT hierarchy_nodes_machine_check CHECK ((type = 'machine') = (machine_id IS NOT NULL));
DROP INDEX IF EXISTS idx_hierarchy_machine;
CREATE UNIQUE INDEX idx_hierarchy_machine ON hierarchy_nodes (machine_id);
-- A machine node sits in the machine's own plant.
ALTER TABLE machines ADD CONSTRAINT machines_id_plant_key UNIQUE (id, plant_id);
ALTER TABLE hierarchy_nodes DROP CONSTRAINT IF EXISTS fk_hierarchy_machine;
ALTER TABLE hierarchy_nodes ADD CONSTRAINT fk_hierarchy_machine
  FOREIGN KEY (machine_id, plant_id) REFERENCES machines (id, plant_id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE VIEW v_hierarchy_nodes AS
SELECT hn.id,
       hn.plant_id,
       hn.parent_id,
       COALESCE(hn.name, m.name, p.name) AS name,
       hn.type,
       hn.machine_id,
       hn.sort_order,
       hn.diagram_type
  FROM hierarchy_nodes hn
  JOIN plants p ON p.id = hn.plant_id
  LEFT JOIN machines m ON m.id = hn.machine_id;

-- user_plant_access: the primary plant is users.default_plant_id.
ALTER TABLE user_plant_access DROP COLUMN IF EXISTS is_primary;

-- machine_subassemblies: criticality follows machine_systems.scored.
ALTER TABLE machine_subassemblies DROP COLUMN IF EXISTS criticality;

-- measurement_ranges: tag and priority live on measurements.
ALTER TABLE measurement_ranges DROP COLUMN IF EXISTS doc_tag, DROP COLUMN IF EXISTS status;

-- machine_systems: one part code per machine (PYR-FED-01 DCL-FSL-01 P3 → P5).
WITH ranked AS (
  SELECT id, machine_id, ROW_NUMBER() OVER (PARTITION BY machine_id, part_code ORDER BY sort_order, id) AS rn
    FROM machine_systems
), repeated AS (
  SELECT id, machine_id, ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY id) AS k FROM ranked WHERE rn > 1
), top_code AS (
  SELECT machine_id, COALESCE(MAX(substring(part_code FROM '^P([0-9]+)$')::int), 0) AS n FROM machine_systems GROUP BY machine_id
)
UPDATE machine_systems s
   SET part_code = 'P' || (t.n + r.k)
  FROM repeated r
  JOIN top_code t ON t.machine_id = r.machine_id
 WHERE s.id = r.id;
CREATE UNIQUE INDEX idx_systems_part_code ON machine_systems (machine_id, part_code);
