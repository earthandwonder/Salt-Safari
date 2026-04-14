-- Add derived enrichment fields (from FishBase signals, never raw data)
-- and clear any raw FishBase values previously written.

-- New derived fields
ALTER TABLE species ADD COLUMN IF NOT EXISTS depth_zone TEXT
  CHECK (depth_zone IN ('snorkel-friendly', 'shallow dive', 'deep dive'));

ALTER TABLE species ADD COLUMN IF NOT EXISTS danger_note TEXT
  CHECK (danger_note IN ('harmless', 'venomous', 'can bite or sting', 'poisonous if eaten'));

ALTER TABLE species ADD COLUMN IF NOT EXISTS where_to_look TEXT;

-- Clear raw FishBase values that were copied verbatim (CC-BY-NC compliance)
UPDATE species SET
  max_length_cm = NULL,
  depth_min_m = NULL,
  depth_max_m = NULL,
  depth_common_min_m = NULL,
  depth_common_max_m = NULL,
  habitat_type = NULL
WHERE max_length_cm IS NOT NULL
   OR depth_min_m IS NOT NULL
   OR depth_max_m IS NOT NULL
   OR depth_common_min_m IS NOT NULL
   OR depth_common_max_m IS NOT NULL
   OR habitat_type IS NOT NULL;
