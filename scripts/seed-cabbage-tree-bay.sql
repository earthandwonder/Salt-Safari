-- Seed: Sydney region + Cabbage Tree Bay
INSERT INTO regions (name, country, slug, published)
VALUES ('Sydney', 'Australia', 'sydney', TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO locations (region_id, name, slug, lat, lng, radius_km, activities, skill_level, data_quality, source)
VALUES (
  (SELECT id FROM regions WHERE slug = 'sydney'),
  'Cabbage Tree Bay Aquatic Reserve',
  'cabbage-tree-bay',
  -33.7983, 151.2885,
  1.5,
  '{snorkelling, freediving}',
  'beginner',
  'stub',
  'manual'
) ON CONFLICT (region_id, slug) DO NOTHING;
