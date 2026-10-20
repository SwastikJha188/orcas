-- =============================================================================
-- 012 · Remove the remaining seeded demonstration events
--
-- 011 kept the demonstration entries the seed had stamped with a user. Every
-- seeded entry was inserted in a batch sharing one creation instant; an event
-- entered by a person has its own. Seed batches from before 009 are removed.
-- =============================================================================

DELETE FROM machine_events e
 WHERE e.source <> 'ULTRON evaluation'
   AND e.occurred_at < (SELECT applied_at FROM ultron_migrations WHERE version = '009')
   AND e.occurred_at IN (
     SELECT occurred_at FROM machine_events
      WHERE source <> 'ULTRON evaluation'
      GROUP BY occurred_at HAVING COUNT(*) > 1
   );
