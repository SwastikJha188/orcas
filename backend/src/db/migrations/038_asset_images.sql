-- =============================================================================
-- 038 · Photos of plants and machines
--
-- asset_images   photos, drawings or layouts uploaded when a plant or machine
--                is added or edited in Configure. Claude Code (Haiku) turns each
--                into drawings with the diagram skills (stored in `diagrams`)
--                and links them: a machine photo sets its equipment model's
--                diagram_type, a plant photo the plant node's diagram_type (036).
-- onboarding_runs  a run now belongs to an onboarding or to a plant's photos.
-- =============================================================================

CREATE TABLE IF NOT EXISTS asset_images (
  id           SERIAL PRIMARY KEY,
  plant_id     VARCHAR(64) NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  machine_id   VARCHAR(64) REFERENCES machines(id) ON DELETE CASCADE,  -- null = a photo or layout of the plant itself
  file_name    VARCHAR(255) NOT NULL,
  mime         VARCHAR(128) NOT NULL,
  size_bytes   INTEGER NOT NULL,
  content      BYTEA NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'processed', 'failed')),
  diagram_type VARCHAR(64),                                             -- drawing kind made from it
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_asset_images_plant ON asset_images(plant_id, status);

ALTER TABLE onboarding_runs ALTER COLUMN package_id DROP NOT NULL;
ALTER TABLE onboarding_runs ADD COLUMN IF NOT EXISTS plant_id VARCHAR(64) REFERENCES plants(id) ON DELETE CASCADE;
ALTER TABLE onboarding_runs DROP CONSTRAINT IF EXISTS onboarding_runs_subject_check;
ALTER TABLE onboarding_runs ADD CONSTRAINT onboarding_runs_subject_check CHECK ((package_id IS NULL) <> (plant_id IS NULL));
CREATE INDEX IF NOT EXISTS idx_onboarding_runs_plant ON onboarding_runs(plant_id, started_at DESC);
