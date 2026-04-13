-- ============================================================
-- Add is_spottable to location_species
-- Species marked as spottable appear in the "find them all"
-- checklist. Non-spottable species remain in the DB for the
-- Species ID tool but don't appear on location pages.
-- ============================================================

ALTER TABLE location_species
  ADD COLUMN is_spottable BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_ls_spottable ON location_species(is_spottable) WHERE is_spottable = TRUE;
