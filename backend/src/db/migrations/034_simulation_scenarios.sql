-- =============================================================================
-- 034 · Simulation page scenarios
--
-- The Simulation page can now start any library fault with its own strength,
-- duration and worsening, and a hand-made fault on one reading (drift, jump
-- to the Alert or Critical level, step, swing, frozen reading). Both go
-- through simulation_commands so the always-on plant and every open page run
-- them:
--   kind 'signal'  one-reading fault; spec = { tag, shape, delta | level,
--                  rampMin, sensor, life, grow }
--   spec           options of an 'inject' ({ scale, life, grow }) or the
--                  'signal' fault itself (engine units: simulated minutes).
-- =============================================================================

ALTER TABLE simulation_commands ADD COLUMN IF NOT EXISTS spec JSONB;

ALTER TABLE simulation_commands DROP CONSTRAINT IF EXISTS simulation_commands_kind_check;
ALTER TABLE simulation_commands ADD CONSTRAINT simulation_commands_kind_check CHECK (kind IN ('raise', 'inject', 'signal', 'clear'));
