# Plan: International Expansion

How to add countries beyond Australia when the time comes. This doc covers schema changes, data pipeline changes, URL/routing changes, and the endemic/native migration.

---

## Current state (Australia-only)

- `regions` table has a `country` column (default `'Australia'`), already ready for multi-country
- `species.is_endemic` and `species.is_native` are flat booleans — they mean "endemic/native to Australia" because iNaturalist returns these scoped to `preferred_place_id=6744` (Australia)
- The data pipeline queries iNaturalist, ALA, OBIS, and GBIF — all scoped to Australian coordinates
- URL structure: `/locations/[region]/[site]` — no country tier
- `regions.slug` is unique globally (works while all regions are in one country)

---

## Step 1: Migrate endemic/native to a distribution table

The `is_endemic` and `is_native` booleans on `species` are Australia-scoped. Once you have species shared across countries (e.g. sea turtles appear in both AU and ID), you need per-country status.

### Migration SQL

```sql
-- Create the distribution table
CREATE TABLE species_distribution (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  species_id  UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,  -- ISO 3166-1 alpha-2 (AU, NZ, ID, PH, etc.)
  status      TEXT NOT NULL CHECK (status IN ('endemic', 'native', 'introduced')),
  source      TEXT,            -- 'inaturalist', 'fishbase', 'manual'
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(species_id, country_code)
);

CREATE INDEX idx_species_dist_species ON species_distribution(species_id);
CREATE INDEX idx_species_dist_country ON species_distribution(country_code);

-- Migrate existing data
INSERT INTO species_distribution (species_id, country_code, status, source)
SELECT
  id,
  'AU',
  CASE
    WHEN is_endemic THEN 'endemic'
    WHEN is_native THEN 'native'
    ELSE 'introduced'
  END,
  'inaturalist'
FROM species
WHERE is_endemic IS NOT NULL OR is_native IS NOT NULL;

-- Drop old columns
ALTER TABLE species DROP COLUMN is_endemic;
ALTER TABLE species DROP COLUMN is_native;
```

### App changes

- Species page query: join `species_distribution` instead of reading `is_endemic`/`is_native` directly
- Show distribution as a list if multiple countries: "Native to Australia, Indonesia, Philippines"
- On location pages (which are country-scoped via their region), you can still show "Endemic to Australia" by filtering `species_distribution` for the region's country

---

## Step 2: Add country tier to URL structure

Current: `/locations/[region]/[site]`
New: `/locations/[country]/[region]/[site]`

### Why a URL change is needed

Region slugs like `bali` and `sydney` are globally unique today, but adding countries creates ambiguity (multiple countries could have regions with the same name) and loses geographic context in the URL. The country tier also helps SEO ("snorkelling spots in Indonesia").

### Migration approach

1. Add a `country_code` and `country_slug` to `regions` (or create a `countries` table — see below)
2. Update Next.js routing: `src/app/locations/[country]/[region]/[site]/page.tsx`
3. Set up 301 redirects from old URLs to new: `/locations/sydney/bare-island` → `/locations/australia/sydney/bare-island`
4. Update all internal links, sitemaps, OG metadata

### Countries table (optional but recommended)

```sql
CREATE TABLE countries (
  code        TEXT PRIMARY KEY,  -- ISO 3166-1 alpha-2
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,  -- 'australia', 'indonesia', etc.
  currency    TEXT,                   -- for localised pricing later
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed
INSERT INTO countries (code, name, slug) VALUES
  ('AU', 'Australia', 'australia');

-- Update regions to FK
ALTER TABLE regions ADD COLUMN country_code TEXT REFERENCES countries(code);
UPDATE regions SET country_code = 'AU';
ALTER TABLE regions ALTER COLUMN country_code SET NOT NULL;
-- Then drop the old text country column
ALTER TABLE regions DROP COLUMN country;
```

This gives you a clean hierarchy: `countries` → `regions` → `locations` → `location_species`.

### Region slug uniqueness

Change the unique constraint on `regions.slug` from globally unique to unique per country:

```sql
ALTER TABLE regions DROP CONSTRAINT regions_slug_key;
ALTER TABLE regions ADD CONSTRAINT regions_slug_country_unique UNIQUE(country_code, slug);
```

---

## Step 3: Expand the data pipeline per country

The pipeline currently queries by lat/lng coordinates scoped to Australian dive sites. To add a country:

1. **Add regions and locations** for the new country (same process as Australia — AI research pass, manual curation)
2. **iNaturalist** — works globally. Change `preferred_place_id` per country for correct endemic/native scoping:
   - Australia: `6744`
   - New Zealand: `6803`
   - Indonesia: `6857`
   - Philippines: `6852`
   - Look up others via `GET https://api.inaturalist.org/v1/places/autocomplete?q=country_name`
3. **ALA** — Australia-only. Will not return data for other countries. Replace with the country's equivalent GBIF node or skip.
4. **OBIS** — already global. No changes needed, just new WKT bounding boxes for new locations.
5. **GBIF** — already global. Useful as the primary supplementary source for non-Australian countries (since ALA won't apply).
6. **FishBase/SeaLifeBase** — already global. Query `country` table with the new country code.
7. **WoRMS** — already global. No changes needed.

### Country-specific considerations

- **Rate limits:** More locations = more API calls. Budget iNaturalist's 100 req/min across all countries.
- **Taxonomy:** WoRMS AphiaID deduplication already handles species appearing in multiple countries. A Weedy Seadragon observed in both AU and NZ locations will share one `species` row, with two `species_distribution` rows.
- **Seasonality:** Southern vs northern hemisphere — months are inverted. The `species_seasonality` table is already per `location_species_id`, so this is handled automatically. Just be aware that a species "in season" in July in Australia is winter, but summer in the UK.
- **Content:** Summaries, deep dives, and descriptions need to be written or generated for new regions/locations. Existing species content (summary, deep dive) is global and doesn't need duplication.

---

## Step 4: Update the frontend

### Regions index (`/locations`)

Currently shows all regions. With multiple countries, add a country grouping layer:

- `/locations` → countries index (or keep as a flat list grouped by country heading)
- `/locations/[country]` → regions in that country
- `/locations/[country]/[region]` → locations in that region
- `/locations/[country]/[region]/[site]` → site page

### Species page

- Range line becomes multi-country: "Native to Australia and Indonesia" or "Endemic to eastern Australia"
- "Where to find it" cards already show location + region — add country grouping if species spans multiple countries

### Homepage

- If still Australia-focused: no changes needed
- If multi-country: add country picker or show nearest country via geolocation

### Species ID tool

- Location picker (step 1) needs country → region → location hierarchy

---

## Suggested expansion order

1. **New Zealand** — closest geographically, similar marine environment, English-speaking (no i18n needed), good iNaturalist coverage, temperate species overlap with southern AU
2. **Southeast Asia** (Indonesia, Philippines, Thailand) — huge diving market, tropical species, strong OBIS/GBIF coverage, would need i18n eventually
3. **UK / Mediterranean** — large recreational diving community, good data coverage, English (UK) or i18n needed (Med)

---

## What you do NOT need to do now

- No schema changes needed until you're actually adding a second country
- No URL restructuring until then either
- The current `is_endemic`/`is_native` booleans and `regions.country` text field work perfectly for Australia-only
- This doc exists so future-you can execute the migration in a day rather than designing it from scratch
