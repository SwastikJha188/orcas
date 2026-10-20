-- =============================================================================
-- 001 · Monitoring core (3NF)
--
-- Implements the information model of "Ultron — Purpose and Information Flow"
-- and "Machine Monitoring Foundations":
--
--   plant → area → machine → component (sub-assembly) → measurement point
--         → measurement (quantity, unit, statistic, direction, band, range)
--         → readings (acquisition time, receipt time, value, quality)
--
--   engineering limits (with raise / clear persistence and approval)
--   operating states (recognised from context measurements) + state history
--   references: accepted ranges per measurement and operating state
--   rules (diagnostic patterns) with their inputs and parameters
--   events (start/stop, alarm, measurement-setting change, inspection …)
--   findings (what was flagged, against which evidence) → acknowledgement
--   investigations (observed ≠ confirmed ≠ corrected ≠ verified)
--   machine health index: a configured model with its parameters
--
-- Every attribute depends on its table's key only. Values that can be derived
-- (latest value, status, health, features) are computed from readings, never
-- stored next to the definitions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Formalise tables that used to be created by application code at runtime.
-- -----------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(96) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS plant_health_samples (
  machine_id VARCHAR(64) NOT NULL,
  t TIMESTAMPTZ NOT NULL,
  health REAL NOT NULL,
  PRIMARY KEY (machine_id, t)
);
CREATE INDEX IF NOT EXISTS idx_plant_health_samples_t ON plant_health_samples(t);
DELETE FROM plant_health_samples s WHERE NOT EXISTS (SELECT 1 FROM machines m WHERE m.id = s.machine_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_plant_health_samples_machine') THEN
    ALTER TABLE plant_health_samples ADD CONSTRAINT fk_plant_health_samples_machine
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plant_state (
  id VARCHAR(32) PRIMARY KEY,
  wall_ms BIGINT NOT NULL,
  body BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plant_runner_lease (
  id VARCHAR(32) PRIMARY KEY,
  holder VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128);
ALTER TABLE edge_sources ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128);
ALTER TABLE edge_points ADD COLUMN IF NOT EXISTS source_tag VARCHAR(255);

-- -----------------------------------------------------------------------------
-- Reference data (lookup tables replace free-text enumerations)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS severities (
  id VARCHAR(16) PRIMARY KEY,
  rank SMALLINT NOT NULL UNIQUE,
  description TEXT NOT NULL
);
INSERT INTO severities (id, rank, description) VALUES
  ('Normal', 0, 'Within the applicable reference and limits'),
  ('Advisory', 1, 'Differs from expectation or crosses a warning boundary; investigate'),
  ('Critical', 2, 'Crosses an alarm boundary; act')
ON CONFLICT (id) DO NOTHING;

-- Measurement validity (Foundations §4 "Missing and unreliable measurements").
-- GOOD describes the measurement, never the machine.
CREATE TABLE IF NOT EXISTS quality_codes (
  id VARCHAR(16) PRIMARY KEY,
  usable BOOLEAN NOT NULL,
  description TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
INSERT INTO quality_codes (id, usable, description, sort_order) VALUES
  ('GOOD', TRUE, 'Valid measurement', 0),
  ('UNCERTAIN', TRUE, 'Usable but flagged by the source (e.g. substituted or not calibrated)', 1),
  ('STALE', FALSE, 'Value is an older measurement; its age must be shown', 2),
  ('MISSING', FALSE, 'No measurement was obtained', 3),
  ('OVERRANGE', FALSE, 'Signal above the measuring range; the full value was not captured', 4),
  ('UNDERRANGE', FALSE, 'Signal below the measuring range', 5),
  ('CLIPPED', FALSE, 'Waveform clipped; true peaks were not captured', 6),
  ('BAD', FALSE, 'Source reported a fault (open circuit, sensor failure, comms error)', 7)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS quantities (
  id VARCHAR(48) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  description TEXT
);
INSERT INTO quantities (id, name, description) VALUES
  ('temperature', 'Temperature', 'How hot something is'),
  ('vibration_velocity', 'Vibration velocity', 'How fast the vibrating movement occurs'),
  ('vibration_acceleration', 'Vibration acceleration', 'How quickly the vibration velocity changes'),
  ('vibration_displacement', 'Vibration displacement', 'How far a part moves during vibration'),
  ('pressure', 'Pressure', 'Liquid or gas pressure'),
  ('flow', 'Flow', 'Quantity passing per unit of time'),
  ('current', 'Electrical current', 'Current drawn by a motor or load'),
  ('power', 'Electrical power', 'Power drawn by a load'),
  ('speed', 'Rotational speed', 'How fast a shaft rotates'),
  ('stroke_rate', 'Stroke rate', 'Strokes per minute of a reciprocating machine'),
  ('load', 'Load', 'Torque or load as a share of rated'),
  ('position', 'Position / displacement', 'Position of a part or travel against a reference'),
  ('level', 'Level', 'Fill level of a vessel or silo'),
  ('gas_concentration', 'Gas concentration', 'Composition of a gas stream'),
  ('sound', 'Sound level', 'Acoustic emission level'),
  ('mass', 'Mass', 'Weight of material'),
  ('feed_per_rev', 'Travel per revolution', 'Axial travel per revolution'),
  ('ratio', 'Ratio / share', 'Dimensionless share or ratio'),
  ('state', 'Discrete state', 'On/off, open/closed or other discrete states')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(32) PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS measurement_statistics (
  id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT NOT NULL
);
INSERT INTO measurement_statistics (id, name, description) VALUES
  ('instantaneous', 'Instantaneous', 'One sample at the measurement time'),
  ('mean', 'Mean', 'Arithmetic average over the recording window'),
  ('rms', 'RMS', 'Root mean square over the recording window and frequency band'),
  ('peak', 'Peak magnitude', 'Largest absolute sample in the recording'),
  ('peak_to_peak', 'Peak to peak', 'Highest minus lowest sample in the recording'),
  ('crest_factor', 'Crest factor', 'Peak magnitude divided by RMS'),
  ('state', 'State', 'Discrete state reported by the source'),
  ('calculated', 'Calculated', 'Derived from other measurements by a stated formula')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS measurement_directions (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT NOT NULL
);
INSERT INTO measurement_directions (id, name, description) VALUES
  ('none', 'Not directional', 'The quantity has no measurement axis'),
  ('horizontal', 'Horizontal', 'Side to side at the measurement point'),
  ('vertical', 'Vertical', 'Up and down at the measurement point'),
  ('axial', 'Axial', 'Along the shaft direction'),
  ('radial', 'Radial', 'Perpendicular to the shaft, direction not specified'),
  ('triaxial', 'Three axes', 'One channel per axis')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS signal_origins (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT NOT NULL
);
INSERT INTO signal_origins (id, name, description) VALUES
  ('online', 'Online sensor', 'Wired channel acquired by a rack, PLC or other source'),
  ('calculated', 'Calculated', 'Derived from other measurements on the gateway or server'),
  ('manual', 'Manual record', 'Dated laboratory or handheld record entered by a person')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS instrument_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS event_types (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  category VARCHAR(16) NOT NULL CHECK (category IN ('operation', 'alarm', 'measurement', 'maintenance', 'inspection', 'process')),
  description TEXT NOT NULL
);
INSERT INTO event_types (id, name, category, description) VALUES
  ('machine_start', 'Machine start', 'operation', 'The machine started'),
  ('machine_stop', 'Machine stop', 'operation', 'The machine stopped'),
  ('state_change', 'Operating state change', 'operation', 'The recognised operating state changed'),
  ('operating_change', 'Operating condition change', 'process', 'A set-point, duty or process setting changed'),
  ('alarm_raised', 'Alarm raised', 'alarm', 'A configured boundary or rule became active'),
  ('alarm_cleared', 'Alarm cleared', 'alarm', 'A configured boundary or rule returned to normal'),
  ('telemetry_advisory', 'Telemetry advisory', 'alarm', 'Monitoring flagged a change that needs review'),
  ('measurement_change', 'Measurement setting change', 'measurement', 'Sensor moved, replaced, re-ranged or re-configured; earlier readings may not be comparable'),
  ('maintenance', 'Maintenance', 'maintenance', 'Maintenance work performed'),
  ('inspection', 'Inspection', 'inspection', 'Inspection performed and its result')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS limit_kinds (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  relative BOOLEAN NOT NULL,
  description TEXT NOT NULL
);
INSERT INTO limit_kinds (id, name, relative, description) VALUES
  ('hi', 'High', FALSE, 'Warning / alarm when the value is at or above the boundary'),
  ('lo', 'Low', FALSE, 'Warning / alarm when the value is at or below the boundary'),
  ('abs', 'Magnitude', FALSE, 'Warning / alarm when the absolute value is at or above the boundary'),
  ('band', 'Band', FALSE, 'Warning / alarm outside a low–high band'),
  ('setpoint', 'Set-point deviation', TRUE, 'Percentage deviation from the operator set-point'),
  ('modelPct', 'Model deviation (%)', TRUE, 'Deviation from the expected value, in percent of it'),
  ('modelDev', 'Model deviation', TRUE, 'Deviation from the expected value, in engineering units'),
  ('bearing', 'Bearing temperature', TRUE, 'Rise over the expected value or split to the paired bearing; absolute alarm'),
  ('vib', 'Vibration severity', TRUE, 'Absolute warning or ratio to the expected value; absolute alarm (ISO 20816-3 zones)'),
  ('speedRef', 'Speed reference', TRUE, 'Speed below its reference, or zero speed with the drive on'),
  ('command', 'Command following', TRUE, 'Deviation of a position from its command; end stops absolute')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS rule_categories (
  id VARCHAR(48) PRIMARY KEY,
  scored BOOLEAN NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  description TEXT
);
INSERT INTO rule_categories (id, scored, sort_order, description) VALUES
  ('Drive train', TRUE, 1, NULL),
  ('Support & thrust', TRUE, 2, NULL),
  ('Shell & seals', TRUE, 3, NULL),
  ('Process', TRUE, 4, NULL),
  ('Rotating equipment', TRUE, 5, NULL),
  ('Lubrication', TRUE, 6, NULL),
  ('Combustion', TRUE, 7, NULL),
  ('Material handling', TRUE, 8, NULL),
  ('Service life', FALSE, 90, 'Calendar / hour service due; never observed deterioration'),
  ('Data quality', FALSE, 91, 'Describes the measurement, not the machine'),
  ('Anomaly', FALSE, 92, 'Unexplained pattern; evidence for review')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS finding_types (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
-- Foundations §6 "Result" table + process / rule results.
INSERT INTO finding_types (id, name, description, sort_order) VALUES
  ('limit_exceeded', 'Engineering limit exceeded', 'An applicable configured boundary has been crossed', 1),
  ('behaviour_deviation', 'Behaviour deviation detected', 'Valid observations differ from the accepted reference for the operating state', 2),
  ('sustained_change', 'Sustained change', 'Valid observations keep changing under comparable conditions', 3),
  ('process_requirement', 'Process requirement not met', 'A measured process value is outside its stated requirement', 4),
  ('rule_pattern', 'Diagnostic pattern', 'A configured multi-measurement rule is active', 5),
  ('new_operating_condition', 'New operating condition', 'No accepted reference covers the current operating state', 6),
  ('data_unavailable', 'Unreliable or unavailable data', 'The measurements do not support a dependable comparison', 7)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Measurement identity
-- -----------------------------------------------------------------------------

-- Where on a component a measurement is taken (Purpose step 3).
CREATE TABLE IF NOT EXISTS measurement_points (
  id SERIAL PRIMARY KEY,
  subassembly_id VARCHAR(64) NOT NULL REFERENCES machine_subassemblies(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  location TEXT,
  diagram_x NUMERIC(6, 2),
  diagram_y NUMERIC(6, 2),
  UNIQUE (subassembly_id, code)
);

CREATE TABLE IF NOT EXISTS measurements (
  id VARCHAR(128) PRIMARY KEY,
  point_id INTEGER NOT NULL REFERENCES measurement_points(id) ON DELETE CASCADE,
  tag VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity_id VARCHAR(48) NOT NULL REFERENCES quantities(id),
  unit_id VARCHAR(32) REFERENCES units(id),
  statistic_id VARCHAR(24) NOT NULL REFERENCES measurement_statistics(id),
  direction_id VARCHAR(16) NOT NULL DEFAULT 'none' REFERENCES measurement_directions(id),
  origin_id VARCHAR(16) NOT NULL DEFAULT 'online' REFERENCES signal_origins(id),
  value_kind VARCHAR(8) NOT NULL CHECK (value_kind IN ('analog', 'state')),
  instrument_type_id INTEGER REFERENCES instrument_types(id) ON DELETE SET NULL,
  decimals SMALLINT NOT NULL DEFAULT 2,
  -- Acquisition and publication (Foundations §5 "Measuring quickly and publishing slowly").
  acquisition_rate_hz DOUBLE PRECISION,
  window_s DOUBLE PRECISION,
  publish_period_s DOUBLE PRECISION,
  stale_after_s DOUBLE PRECISION,
  band_lo_hz DOUBLE PRECISION,
  band_hi_hz DOUBLE PRECISION,
  -- Measuring range: values outside it are flagged OVERRANGE / UNDERRANGE.
  range_lo DOUBLE PRECISION,
  range_hi DOUBLE PRECISION,
  -- Transmitter scaling, e.g. 4–20 mA ↔ range (Foundations §3).
  signal_lo DOUBLE PRECISION,
  signal_hi DOUBLE PRECISION,
  signal_unit_id VARCHAR(32) REFERENCES units(id),
  accuracy VARCHAR(128),
  -- Expected scatter around the reference (σ) and flat-line screening.
  noise_sigma DOUBLE PRECISION,
  flatline_samples SMALLINT,
  flatline_min_span DOUBLE PRECISION,
  spec_reference TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CHECK (range_lo IS NULL OR range_hi IS NULL OR range_lo < range_hi),
  CHECK (signal_lo IS NULL OR signal_hi IS NULL OR signal_lo < signal_hi)
);
CREATE INDEX IF NOT EXISTS idx_measurements_point ON measurements(point_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_measurements_tag ON measurements(tag);

-- Discrete states a state measurement can report, and what each one means.
CREATE TABLE IF NOT EXISTS measurement_states (
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  state VARCHAR(64) NOT NULL,
  severity_id VARCHAR(16) NOT NULL REFERENCES severities(id),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (measurement_id, state)
);

-- Calculated measurements: inputs of the formula.
CREATE TABLE IF NOT EXISTS measurement_formulas (
  measurement_id VARCHAR(128) PRIMARY KEY REFERENCES measurements(id) ON DELETE CASCADE,
  expression TEXT NOT NULL,
  description TEXT
);

-- -----------------------------------------------------------------------------
-- Engineering limits (Purpose step 8). One limit rule per measurement; its
-- parameters depend on the kind. raise/clear samples give the activation delay
-- and the clearance condition.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS measurement_limits (
  measurement_id VARCHAR(128) PRIMARY KEY REFERENCES measurements(id) ON DELETE CASCADE,
  kind_id VARCHAR(16) NOT NULL REFERENCES limit_kinds(id),
  direction VARCHAR(4) CHECK (direction IN ('hi', 'lo', 'both')),
  warn_value DOUBLE PRECISION,
  alarm_value DOUBLE PRECISION,
  warn_lo DOUBLE PRECISION,
  warn_hi DOUBLE PRECISION,
  alarm_lo DOUBLE PRECISION,
  alarm_hi DOUBLE PRECISION,
  warn_pct DOUBLE PRECISION,
  alarm_pct DOUBLE PRECISION,
  collapse_pct DOUBLE PRECISION,
  ratio DOUBLE PRECISION,
  rise DOUBLE PRECISION,
  split DOUBLE PRECISION,
  pair_measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE SET NULL,
  drive_measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE SET NULL,
  drive_on DOUBLE PRECISION,
  reference_value DOUBLE PRECISION,
  abs_warn_lo DOUBLE PRECISION,
  abs_warn_hi DOUBLE PRECISION,
  abs_alarm_lo DOUBLE PRECISION,
  abs_alarm_hi DOUBLE PRECISION,
  rate_per_hour DOUBLE PRECISION,
  rate_of VARCHAR(8) CHECK (rate_of IN ('value', 'residual')),
  rate_window SMALLINT,
  raise_samples SMALLINT NOT NULL DEFAULT 3 CHECK (raise_samples >= 1),
  clear_samples SMALLINT NOT NULL DEFAULT 6 CHECK (clear_samples >= 1),
  basis_normal TEXT,
  basis_warning TEXT,
  basis_alarm TEXT,
  source TEXT,
  note TEXT,
  approval VARCHAR(16) NOT NULL DEFAULT 'provisional' CHECK (approval IN ('provisional', 'approved')),
  approved_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Operating context (Purpose step 9 / Foundations §6).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS operating_states (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  running BOOLEAN NOT NULL,
  -- Lower value wins when several states' criteria match.
  priority SMALLINT NOT NULL DEFAULT 0,
  description TEXT,
  UNIQUE (machine_id, code)
);

-- How a state is recognised: every criterion of the state must hold.
CREATE TABLE IF NOT EXISTS operating_state_criteria (
  state_id INTEGER NOT NULL REFERENCES operating_states(id) ON DELETE CASCADE,
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  PRIMARY KEY (state_id, measurement_id),
  CHECK (min_value IS NOT NULL OR max_value IS NOT NULL)
);

-- Recognised state over time (one open period per machine).
CREATE TABLE IF NOT EXISTS machine_state_periods (
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  state_id INTEGER NOT NULL REFERENCES operating_states(id) ON DELETE CASCADE,
  PRIMARY KEY (machine_id, started_at),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_state_open ON machine_state_periods(machine_id) WHERE ended_at IS NULL;

-- -----------------------------------------------------------------------------
-- References: accepted behaviour under identified conditions. A set needs
-- review before it is treated as healthy (status 'accepted').
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reference_sets (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  state_id INTEGER REFERENCES operating_states(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'retired')),
  basis TEXT NOT NULL,
  window_from TIMESTAMPTZ,
  window_to TIMESTAMPTZ,
  created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE (machine_id, name)
);
-- At most one accepted set per machine and state.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reference_sets_accepted
  ON reference_sets(machine_id, COALESCE(state_id, 0)) WHERE status = 'accepted';

CREATE TABLE IF NOT EXISTS reference_values (
  reference_set_id INTEGER NOT NULL REFERENCES reference_sets(id) ON DELETE CASCADE,
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  expected DOUBLE PRECISION,
  lo DOUBLE PRECISION,
  hi DOUBLE PRECISION,
  sample_count INTEGER,
  PRIMARY KEY (reference_set_id, measurement_id),
  CHECK (lo IS NULL OR hi IS NULL OR lo <= hi)
);

-- Process requirements (Purpose step 11): the job the machine must do.
CREATE TABLE IF NOT EXISTS process_requirements (
  id SERIAL PRIMARY KEY,
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  state_id INTEGER REFERENCES operating_states(id) ON DELETE CASCADE,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  description TEXT NOT NULL,
  source TEXT,
  CHECK (min_value IS NOT NULL OR max_value IS NOT NULL)
);

-- -----------------------------------------------------------------------------
-- Readings (Purpose steps 1–5): the measurement time is separate from the time
-- the server received it, and its quality is recorded. Missing data is never
-- written as zero.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS readings (
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 'device' = acquisition timestamp from the source; 'gateway' = gateway read time;
  -- 'server' = receipt time only (acquisition time unknown).
  time_source VARCHAR(8) NOT NULL DEFAULT 'device' CHECK (time_source IN ('device', 'gateway', 'server')),
  value DOUBLE PRECISION,
  state VARCHAR(64),
  quality_id VARCHAR(16) NOT NULL REFERENCES quality_codes(id),
  PRIMARY KEY (measurement_id, acquired_at),
  CHECK (value IS NULL OR state IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_readings_acquired ON readings(acquired_at);

-- Hourly summaries kept after raw readings age out.
CREATE TABLE IF NOT EXISTS reading_hourly (
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  hour_start TIMESTAMPTZ NOT NULL,
  sample_count INTEGER NOT NULL,
  good_count INTEGER NOT NULL,
  v_min DOUBLE PRECISION,
  v_max DOUBLE PRECISION,
  v_sum DOUBLE PRECISION,
  v_sum_sq DOUBLE PRECISION,
  v_first DOUBLE PRECISION,
  v_last DOUBLE PRECISION,
  PRIMARY KEY (measurement_id, hour_start)
);

-- -----------------------------------------------------------------------------
-- Events (Purpose step 5).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS machine_events (
  id BIGSERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  event_type_id VARCHAR(32) NOT NULL REFERENCES event_types(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity_id VARCHAR(16) NOT NULL DEFAULT 'Normal' REFERENCES severities(id),
  measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source VARCHAR(255) NOT NULL,
  actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_machine_events_machine ON machine_events(machine_id, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- Rules (diagnostic patterns) with their inputs and tunable parameters.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rules (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(48) NOT NULL REFERENCES rule_categories(id),
  system_ref_id VARCHAR(64) REFERENCES machine_systems(id) ON DELETE SET NULL,
  logic TEXT NOT NULL,
  cause TEXT NOT NULL,
  consequence TEXT NOT NULL,
  action TEXT NOT NULL,
  owner VARCHAR(128),
  unproven TEXT,
  hold TEXT,
  -- Samples the pattern must hold before it is raised / stay clean before it clears.
  raise_samples SMALLINT NOT NULL DEFAULT 3 CHECK (raise_samples >= 1),
  clear_samples SMALLINT NOT NULL DEFAULT 4 CHECK (clear_samples >= 1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (machine_id, code)
);

CREATE TABLE IF NOT EXISTS rule_inputs (
  rule_id INTEGER NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (rule_id, measurement_id)
);

CREATE TABLE IF NOT EXISTS rule_subassemblies (
  rule_id INTEGER NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  subassembly_id VARCHAR(64) NOT NULL REFERENCES machine_subassemblies(id) ON DELETE CASCADE,
  PRIMARY KEY (rule_id, subassembly_id)
);

CREATE TABLE IF NOT EXISTS rule_parameters (
  rule_id INTEGER NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  key VARCHAR(64) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit_id VARCHAR(32) REFERENCES units(id),
  description TEXT,
  PRIMARY KEY (rule_id, key)
);

-- -----------------------------------------------------------------------------
-- Findings (Purpose step 12) and the investigation record (step 13).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS findings (
  id BIGSERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  finding_type_id VARCHAR(32) NOT NULL REFERENCES finding_types(id),
  measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE CASCADE,
  rule_id INTEGER REFERENCES rules(id) ON DELETE CASCADE,
  severity_id VARCHAR(16) NOT NULL REFERENCES severities(id),
  -- Evidence at the time the finding was last evaluated.
  state_id INTEGER REFERENCES operating_states(id) ON DELETE SET NULL,
  reference_set_id INTEGER REFERENCES reference_sets(id) ON DELETE SET NULL,
  observed_value DOUBLE PRECISION,
  expected_value DOUBLE PRECISION,
  expected_lo DOUBLE PRECISION,
  expected_hi DOUBLE PRECISION,
  limit_value DOUBLE PRECISION,
  change_value DOUBLE PRECISION,
  change_window_s DOUBLE PRECISION,
  data_assessment VARCHAR(16) NOT NULL DEFAULT 'valid' CHECK (data_assessment IN ('valid', 'stale', 'missing', 'unreliable')),
  cause_status VARCHAR(16) NOT NULL DEFAULT 'not_established' CHECK (cause_status IN ('not_established', 'suspected', 'confirmed')),
  summary TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  last_evaluated_at TIMESTAMPTZ NOT NULL,
  cleared_at TIMESTAMPTZ,
  CHECK (measurement_id IS NOT NULL OR rule_id IS NOT NULL OR finding_type_id = 'data_unavailable'),
  CHECK (cleared_at IS NULL OR cleared_at >= opened_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_findings_open
  ON findings(machine_id, finding_type_id, COALESCE(measurement_id, ''), COALESCE(rule_id, 0)) WHERE cleared_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_findings_machine ON findings(machine_id, opened_at DESC);

-- Acknowledgement means someone has seen it; it does not resolve anything.
CREATE TABLE IF NOT EXISTS finding_acknowledgements (
  finding_id BIGINT PRIMARY KEY REFERENCES findings(id) ON DELETE CASCADE,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE TABLE IF NOT EXISTS investigation_entries (
  id BIGSERIAL PRIMARY KEY,
  finding_id BIGINT NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('observation', 'inspection', 'confirmed_cause', 'corrective_action', 'verification', 'note')),
  body TEXT NOT NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  recorded_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investigation_entries_finding ON investigation_entries(finding_id, recorded_at);

-- -----------------------------------------------------------------------------
-- Machine Health Index: a configured summary score (Purpose §4). Its meaning
-- comes from these parameters; it is never a probability or remaining life.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS health_models (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_model_parameters (
  model_id VARCHAR(32) NOT NULL REFERENCES health_models(id) ON DELETE CASCADE,
  key VARCHAR(48) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  PRIMARY KEY (model_id, key)
);

ALTER TABLE machines ADD COLUMN IF NOT EXISTS health_model_id VARCHAR(32) REFERENCES health_models(id) ON DELETE SET NULL;
