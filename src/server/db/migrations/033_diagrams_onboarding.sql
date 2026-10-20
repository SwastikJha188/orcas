-- =============================================================================
-- 033 · Generated diagrams and plant onboarding
--
-- diagrams              2D sheets and 3D models made by the machine-diagram
--                       skills, stored as data (scripts/diagram-lab/export.mjs),
--                       one per drawing kind and dimension. A machine shows the
--                       drawing whose diagram_type equals its equipment model's
--                       diagram_type, so a new plant needs no rebuild.
-- onboarding_packages   one onboarding of a plant: the working draft (plant,
--                       areas, users, machines, points, ranges) until it is
--                       committed into the monitoring tables.
-- onboarding_files      documents (PDF) and machine images uploaded to a
--                       package, with the result of processing them (the
--                       pdf-extract skill's extract.json, or the diagrams made).
-- =============================================================================

CREATE TABLE IF NOT EXISTS diagrams (
  id           VARCHAR(80) PRIMARY KEY,           -- "<diagram_type>:<kind>"
  diagram_type VARCHAR(64) NOT NULL,
  kind         VARCHAR(4)  NOT NULL CHECK (kind IN ('2d', '3d')),
  name         VARCHAR(255) NOT NULL,
  data         JSONB NOT NULL,
  source       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (diagram_type, kind)
);

CREATE TABLE IF NOT EXISTS onboarding_packages (
  id           VARCHAR(64) PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'processed', 'committed')),
  draft        JSONB NOT NULL DEFAULT '{}'::jsonb,
  plant_id     VARCHAR(64) REFERENCES plants(id) ON DELETE SET NULL,
  created_by   VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS onboarding_files (
  id           SERIAL PRIMARY KEY,
  package_id   VARCHAR(64) NOT NULL REFERENCES onboarding_packages(id) ON DELETE CASCADE,
  kind         VARCHAR(16) NOT NULL CHECK (kind IN ('document', 'image')),
  machine_key  VARCHAR(64),                       -- image: the machine it shows (draft machine key)
  file_name    VARCHAR(255) NOT NULL,
  mime         VARCHAR(128) NOT NULL,
  size_bytes   INTEGER NOT NULL,
  content      BYTEA NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'processed', 'failed')),
  result       JSONB,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_onboarding_files_package ON onboarding_files(package_id);
