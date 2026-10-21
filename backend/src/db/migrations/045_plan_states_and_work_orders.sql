-- =============================================================================
-- 045 · Plan states keyed by machine; work orders read priority and people by reference
--
-- maintenance_plan_states was keyed by a plan code string ("PLN-VPC-066-D")
-- built from the unit code and the round, with the machine only for the GEN
-- section. VPC-066, -067 and -068 share the VPC-066 sections, so their plans
-- had one row between them, owned by whichever machine read it first (VPC-068):
-- 066 and 067 always showed the default state, and changing a plan on 066
-- changed it on 068. A plan is one machine × one checklist unit × one round,
-- so that is now the key, with foreign keys to machine_maintenance_units and
-- maintenance_routes; the plan code is derived again when the API answers.
-- The audit trail (maintenance_events) names its plan the same way.
--
-- Backfill: every old row is copied to each machine that carries its unit, so
-- the machines sharing the VPC-066 sections each keep the state 068 had
-- (140 rows → 154: seven shared plans copied to 066 and 067). Rows of plans no
-- machine carries any more are dropped.
--
-- work_orders.due_label was a client-written copy of the priority's
-- description that went stale when the priority changed: the description now
-- comes through work_order_priorities. work_orders.assignee was again filled
-- with a copy of the assigned user's name (see 021): the name comes through
-- users, the text is only for a crew that is not a user, never both.
-- =============================================================================

-- ------------------------------------------------------------ plan states

ALTER TABLE maintenance_plan_states DROP CONSTRAINT IF EXISTS maintenance_plan_states_pkey;
ALTER TABLE maintenance_plan_states
  ADD COLUMN IF NOT EXISTS unit_id INTEGER,
  ADD COLUMN IF NOT EXISTS route_id VARCHAR(16);

CREATE TEMP TABLE plan_codes ON COMMIT DROP AS
  SELECT mmu.machine_id, u.id AS unit_id, r.id AS route_id,
         'PLN-' || CASE WHEN u.code = 'GEN' THEN m.code || '-GEN' ELSE u.code END
                || CASE WHEN d.kind = 'sensor' THEN '-IN' ELSE '' END
                || '-' || r.plan_code AS plan_id
    FROM machine_maintenance_units mmu
    JOIN machines m ON m.id = mmu.machine_id
    JOIN maintenance_units u ON u.id = mmu.unit_id
    JOIN maintenance_documents d ON d.id = u.document_id
   CROSS JOIN maintenance_routes r;

INSERT INTO maintenance_plan_states (plan_id, machine_id, unit_id, route_id, state, activated_at, approved_by_user_id, approved_at, updated_at)
SELECT ps.plan_id, c.machine_id, c.unit_id, c.route_id, ps.state, ps.activated_at, ps.approved_by_user_id, ps.approved_at, ps.updated_at
  FROM maintenance_plan_states ps
  JOIN plan_codes c ON c.plan_id = ps.plan_id
 WHERE ps.unit_id IS NULL;

DELETE FROM maintenance_plan_states WHERE unit_id IS NULL;

ALTER TABLE maintenance_plan_states
  DROP COLUMN plan_id,
  ALTER COLUMN unit_id SET NOT NULL,
  ALTER COLUMN route_id SET NOT NULL,
  ADD CONSTRAINT maintenance_plan_states_pkey PRIMARY KEY (machine_id, unit_id, route_id),
  ADD CONSTRAINT maintenance_plan_states_unit_fkey FOREIGN KEY (machine_id, unit_id)
    REFERENCES machine_maintenance_units(machine_id, unit_id) ON DELETE CASCADE,
  ADD CONSTRAINT maintenance_plan_states_route_fkey FOREIGN KEY (route_id) REFERENCES maintenance_routes(id);

-- The primary key leads with machine_id.
DROP INDEX IF EXISTS idx_maintenance_plan_states_machine;

-- ------------------------------------------------------------ audit trail

ALTER TABLE maintenance_events
  ADD COLUMN IF NOT EXISTS unit_id INTEGER,
  ADD COLUMN IF NOT EXISTS route_id VARCHAR(16);

UPDATE maintenance_events e
   SET unit_id = c.unit_id, route_id = c.route_id
  FROM plan_codes c
 WHERE e.plan_id IS NOT NULL AND c.machine_id = e.machine_id AND c.plan_id = e.plan_id
   AND EXISTS (SELECT 1 FROM maintenance_plan_states ps
                WHERE ps.machine_id = c.machine_id AND ps.unit_id = c.unit_id AND ps.route_id = c.route_id);

ALTER TABLE maintenance_events
  DROP COLUMN plan_id,
  ADD CONSTRAINT maintenance_events_plan_check CHECK ((unit_id IS NULL) = (route_id IS NULL)),
  ADD CONSTRAINT maintenance_events_plan_fkey FOREIGN KEY (machine_id, unit_id, route_id)
    REFERENCES maintenance_plan_states(machine_id, unit_id, route_id) ON DELETE CASCADE;

-- ------------------------------------------------------------ work orders

ALTER TABLE work_orders DROP COLUMN IF EXISTS due_label;

UPDATE work_orders SET assignee = NULL WHERE assignee_user_id IS NOT NULL;
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_assignee_check CHECK (assignee IS NULL OR assignee_user_id IS NULL);
