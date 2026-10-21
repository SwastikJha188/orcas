-- =============================================================================
-- 019 · One health history
--
-- plant_health_samples held the simulation engines' own health figure. Machine
-- health is now the server evaluation's Machine Health Index, kept in
-- machine_health_scores / subassembly_health_scores; the engine copy goes.
-- =============================================================================

DROP TABLE IF EXISTS plant_health_samples;
