-- =============================================================================
-- 031 · Plain live wording
--
-- Text shown outside the Simulation tab reads as plant data: drop the
-- "simulated" wording from the pyro gateway note and the publish-period setting.
-- =============================================================================

UPDATE edge_gateways
   SET notes = REPLACE(notes, ' — values simulated until the plant tag export is mapped.', '.')
 WHERE id = 'gw-pyro-line';

UPDATE system_settings
   SET description = 'How often a gateway publishes each measurement to the database'
 WHERE key = 'readings.publish_period_s';
