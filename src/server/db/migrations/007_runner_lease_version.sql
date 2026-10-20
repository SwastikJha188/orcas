-- =============================================================================
-- 007 · Plant runner lease version
--
-- A server running a newer plant runner takes the lease over from one running
-- an older version, so a deploy (or a restarted dev server) never leaves the
-- plant on stale code until the old process exits.
-- =============================================================================

ALTER TABLE plant_runner_lease ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
