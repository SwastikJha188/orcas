-- =============================================================================
-- 011 · Remove the demonstration event log carried over by 009
--
-- operating_events held seeded demonstration entries whose times were text
-- ("Yesterday, 19:10 UTC", "3 days ago"); they could not be dated and were not
-- records of anything that happened. Events entered by a person (actor set) or
-- written by the evaluation are kept.
-- =============================================================================

DELETE FROM machine_events e
 WHERE e.actor_user_id IS NULL
   AND e.source <> 'ULTRON evaluation'
   AND e.event_type_id IN ('telemetry_advisory', 'maintenance', 'inspection', 'operating_change')
   AND e.occurred_at < (SELECT applied_at FROM ultron_migrations WHERE version = '009');
