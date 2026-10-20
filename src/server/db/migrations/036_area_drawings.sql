-- =============================================================================
-- 036 · Area drawings
--
-- A factory, section or line (hierarchy area) can have its own drawing made
-- from an uploaded photo or layout during onboarding: the drawing kind stored
-- in `diagrams` (migration 033), like equipment_models.diagram_type for a
-- machine. Null = no drawing.
-- =============================================================================

ALTER TABLE hierarchy_nodes ADD COLUMN IF NOT EXISTS diagram_type VARCHAR(64);
