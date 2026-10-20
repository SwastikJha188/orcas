-- =============================================================================
-- 039 · Photos drawn before the plant or machine exists
--
-- In Configure's Add plant / Add machine forms a photo is drawn as soon as it
-- is picked, so the 2D / 3D drawing can be previewed before anything is added.
-- Until the form is saved the photo belongs to the form (draft_key) and says
-- what it shows (subject + the name / type / code typed so far); the drawing
-- kind is planned at upload (diagram_type). Saving attaches it to the new plant
-- or machine (draft_key cleared) and links the drawing; cancelling deletes it.
-- =============================================================================

ALTER TABLE asset_images ALTER COLUMN plant_id DROP NOT NULL;
ALTER TABLE asset_images ADD COLUMN IF NOT EXISTS draft_key VARCHAR(64);
ALTER TABLE asset_images ADD COLUMN IF NOT EXISTS subject VARCHAR(8) CHECK (subject IN ('machine', 'plant'));
ALTER TABLE asset_images ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
ALTER TABLE asset_images ADD COLUMN IF NOT EXISTS subject_type VARCHAR(255);
ALTER TABLE asset_images ADD COLUMN IF NOT EXISTS subject_code VARCHAR(64);
ALTER TABLE asset_images DROP CONSTRAINT IF EXISTS asset_images_owner_check;
ALTER TABLE asset_images ADD CONSTRAINT asset_images_owner_check CHECK (plant_id IS NOT NULL OR draft_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_asset_images_draft ON asset_images(draft_key) WHERE draft_key IS NOT NULL;

ALTER TABLE onboarding_runs ADD COLUMN IF NOT EXISTS draft_key VARCHAR(64);
ALTER TABLE onboarding_runs DROP CONSTRAINT IF EXISTS onboarding_runs_subject_check;
ALTER TABLE onboarding_runs ADD CONSTRAINT onboarding_runs_subject_check
  CHECK ((package_id IS NOT NULL)::int + (plant_id IS NOT NULL)::int + (draft_key IS NOT NULL)::int = 1);
CREATE INDEX IF NOT EXISTS idx_onboarding_runs_draft ON onboarding_runs(draft_key, started_at DESC) WHERE draft_key IS NOT NULL;
