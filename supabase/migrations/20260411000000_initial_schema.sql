-- ============================================================
-- Salt Safari — Initial Schema Migration
-- Run against a Supabase project with: supabase db push
-- ============================================================

-- ============================================================
-- REGIONS
-- ============================================================
CREATE TABLE regions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Australia',
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  description_status TEXT DEFAULT 'draft'
    CHECK (description_status IN ('draft', 'reviewed', 'published')),
  hero_image_url TEXT,
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LOCATIONS
-- ============================================================
CREATE TABLE locations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id   UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  aliases     TEXT[] DEFAULT '{}',  -- alternate names for search/dedup
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  radius_km   NUMERIC DEFAULT 1.5,
  coords_source TEXT,
  activities  TEXT[] DEFAULT '{}',
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  depth_min   NUMERIC,
  depth_max   NUMERIC,
  access_notes TEXT,                                  -- free text — parking, entry points, hazards, conditions etc. Not structured; include where known.
  description TEXT,
  description_source TEXT DEFAULT 'stub'
    CHECK (description_source IN ('stub', 'ai_draft', 'human', 'ai_reviewed')),
  description_status TEXT DEFAULT 'draft'
    CHECK (description_status IN ('draft', 'reviewed', 'published')),
  hero_image_url TEXT,
  data_quality TEXT DEFAULT 'stub'
    CHECK (data_quality IN ('stub', 'partial', 'complete')),
  source      TEXT,
  published   BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(region_id, slug)
);

CREATE INDEX idx_locations_region ON locations(region_id);
CREATE INDEX idx_locations_published ON locations(published) WHERE published = TRUE;
CREATE INDEX idx_locations_coords ON locations(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX idx_locations_aliases ON locations USING GIN(aliases);

-- ============================================================
-- SPECIES
-- ============================================================
CREATE TABLE species (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  scientific_name TEXT UNIQUE,
  slug            TEXT NOT NULL UNIQUE,

  -- External IDs for multi-source deduplication
  inat_taxon_id   INTEGER,
  worms_aphia_id  INTEGER,
  taxon_id_ala    TEXT,

  -- Taxonomic hierarchy
  kingdom         TEXT,
  phylum          TEXT,
  class           TEXT,
  "order"         TEXT,
  family          TEXT,
  genus           TEXT,

  -- Content
  summary         TEXT,
  deep_dive       TEXT,
  deep_dive_status TEXT DEFAULT 'draft'
    CHECK (deep_dive_status IN ('draft', 'reviewed', 'published')),
  hero_image_url  TEXT,

  -- Filterable attributes for Species ID tool
  size_category   TEXT CHECK (size_category IN (
    'tiny', 'small', 'medium', 'large', 'very_large'
  )),
  colours         TEXT[] DEFAULT '{}',
  habitat         TEXT[] DEFAULT '{}',
  behaviour_tags  TEXT[] DEFAULT '{}',

  -- Enrichment (FishBase/WoRMS/pipeline)
  max_length_cm       NUMERIC,
  depth_min_m         INTEGER,
  depth_max_m         INTEGER,
  depth_common_min_m  INTEGER,
  depth_common_max_m  INTEGER,
  habitat_type        TEXT,
  iucn_category       TEXT,
  is_endemic          BOOLEAN,                        -- iNaturalist: scoped to preferred_place_id (Australia)
  is_native           BOOLEAN,                        -- iNaturalist: scoped to preferred_place_id (Australia)
  is_introduced       BOOLEAN,                        -- iNaturalist: scoped to preferred_place_id (Australia)
  is_charismatic      BOOLEAN DEFAULT FALSE,

  data_quality TEXT DEFAULT 'stub'
    CHECK (data_quality IN ('stub', 'partial', 'complete')),
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_species_published ON species(published) WHERE published = TRUE;
CREATE INDEX idx_species_charismatic ON species(is_charismatic) WHERE is_charismatic = TRUE;
CREATE INDEX idx_species_inat ON species(inat_taxon_id) WHERE inat_taxon_id IS NOT NULL;
CREATE INDEX idx_species_worms ON species(worms_aphia_id) WHERE worms_aphia_id IS NOT NULL;
CREATE INDEX idx_species_colours ON species USING GIN(colours);
CREATE INDEX idx_species_habitat ON species USING GIN(habitat);

-- ============================================================
-- LOCATION_SPECIES (the core join — "what can I see where")
-- ============================================================
CREATE TABLE location_species (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  species_id      UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  confidence      NUMERIC
    CHECK (confidence >= 0 AND confidence <= 1),
  total_observations INTEGER DEFAULT 0,
  observer_count  INTEGER,
  first_observed_month SMALLINT CHECK (first_observed_month BETWEEN 1 AND 12),
  last_observed_month  SMALLINT CHECK (last_observed_month BETWEEN 1 AND 12),
  season_notes    TEXT,
  verified        BOOLEAN DEFAULT FALSE,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(location_id, species_id)
);

CREATE INDEX idx_ls_location ON location_species(location_id);
CREATE INDEX idx_ls_species ON location_species(species_id);
CREATE INDEX idx_ls_confidence ON location_species(confidence DESC);

-- ============================================================
-- SOURCE_RECORDS (per-source attribution for multi-source pipeline)
-- ============================================================
CREATE TABLE source_records (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_species_id UUID NOT NULL REFERENCES location_species(id) ON DELETE CASCADE,
  source              TEXT NOT NULL
    CHECK (source IN ('inaturalist', 'ala', 'obis', 'gbif', 'manual', 'community_report')),
  source_dataset      TEXT,
  observation_count   INTEGER DEFAULT 0,
  basis_of_record     TEXT,
  license             TEXT,
  last_queried        TIMESTAMPTZ,
  raw_response        JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE(location_species_id, source, source_dataset)
);

-- ============================================================
-- SPECIES_SEASONALITY (month-level detail per species per location)
-- ============================================================
CREATE TABLE species_seasonality (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_species_id UUID NOT NULL REFERENCES location_species(id) ON DELETE CASCADE,
  month               SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  likelihood          TEXT NOT NULL
    CHECK (likelihood IN ('common', 'occasional', 'rare')),
  raw_observation_count   INTEGER,
  normalized_frequency    NUMERIC,  -- deferred: effort normalization added later if raw data proves misleading
  total_effort_that_month INTEGER,  -- deferred: baseline effort for normalization (not used at launch)
  source              TEXT DEFAULT 'inaturalist_data'
    CHECK (source IN ('inaturalist_data', 'ala_data', 'local_knowledge', 'community')),
  last_synced_at      TIMESTAMPTZ,

  UNIQUE(location_species_id, month)
);

-- ============================================================
-- PHOTOGRAPHERS (must come before photos due to FK)
-- ============================================================
CREATE TABLE photographers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  bio             TEXT,
  website_url     TEXT,
  instagram_url   TEXT,
  youtube_url     TEXT,
  referral_code   TEXT UNIQUE,
  profile_image_url TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE photos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url               TEXT NOT NULL,
  alt_text          TEXT,
  photographer_name TEXT NOT NULL,
  photographer_id   UUID REFERENCES photographers(id) ON DELETE SET NULL,
  license           TEXT NOT NULL,
  license_url       TEXT,
  source            TEXT NOT NULL
    CHECK (source IN ('wikimedia', 'flickr', 'inaturalist', 'csiro', 'gbrmpa',
                      'partner', 'commissioned', 'community')),
  source_url        TEXT,
  date_accessed     DATE,
  inaturalist_obs_id INTEGER,

  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  species_id        UUID REFERENCES species(id) ON DELETE SET NULL,
  is_hero           BOOLEAN DEFAULT FALSE,

  width             INTEGER,
  height            INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT photo_belongs_to_one_entity CHECK (
    (location_id IS NOT NULL AND species_id IS NULL) OR
    (location_id IS NULL AND species_id IS NOT NULL)
  )
);

CREATE INDEX idx_photos_location ON photos(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_photos_species ON photos(species_id) WHERE species_id IS NOT NULL;
CREATE INDEX idx_photos_hero ON photos(is_hero) WHERE is_hero = TRUE;

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT,
  has_purchased_id    BOOLEAN DEFAULT FALSE,
  stripe_customer_id  TEXT,
  stripe_payment_id   TEXT,
  referred_by         TEXT,
  favourite_locations UUID[] DEFAULT '{}',
  notification_prefs  TEXT DEFAULT 'email'
    CHECK (notification_prefs IN ('email', 'push', 'none')),
  is_admin            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SPECIES_ALERTS
-- ============================================================
CREATE TABLE species_alerts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id          UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE CASCADE,  -- nullable = all locations
  enabled             BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, species_id, location_id)
);
CREATE INDEX idx_species_alerts_user ON species_alerts(user_id);
CREATE INDEX idx_species_alerts_enabled ON species_alerts(enabled) WHERE enabled = TRUE;

-- ============================================================
-- SIGHTINGS
-- ============================================================
CREATE TABLE sightings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id          UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  location_id         UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  sighted_at          DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity            INTEGER DEFAULT 1,                     -- how many seen (default 1)
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sightings_user ON sightings(user_id);
CREATE INDEX idx_sightings_user_location ON sightings(user_id, location_id);
CREATE INDEX idx_sightings_location_species ON sightings(location_id, species_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON species FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON location_species FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON photographers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Helper for RLS policies — one-off purchase check
CREATE OR REPLACE FUNCTION has_purchased()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND has_purchased_id = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Premium content gating (RLS is row-level, this gates a column)
CREATE OR REPLACE FUNCTION get_species_deep_dive(p_species_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
BEGIN
  IF has_purchased() THEN
    SELECT deep_dive INTO v_content
    FROM public.species WHERE id = p_species_id AND published = TRUE;
    RETURN v_content;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_seasonality ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

-- Public read: published content visible to everyone
CREATE POLICY "Public read published regions" ON regions FOR SELECT USING (published = TRUE);
CREATE POLICY "Public read published locations" ON locations FOR SELECT USING (published = TRUE);
CREATE POLICY "Public read published species" ON species FOR SELECT USING (published = TRUE);
CREATE POLICY "Public read location_species" ON location_species FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM locations l, species s
    WHERE l.id = location_species.location_id AND l.published = TRUE
      AND s.id = location_species.species_id AND s.published = TRUE
  ));
CREATE POLICY "Public read source_records" ON source_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM location_species ls
      JOIN locations l ON l.id = ls.location_id AND l.published = TRUE
      JOIN species s ON s.id = ls.species_id AND s.published = TRUE
    WHERE ls.id = source_records.location_species_id
  ));
CREATE POLICY "Public read seasonality" ON species_seasonality FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM location_species ls
      JOIN locations l ON l.id = ls.location_id AND l.published = TRUE
      JOIN species s ON s.id = ls.species_id AND s.published = TRUE
    WHERE ls.id = species_seasonality.location_species_id
  ));
CREATE POLICY "Public read photos" ON photos FOR SELECT USING (TRUE);
CREATE POLICY "Public read photographers" ON photographers FOR SELECT USING (TRUE);

-- Users: own row only
CREATE POLICY "Users read own row" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own row" ON users FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Sightings: users manage own sightings
CREATE POLICY "Users read own sightings" ON sightings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sightings" ON sightings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sightings" ON sightings FOR DELETE USING (auth.uid() = user_id);

-- Species Alerts: users manage own alerts
CREATE POLICY "Users read own alerts" ON species_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alerts" ON species_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alerts" ON species_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own alerts" ON species_alerts FOR DELETE USING (auth.uid() = user_id);
