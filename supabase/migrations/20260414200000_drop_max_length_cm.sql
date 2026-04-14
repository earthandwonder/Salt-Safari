-- Drop raw FishBase columns. We derive size_category, depth_zone,
-- and habitat[] instead. These columns held CC-BY-NC data we shouldn't store.
ALTER TABLE species DROP COLUMN IF EXISTS max_length_cm;
ALTER TABLE species DROP COLUMN IF EXISTS depth_min_m;
ALTER TABLE species DROP COLUMN IF EXISTS depth_max_m;
ALTER TABLE species DROP COLUMN IF EXISTS depth_common_min_m;
ALTER TABLE species DROP COLUMN IF EXISTS depth_common_max_m;
ALTER TABLE species DROP COLUMN IF EXISTS habitat_type;
