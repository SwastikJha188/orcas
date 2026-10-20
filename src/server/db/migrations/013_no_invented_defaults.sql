-- =============================================================================
-- 013 · Unknown facts are NULL, never a default
--
-- * users.avatar_initials is derived from the full name; not stored.
-- * A user's title, department and shift, and a plant's region, location and
--   coordinates, are NULL until someone enters them (the old column defaults
--   invented a shift, a region and coordinates).
-- * A plant's time zone has no default: it is entered with the plant.
-- =============================================================================

ALTER TABLE users DROP COLUMN IF EXISTS avatar_initials;
ALTER TABLE users ALTER COLUMN title DROP NOT NULL;
ALTER TABLE users ALTER COLUMN department DROP NOT NULL;
ALTER TABLE users ALTER COLUMN shift DROP NOT NULL;
ALTER TABLE users ALTER COLUMN shift DROP DEFAULT;

ALTER TABLE plants ALTER COLUMN time_zone DROP DEFAULT;
ALTER TABLE plants ALTER COLUMN region DROP NOT NULL;
ALTER TABLE plants ALTER COLUMN location DROP NOT NULL;
ALTER TABLE plants ALTER COLUMN coordinates DROP NOT NULL;
