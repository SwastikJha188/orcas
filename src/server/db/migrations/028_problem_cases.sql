-- =============================================================================
-- 028 · Problem cases: investigation from first sign to verified repair
--
-- A case follows one problem on one machine (and optionally one part) through
-- New → Being investigated → Waiting for checks → With maintenance → Checking
-- the fix → Closed. It is created by a person: from scratch, from a problem
-- the system found (a rule), or from an investigation guide.
--
--   investigation_guides / _items  starting points per machine: what you see,
--                                  readings to look at, checks, possible causes
--   cases                          the case itself (owner, priority, stage,
--                                  running mode, what we know, next action)
--   case_measurements              readings the case follows
--   case_causes                    possible causes being tested
--   case_checks                    requested checks (in-app tasks) and results
--   case_requests                  maintenance requests (each makes a work order)
--   case_files                     attached files
--   case_series / _points          readings imported from a CSV file
--   case_events                    history: who did what, when
--   manual_alarms                  alarms recorded by hand (seen in the field)
-- =============================================================================

CREATE TABLE IF NOT EXISTS investigation_guides (
  id VARCHAR(48) PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  subassembly_ref_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  symptom TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS investigation_guide_items (
  guide_id VARCHAR(48) NOT NULL REFERENCES investigation_guides(id) ON DELETE CASCADE,
  kind VARCHAR(8) NOT NULL CHECK (kind IN ('reading', 'check', 'cause')),
  sort_order SMALLINT NOT NULL,
  text TEXT NOT NULL,
  measurement_id VARCHAR(128) REFERENCES measurements(id) ON DELETE SET NULL,
  PRIMARY KEY (guide_id, kind, sort_order)
);

CREATE TABLE IF NOT EXISTS cases (
  id BIGSERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  subassembly_ref_id VARCHAR(64) REFERENCES machine_subassemblies(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  observation TEXT NOT NULL,
  origin VARCHAR(12) NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'problem', 'guide')),
  rule_code VARCHAR(64),
  guide_id VARCHAR(48) REFERENCES investigation_guides(id) ON DELETE SET NULL,
  stage VARCHAR(16) NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'investigating', 'waiting', 'maintenance', 'verifying', 'closed')),
  priority VARCHAR(12) NOT NULL DEFAULT 'unassigned' CHECK (priority IN ('unassigned', 'urgent', 'priority', 'routine')),
  owner_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  running_mode VARCHAR(12) NOT NULL DEFAULT 'unknown' CHECK (running_mode IN ('unknown', 'running', 'starting', 'stopping', 'stopped')),
  running_note TEXT,
  assessment VARCHAR(12) NOT NULL DEFAULT 'not_assessed' CHECK (assessment IN ('not_assessed', 'abnormal', 'investigate', 'coverage', 'recovery')),
  assessment_note TEXT,
  next_action TEXT,
  close_note TEXT,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cases_machine ON cases (machine_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_open ON cases (stage) WHERE stage <> 'closed';

CREATE TABLE IF NOT EXISTS case_measurements (
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  measurement_id VARCHAR(128) NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, measurement_id)
);

CREATE TABLE IF NOT EXISTS case_causes (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_causes_case ON case_causes (case_id);

CREATE TABLE IF NOT EXISTS case_checks (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  cause_id BIGINT REFERENCES case_causes(id) ON DELETE SET NULL,
  kind VARCHAR(12) NOT NULL CHECK (kind IN ('measurement', 'inspection', 'lab', 'review', 'operating', 'history')),
  detail TEXT NOT NULL,
  assignee_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  assignee_text VARCHAR(128),
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  result VARCHAR(10) CHECK (result IN ('supports', 'rules_out', 'unclear')),
  result_note TEXT,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  done_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  done_at TIMESTAMPTZ,
  CHECK (status <> 'done' OR result IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_case_checks_case ON case_checks (case_id);

CREATE TABLE IF NOT EXISTS case_requests (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  work_type VARCHAR(12) NOT NULL CHECK (work_type IN ('inspection', 'repair', 'monitoring')),
  team VARCHAR(128) NOT NULL,
  scope TEXT NOT NULL,
  acceptance TEXT NOT NULL,
  window_text TEXT,
  resources TEXT,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_requests_case ON case_requests (case_id);

CREATE TABLE IF NOT EXISTS case_files (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content_type VARCHAR(128) NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  data BYTEA NOT NULL,
  uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_files_case ON case_files (case_id);

CREATE TABLE IF NOT EXISTS case_series (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS case_series_points (
  series_id BIGINT NOT NULL REFERENCES case_series(id) ON DELETE CASCADE,
  t TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION,
  quality VARCHAR(8) NOT NULL CHECK (quality IN ('valid', 'missing', 'invalid')),
  PRIMARY KEY (series_id, t)
);

CREATE TABLE IF NOT EXISTS case_events (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events (case_id, at);

CREATE TABLE IF NOT EXISTS manual_alarms (
  id BIGSERIAL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  case_id BIGINT REFERENCES cases(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  severity VARCHAR(8) NOT NULL CHECK (severity IN ('alert', 'critical')),
  location TEXT NOT NULL,
  observed_value TEXT,
  limit_text TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  recorded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acked_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  acked_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_manual_alarms_machine ON manual_alarms (machine_id, observed_at DESC);
