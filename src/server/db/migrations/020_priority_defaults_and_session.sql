-- =============================================================================
-- 020 · Defaults that were literals in the services
--
-- * Which priority a work order gets when none is given (P3) and which one an
--   inspection defect opens with (P2).
-- * How long a sign-in session lasts.
-- =============================================================================

ALTER TABLE work_order_priorities ADD COLUMN IF NOT EXISTS default_new BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE work_order_priorities ADD COLUMN IF NOT EXISTS default_defect BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE work_order_priorities SET default_new = (id = 'P3'), default_defect = (id = 'P2');
CREATE UNIQUE INDEX IF NOT EXISTS idx_wo_priority_default_new ON work_order_priorities(default_new) WHERE default_new;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wo_priority_default_defect ON work_order_priorities(default_defect) WHERE default_defect;

INSERT INTO system_settings (key, value, unit_id, description) VALUES
  ('auth.session_days', 7, 'd', 'How long a sign-in session lasts')
ON CONFLICT (key) DO NOTHING;
