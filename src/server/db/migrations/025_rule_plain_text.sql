-- =============================================================================
-- 025 · Plain-language rule texts
--
-- Every rule carries a headline, a "what is happening" sentence and a "what to
-- do" sentence that anyone can read without knowing the machine or the screen
-- (docs/plain-language.md). The engineering name, logic, cause, consequence and
-- action stay as they are and show under Details.
-- =============================================================================

ALTER TABLE rules
  ADD COLUMN IF NOT EXISTS plain_title VARCHAR(120),
  ADD COLUMN IF NOT EXISTS plain_what TEXT,
  ADD COLUMN IF NOT EXISTS plain_todo TEXT;
