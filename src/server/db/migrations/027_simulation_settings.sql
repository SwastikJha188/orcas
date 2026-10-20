-- =============================================================================
-- 027 · Simulation settings and commands (Simulation page)
--
-- The live demonstration's knobs live in the database so the always-on plant
-- (src/server/plant) and every open page run the same way:
--   simulation_settings  one row per simulated line: the event generator,
--                        held faults, calm pacing, noise (JSON, engine units:
--                        simulated minutes; 1 simulated minute = 1 real second);
--                        `version` goes up on every change.
--   simulation_commands  actions from the Simulation page ("start a fault now",
--                        "clear faults"), applied once by the plant runner and
--                        by open pages.
-- Machine demo profiles stay in machine_simulations.profile.
-- =============================================================================

CREATE TABLE IF NOT EXISTS simulation_settings (
  id VARCHAR(32) PRIMARY KEY,
  settings JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255)
);

INSERT INTO simulation_settings (id, settings) VALUES (
  'pyro-line',
  '{"events": true, "eventEvery": 720, "eventLead": 60, "eventLife": 600, "maxEvents": 1, "sensorShare": 0.4, "intensity": 1.25, "noise": 1, "healthDrift": 1, "holdMinutes": 1800, "changeGap": 600, "holdCreep": 0.05, "limitClear": 300, "machines": {}}'
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS simulation_commands (
  id BIGSERIAL PRIMARY KEY,
  target VARCHAR(32) NOT NULL REFERENCES simulation_settings(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('raise', 'inject', 'clear')),
  machine_id VARCHAR(64) REFERENCES machines(id) ON DELETE CASCADE,
  fault_kind VARCHAR(16) CHECK (fault_kind IN ('fault', 'sensor')),
  scenario_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  applied_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_simulation_commands_pending ON simulation_commands (target, id) WHERE applied_at IS NULL;
