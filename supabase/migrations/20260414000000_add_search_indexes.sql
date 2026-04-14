-- Full-text search and fuzzy matching indexes for species and locations

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search on species (name weighted highest, scientific_name next, summary lowest)
ALTER TABLE species ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(scientific_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_species_fts ON species USING GIN(fts);

-- Full-text search on locations (name weighted highest, description lowest)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_locations_fts ON locations USING GIN(fts);

-- Trigram indexes for fuzzy matching (handles typos)
CREATE INDEX IF NOT EXISTS idx_species_name_trgm ON species USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON locations USING GIN(name gin_trgm_ops);

-- FTS search function for species (prefix matching for search-as-you-type)
CREATE OR REPLACE FUNCTION search_species_fts(query text)
RETURNS TABLE(
  slug text,
  name text,
  scientific_name text,
  hero_image_url text,
  rank real
)
LANGUAGE sql STABLE
AS $$
  SELECT s.slug, s.name, s.scientific_name, s.hero_image_url,
    ts_rank(s.fts, to_tsquery('english',
      array_to_string(
        array(SELECT word || ':*' FROM unnest(string_to_array(trim(query), ' ')) AS word WHERE word <> ''),
        ' & '
      )
    )) AS rank
  FROM species s
  WHERE s.published = true
    AND s.fts @@ to_tsquery('english',
      array_to_string(
        array(SELECT word || ':*' FROM unnest(string_to_array(trim(query), ' ')) AS word WHERE word <> ''),
        ' & '
      )
    )
  ORDER BY rank DESC
  LIMIT 15;
$$;

-- FTS search function for locations (prefix matching)
CREATE OR REPLACE FUNCTION search_locations_fts(query text)
RETURNS TABLE(
  slug text,
  name text,
  hero_image_url text,
  region_slug text,
  region_name text,
  rank real
)
LANGUAGE sql STABLE
AS $$
  SELECT l.slug, l.name, l.hero_image_url, r.slug AS region_slug, r.name AS region_name,
    ts_rank(l.fts, to_tsquery('english',
      array_to_string(
        array(SELECT word || ':*' FROM unnest(string_to_array(trim(query), ' ')) AS word WHERE word <> ''),
        ' & '
      )
    )) AS rank
  FROM locations l
  JOIN regions r ON l.region_id = r.id
  WHERE l.published = true
    AND l.fts @@ to_tsquery('english',
      array_to_string(
        array(SELECT word || ':*' FROM unnest(string_to_array(trim(query), ' ')) AS word WHERE word <> ''),
        ' & '
      )
    )
  ORDER BY rank DESC
  LIMIT 10;
$$;

-- Trigram search function for species (fuzzy fallback)
CREATE OR REPLACE FUNCTION search_species_trigram(query text)
RETURNS TABLE(
  slug text,
  name text,
  scientific_name text,
  hero_image_url text
)
LANGUAGE sql STABLE
AS $$
  SELECT s.slug, s.name, s.scientific_name, s.hero_image_url
  FROM species s
  WHERE s.published = true
    AND (
      similarity(s.name, query) > 0.2
      OR similarity(s.scientific_name, query) > 0.2
    )
  ORDER BY greatest(
    similarity(s.name, query),
    similarity(s.scientific_name, query)
  ) DESC
  LIMIT 10;
$$;

-- Trigram search function for locations (fuzzy fallback)
CREATE OR REPLACE FUNCTION search_locations_trigram(query text)
RETURNS TABLE(
  slug text,
  name text,
  hero_image_url text,
  region_slug text,
  region_name text
)
LANGUAGE sql STABLE
AS $$
  SELECT l.slug, l.name, l.hero_image_url, r.slug AS region_slug, r.name AS region_name
  FROM locations l
  JOIN regions r ON l.region_id = r.id
  WHERE l.published = true
    AND similarity(l.name, query) > 0.2
  ORDER BY similarity(l.name, query) DESC
  LIMIT 10;
$$;
