-- =============================================================================
-- 015 · Work-order response times as the product defined them
--
-- 002 seeded response times that differed from the ones the application had
-- always used (kiln operations loop and Diagnosis): P1 within 4 h, P2 within
-- 24 h, P3 within 7 days, P4 at the next planned outage (no fixed time).
-- =============================================================================

ALTER TABLE work_order_priorities DROP CONSTRAINT IF EXISTS work_order_priorities_response_minutes_check;
ALTER TABLE work_order_priorities ALTER COLUMN response_minutes DROP NOT NULL;
ALTER TABLE work_order_priorities ADD CONSTRAINT work_order_priorities_response_minutes_check CHECK (response_minutes IS NULL OR response_minutes > 0);

UPDATE work_order_priorities SET response_minutes = 240, description = 'Within 4 h' WHERE id = 'P1';
UPDATE work_order_priorities SET response_minutes = 1440, description = 'Within 24 h' WHERE id = 'P2';
UPDATE work_order_priorities SET response_minutes = 10080, description = 'Within 7 days' WHERE id = 'P3';
UPDATE work_order_priorities SET response_minutes = NULL, description = 'Next planned outage' WHERE id = 'P4';
