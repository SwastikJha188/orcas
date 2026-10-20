-- =============================================================================
-- 021 · People are referenced, not copied
--
-- work_orders.assignee, alert_acks.acknowledged_by and alarm_events.acked_by
-- held a copy of the user's name next to the user id. The name now comes
-- through the user row; the text columns keep only actors that are not users
-- (a crew, the autopilot).
-- =============================================================================

UPDATE work_orders SET assignee = NULL WHERE assignee_user_id IS NOT NULL;
UPDATE alert_acks SET acknowledged_by = NULL WHERE acknowledged_by_user_id IS NOT NULL;
UPDATE alarm_events SET acked_by = NULL WHERE acked_by_user_id IS NOT NULL;
