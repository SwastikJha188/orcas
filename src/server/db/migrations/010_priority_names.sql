-- =============================================================================
-- 010 · Work-order priority names follow the product vocabulary
-- (Immediate · High · Medium · Low, as on every page that shows a priority).
-- =============================================================================

UPDATE work_order_priorities SET name = 'Immediate' WHERE id = 'P1';
UPDATE work_order_priorities SET name = 'High' WHERE id = 'P2';
UPDATE work_order_priorities SET name = 'Medium' WHERE id = 'P3';
UPDATE work_order_priorities SET name = 'Low' WHERE id = 'P4';
