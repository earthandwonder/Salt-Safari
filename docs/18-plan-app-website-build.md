# Salt Safari - App & Website Build Plan

**Goal:** Build a standalone app and website where everyday swimmers, snorkellers and divers can discover what species appear at each dive/snorkel location — without needing to know what iNaturalist is.

**Current state:** Next.js 15 repo with Supabase, Tailwind, Motion configured. Homepage and Species ID wizard prototyped with hardcoded mock data (not wired to database). Database schema designed (11 tables, RLS, triggers) but not yet migrated. Seed data from old Notion site exported as CSVs + markdown in `notion-migration/` folder (22 locations, 27 species, 2 regions) — reference only, not imported. No API routes, no auth UI, no data pipeline scripts, no real data fetching. Previous Notion/Super.so site at saltsafari.app still live. DNS via Cloudflare, domain via Name.com, Google Analytics active.

**Note:** The homepage and Species ID wizard were prototyped early. These will need reworking once the data pipeline is running and real data shapes the UI requirements. The plan below treats them as not-yet-built.

---

## 1. Data Sourcing & Structure

The product is only as good as its data. Before building anything, nail the content pipeline.

**Decided:** Curated data only for launch. Community submissions deferred to Phase 4+ — requires traffic to be useful, and building moderation tools now is premature. The schema already supports `source` tracking so community data can be layered in later without migration.

### Where does data come from?

| Data | Source | Method |
|------|--------|--------|
| **Location list** | AI deep research per region, cross-referencing: Google Maps, PADI directory, local dive shop sites, tourism boards, Reddit/forums, govt marine park listings, snorkeling-report.com | AI research pass per region → manual curation to remove junk/duplicates |
| **Species at each location** | Multi-source pipeline: iNaturalist API (primary for shore dives), ALA (scientific surveys, offshore coverage), OBIS (marine-specific, WoRMS-validated), GBIF (one-time bulk bootstrap) | Automated pull per source, deduplicated by scientific name + WoRMS AphiaID, ranked by composite confidence score |
| **Species enrichment** (deep dive content, fun facts, ID tips, colours, size, habitat tags) | AI-generated from authoritative sources, then human-reviewed. FishBase/SeaLifeBase for depth range, habitat type, max size (CC-BY-NC — enrichment use only, consult lawyer) | Batch generate per species, review and edit |
| **Location enrichment** (description, depth, skill level) | AI-generated from web sources + local knowledge. Parking, entry points, amenities, hazards, and conditions are not structured fields — include in free-text description where known. | AI drafts from Google/tourism sites, then verified by locals or personal visits |
| **Seasonality** | iNaturalist histogram endpoint (per species per location, raw monthly counts) + ALA month facets + local knowledge | Automated baseline, ignore observer effort bias (more divers in summer ≠ more species) |
| **Photos** | Automated pipeline: Wikimedia Commons (primary, all commercially usable), Flickr CC (cc-by, cc0, public domain), CSIRO Science Image (CC BY), iNaturalist (cc-by/cc0 only, ~10-20%). Manual: GBRMPA Image Library (requires registration, check per-image), photographer partnerships (outreach). | Multi-source pipeline with license audit trail. Self-host all photos. See [[marine-photo-sourcing]] for full strategy |

**Expansion order:** Cabbage Tree Bay -> Sydney & Central Coast → South Coast → Byron/Gold Coast → Brisbane → Great Barrier Reef → internationally.

### Location deduplication & naming

Locations can have multiple names (e.g. "Fisherman's Beach" / "Fishermans Beach" / "Fisher Beach"), and the same beach name can appear in multiple regions ("Shelly Beach" exists in 15+ places in Australia). As the site expands nationally and eventually globally, this needs a strategy from day one.

**Coordinates are the canonical key.** Every location must have a lat/lng. Two entries within ~500m of each other are flagged as potential duplicates during research/import. GPS coordinates are unambiguous — a beach is a beach regardless of what you call it.

**Alternate names stored as aliases.** The `locations` table gets an `aliases TEXT[] DEFAULT '{}'` column. All known names for a location are stored here. Search hits any alias. This also handles transliterations and historical names for international expansion.

**Slugs include region for global uniqueness.** URL structure is `/locations/sydney/shelly-beach` not `/locations/shelly-beach`. The slug is unique within a region, not globally. This is already the planned URL structure (Section 4) but the schema's `slug UNIQUE` constraint should be changed to `UNIQUE(region_id, slug)` to allow the same slug in different regions.

**Radius-based species matching.** iNaturalist and other sources are queried by lat/lng + radius. The `radius_km` column (default 1.5km) on each location controls the search area. Defaults: ~1-1.5km for shore dives (tight site), 2-5km for offshore/boat dives (GPS drift on boats, larger dive area). Per-location and adjustable — tighten if pulling junk from neighbouring sites, widen if missing known species. Overlapping radii between nearby locations are fine — a species spotted between two sites is relevant to both.

### Multi-source species data pipeline

iNaturalist is the primary source for popular shore dives but has significant gaps for offshore and remote sites due to observer access bias — boat dives, remote reefs, and deep-water sites have sparse citizen science coverage. The pipeline queries multiple sources per location and deduplicates into a single species list. See [[inaturalist-report]], [[supplementary-api-sources]] for full technical specs.

| Source | Coverage strength | Integration priority | Key endpoint |
|--------|------------------|---------------------|--------------|
| **iNaturalist** | Popular shore dives. 100s of observations per site. Photo-verified. | Phase 1 (exists) | `/v1/observations/species_counts` — 4 calls/location |
| **ALA** (Atlas of Living Australia) | AIMS reef monitoring, CSIRO surveys, museum collections. Best offshore coverage. 130M+ records from 900+ providers. | Phase 1 — **highest ROI** | Faceted search with `fq=-data_resource_uid:"dr1411"` to exclude iNat |
| **OBIS** (Ocean Biodiversity Information System) | Purpose-built marine. 38M Australian records. Scientific surveys, WoRMS-validated taxonomy. | Phase 1 | `/v3/checklist` — species list with record counts per area |
| **GBIF** | Meta-aggregator (includes iNat + ALA + OBIS). Bulk download API. | One-time bootstrap | Download API with NOT predicate to exclude iNat |
| **FishBase/SeaLifeBase** | Species enrichment only (depth, habitat, size). No occurrence data. CC-BY-NC license. | Phase 2 enrichment | Parquet files via DuckDB, no REST API |
| **WoRMS** | Taxonomy normalization. Canonical AphiaIDs for cross-source deduplication. | Phase 1 (critical) | `marinespecies.org/rest/AphiaIDByName/{name}?marine_only=true` |

**Deduplication strategy:** Match species across sources by normalized scientific name (genus + epithet, lowercased). Resolve to canonical WoRMS AphiaID for synonym handling. Cache AphiaIDs in the species table as the universal join key. Without this, the same species under different accepted names gets counted separately.

**Terrestrial filtering & WoRMS resolution failures:** Source-level taxon filters (iNat taxon IDs, ALA class filters, OBIS `taxonid=2`) remove most terrestrial contamination upfront. WoRMS `marine_only=true` resolution acts as the authoritative marine filter — anything without a marine AphiaID is likely not marine. However, WoRMS may not have every species (recently described species, niche invertebrates, regional subspecies). The pipeline must NOT silently drop unresolved species. Resolution flow:

1. Try WoRMS exact match (`/AphiaIDByName/{name}?marine_only=true`)
2. If no match, try WoRMS fuzzy match (`/AphiaRecordsByMatchNames?marine_only=true`) — catches typos, synonyms, naming variations
3. If both fail: **keep the species** — insert with `worms_aphia_id = NULL` and `data_quality = 'partial'`. It appears in the admin dashboard "needs attention" list for human review.

Human review resolves unmatched species: manually assign AphiaID (WoRMS had it under a different name), confirm as marine without AphiaID, or delete as terrestrial contamination. The `worms_aphia_id` column is already nullable in the schema to support this.

**Confidence scoring:** Each species-at-location record gets a composite confidence score (0–1) based on: source weight (AIMS/CSIRO survey = 1.0, iNat citizen science = 0.7, FishBase range-only = 0.3), observation count (log-scaled), recency, and number of corroborating sources. Displayed as: Confirmed (0.8+), Likely (0.5–0.8), Possible (0.3–0.5), Range Only (0.1–0.3).

### Spatial query implementation (verified against live APIs, 2026-04-12)

All example URLs tested against Bare Island, Sydney (-33.9917, 151.2314, 1.5km radius). iNaturalist returned 256 species. ALA returned 170 marine species (with class filtering). OBIS returned 780 animal species (with taxonid=2 filter). WoRMS AphiaID lookup confirmed working.

All three occurrence sources use WGS84/EPSG:4326 coordinates. No coordinate transformation needed.

| Source | Method | Parameter format |
|--------|--------|-----------------|
| iNaturalist | Point + radius (native) | `lat=-33.9917&lng=151.2314&radius=1.5` |
| ALA | Point + radius (native) | `lat=-33.9917&lon=151.2314&radius=1.5` (note: `lon` not `lng`) |
| OBIS | WKT bounding box (converted) | `geometry=POLYGON((lon lat, lon lat, ...))` |
| WoRMS | None (taxonomy only) | N/A |

**Radius strategy:** Use the location's `radius_km` value across all sources. Default 1.5km. 1.0km for urban shore dives, 2.0km for exposed headlands, 5.0km for offshore/boat dives. For OBIS, the bounding box corners extend to ~1.41x the radius — acceptable given OBIS's inherent coordinate uncertainty.

**Unified pipeline pseudocode:**

```typescript
async function getSpeciesAtLocation(lat: number, lng: number, radiusKm: number = 1.5): Promise<MergedSpecies[]> {
  // 1. iNaturalist — native point+radius
  const inatResults = await queryINaturalist({ lat, lng, radius: radiusKm, quality_grade: 'research', geoprivacy: 'open', per_page: 500 });

  // 2. ALA — native point+radius, exclude iNat
  const alaResults = await queryALA({ lat, lon: lng, radius: radiusKm, fq: ['-data_resource_uid:"dr1411"'], facets: 'species', pageSize: 0, flimit: 500, disableQualityFilter: 'spatial-suspect' });

  // 3. OBIS — WKT bounding box conversion
  const wkt = pointToBBox(lat, lng, radiusKm);
  const obisResults = await queryOBIS({ geometry: wkt, taxonid: 2, size: 500 });

  // 4. Normalize taxonomy via WoRMS, merge by AphiaID
  const allSpecies = [...inatResults, ...alaResults, ...obisResults];
  return mergeByAphiaID(await resolveToWoRMS(allSpecies));
}
```

**Cross-source deduplication:**
1. iNat vs ALA: ALA ingests iNaturalist Australia as `dr1411`. Exclude with `fq=-data_resource_uid:"dr1411"`.
2. ALA vs OBIS: Significant overlap (CSIRO/AIMS datasets appear in both). Deduplicate by scientific name + WoRMS AphiaID at the species level.
3. Cross-source merge: Resolve all species to WoRMS AphiaID. Sum observation counts per source. Track provenance in `source_records` table.

**WKT bounding box helper (for OBIS):**

```typescript
function pointToBBox(lat: number, lng: number, radiusKm: number): string {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
  return `POLYGON((${lng - lngDelta} ${lat - latDelta}, ${lng + lngDelta} ${lat - latDelta}, ${lng + lngDelta} ${lat + latDelta}, ${lng - lngDelta} ${lat + latDelta}, ${lng - lngDelta} ${lat - latDelta}))`;
}
```

**Critical gotchas:**
- iNaturalist default photo license is CC BY-NC — cannot use on a commercial site. Filter with `&photo_license=cc0,cc-by,cc-by-sa` (~10-20% of photos pass)
- iNaturalist ToS bans commercial AI training (§7) — not an issue for displaying data, but worth noting
- No source has a native "marine" filter — use curated taxon ID lists at query time (see [[inaturalist-report]] §6) to reduce terrestrial noise, then WoRMS `marine_only=true` resolution as the authoritative downstream filter (see "Terrestrial filtering" above)
- ALA's `spatial-suspect` quality filter incorrectly drops legitimate marine records — disable it for coastal queries
- OBIS has no common/vernacular names — must cross-reference with WoRMS API
- Self-host all photos — iNaturalist will permanently block at >5GB/hour hotlinking
- iNaturalist observations with `geoprivacy=obscured` randomize coordinates within ~22km — always filter with `geoprivacy=open` to avoid false positives from distant locations

### Photo sourcing strategy

~80-90% of iNaturalist photos are CC BY-NC (non-commercial) and unusable on a commercial site. The photo pipeline draws from multiple sources. See [[marine-photo-sourcing]] for full spec.

**Source priority (ranked by ROI):**

**Automated pipeline (in order):**

| Priority | Source | Why | License |
|----------|--------|-----|---------|
| 1 | **Wikimedia Commons** | Primary source. All images commercially usable by policy (CC BY-NC rejected from platform). MediaWiki API, 50K req/hour. Search by scientific name. | CC BY, CC BY-SA, CC0, Public Domain |
| 2 | **Flickr Creative Commons** | Massive CC collection. Machine tags for scientific names. Geo-filtering to Australia. Requires Flickr Pro + commercial API key (~A$10/month). CC licenses are irrevocable. | Filter: `license=4,9,10,11` (CC BY, CC0, Public Domain, CC BY 4.0) |
| 3 | **CSIRO Science Image** | 12K+ images under CC BY. 60+ years of marine research photography. | CC BY ("© Copyright CSIRO Australia") |
| 4 | **iNaturalist** | cc-by/cc0 only (~10-20% of photos pass). Filtered with `&photo_license=cc0,cc-by,cc-by-sa`. | CC BY, CC0 only |

**Manual:**

| Priority | Source | Why | License |
|----------|--------|-----|---------|
| 5 | **GBRMPA Image Library** | GBR species. Requires registration. GBRMPA-owned material is CC BY 4.0. Third-party photographer images retain separate copyright — check each image. | CC BY 4.0 (GBRMPA-owned only) |
| 6 | **Photographer partnerships** | Highest quality, most targeted. Underwater Australasia (underwater.com.au), WAUPS, The Underwater Club, Facebook groups ("Marine Pixels", "Viz – Sydney Diving Visibility Reports"). Non-exclusive royalty-free license for credit + link. | Custom permission agreement |

**Realistic coverage estimate:** 60-75% of ~100 species covered in first 2-4 weeks from Wikimedia + Flickr + CSIRO. 70-85% at launch with photographer outreach. Hardest to find: Eastern Blue Groper (surprisingly sparse under open licenses despite being NSW state fish), endemic temperate species, specific small invertebrates (pipefish, gobies, blennies).

**Fallback waterfall for missing species:** Aquarium/captive photos from Wikimedia → closely related species with note → scientific illustration (Fiverr, A$20-50/species) → PhyloPic silhouette (CC0) + text description.

**Legal protection:** Record source URL, license, author, and date_accessed for every image used. Maintain a `/credits` page. Add a DMCA takedown process. CC licenses are irrevocable — save license metadata as audit trail.

### iNaturalist API: key endpoints

iNaturalist is the primary automated data source for shore dives. See [[inaturalist-report]] for the full technical spec including exact endpoints, parameters, response formats, and TypeScript code examples.

- **`/v1/observations/species_counts`** — the main workhorse. Returns deduplicated species list with observation counts for a lat/lng/radius query. 4 calls per location (split by marine taxon groups). Max 500 species per call.
- **`/v1/observations/histogram`** — monthly observation counts for seasonality. Use `interval=month_of_year`. Rate-limit to 30 req/min (more fragile than other endpoints).
- **`/v1/observations`** — individual records with photos. Use for photo harvesting with `&photo_license=cc0,cc-by,cc-by-sa` for commercial use. Cursor pagination via `id_above` for >10K results.
- **No marine filter exists** — must use curated taxon IDs. Tier 1 (exclusively marine): sharks/rays (47273), cephalopods (47459), nudibranchs (47113), cnidaria (47534), echinoderms (47549), sea turtles (372234), cetaceans (152871), seals (372843). Tier 2 (mixed, rely on coastal location): ray-finned fish (47178), crustaceans (85493), syngnathidae (49106).
- **Rate limits:** 100 req/min hard cap, recommend 60 req/min. Auth does not increase limits. ~3,750 API calls/month for 50 locations — well within daily limits.

**Taxon ID workflow:** Taxon IDs are NOT looked up separately. The `/species_counts` endpoint returns `taxon.id` for each species. Use these IDs directly in `/histogram` calls. Workflow: (1) species_counts → discover species + IDs, (2) histogram per species → get monthly distribution.

**Spatial parameters:** `lat` (float), `lng` (float), `radius` (km, default 10). Both `/species_counts` and `/histogram` accept identical geographic parameters. Radius search is a true circle (great-circle distance), not a bounding box.

**Coordinate precision for dive observations:** GPS doesn't work underwater — divers log position from the surface. Typical accuracy 50-200m. Observations without `positional_accuracy` should not be excluded.

**Additional gotchas:**
- `geoprivacy=open` may not work correctly on `/histogram` — omit it from histogram calls, use only on `/species_counts`
- `geo=true` ensures only georeferenced observations are returned

### ALA API: spatial query details

**Endpoint:** `GET https://biocache-ws.ala.org.au/ws/occurrences/search`

**Key query** (faceted species list, excluding iNat):
```
q=*:*&lat=-33.9917&lon=151.2314&radius=1.5
&fq=-data_resource_uid:"dr1411"
&fq=class:Actinopterygii OR class:Chondrichthyes
&facets=species&pageSize=0&flimit=500
&disableQualityFilter=spatial-suspect
```

**`spatial-suspect` filter — critical for marine queries:** ALA's default quality profile flags records outside expected land boundaries. Coastal/marine records get incorrectly flagged because ALA's coastline layers don't perfectly align. Always include `disableQualityFilter=spatial-suspect`.

**Coordinate precision:** Varies by source — citizen science GPS (5-50m), museum specimens geocoded from descriptions (1-10km), AIMS/CSIRO surveys (1-50m).

**Gotchas:**
- Parameter is `lon`, not `lng` — easy bug source vs iNaturalist
- `classs` has three s's in response JSON (Java reserved word)
- `eventDate` is Unix milliseconds, `month` is a string ("09")
- WKT uses longitude-first order (opposite to lat/lon params)
- Reptilia class is too broad for ALA class filters — includes terrestrial snakes/lizards. Don't add `class:Reptilia` to ALA queries. Marine reptiles (sea turtles, sea snakes) will come through from OBIS or iNat and pass WoRMS `marine_only=true` resolution; terrestrial reptiles will fail WoRMS lookup and get flagged for review
- No published rate limits — be conservative, cache aggressively

### OBIS API: spatial query details

**Endpoint:** `GET https://api.obis.org/v3/checklist`

**No point+radius support** — must use WKT bounding box via `geometry` parameter. Use the `pointToBBox` helper above.

**Key query:**
```
geometry=POLYGON((151.2179 -34.0052, 151.2449 -34.0052, 151.2449 -33.9782, 151.2179 -33.9782, 151.2179 -34.0052))
&taxonid=2&size=500
```

**Always include `taxonid=2` (Animalia)** — without this, results are overwhelmingly bacterial/microbial. With it, a typical coastal query returns ~780 animal species.

**Coordinate precision:** Variable — GPS surveys (10-100m), museum specimens (1,000-50,000m). OBIS stores original provider coordinates (not gridded).

**Gotchas:**
- WKT is longitude-first — getting this wrong returns empty results with no error
- Complex polygons trigger "geometry too complex" error — use simple bounding boxes
- No common/vernacular names — must cross-reference with WoRMS
- No images in OBIS data
- 8.7% of AU records flagged `ON_LAND` — many are legitimate near-shore
- Results include seabirds (gulls, terns) — these pass WoRMS `marine_only=true` and are kept. Marine-adjacent species are a feature, not a bug
- No month aggregation endpoint — seasonality requires querying `/v3/occurrence` and aggregating client-side
- `scientificName` is the WoRMS-accepted name — synonyms return nothing

### WoRMS API: taxonomy normalization

**Base URL:** `https://www.marinespecies.org/rest/`

**Purely taxonomic — no spatial queries.** WoRMS is the deduplication backbone:
1. Query iNat, ALA, OBIS for species at a location
2. Each source uses different taxonomy (iNat backbone, AU National Species List, WoRMS)
3. Resolve every species to a WoRMS AphiaID — the canonical marine taxonomy identifier
4. Merge records with the same AphiaID, sum observation counts
5. Use WoRMS for common names (especially OBIS records which lack them)

**Key endpoints:**
```
GET /AphiaIDByName/{scientificName}?marine_only=true
GET /AphiaRecordByAphiaID/{aphiaID}
GET /AphiaVernacularsByAphiaID/{aphiaID}
GET /AphiaRecordsByMatchNames?scientificnames[]={name}&marine_only=true
```

**OBIS already uses WoRMS AphiaIDs** — the `taxonID` field in OBIS checklist responses IS the WoRMS AphiaID. No additional resolution needed.

### Database schema

Designed to start sparse and be enriched incrementally. Every field tracks its source and status so you always know what needs work. Uses Supabase Auth for authentication — no password storage in the application schema. Supports multi-source data pipeline with per-record source attribution and WoRMS-based taxonomy deduplication.

```sql
-- ============================================================
-- REGIONS
-- ============================================================
CREATE TABLE regions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,                          -- e.g. "Sydney"
  country     TEXT NOT NULL DEFAULT 'Australia',
  slug        TEXT NOT NULL UNIQUE,                   -- URL segment, e.g. "sydney"
  description TEXT,                                   -- AI-generated, human-reviewed
  description_status TEXT DEFAULT 'draft'
    CHECK (description_status IN ('draft', 'reviewed', 'published')),
  hero_image_url TEXT,                                -- denormalized from photos.url WHERE is_hero = TRUE; updated by pipeline/admin
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
  name        TEXT NOT NULL,                          -- e.g. "Bare Island"
  aliases     TEXT[] DEFAULT '{}',                    -- alternate names for search/dedup
  slug        TEXT NOT NULL,
  lat         DOUBLE PRECISION,                      -- critical for data pipeline queries
  lng         DOUBLE PRECISION,
  radius_km   NUMERIC DEFAULT 1.5,                   -- pipeline search radius (1km shore, 2-5km offshore)
  coords_source TEXT,                                -- google_maps | manual | geocoded
  activities  TEXT[] DEFAULT '{}',                    -- {'snorkelling','diving','freediving'}
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  depth_min   NUMERIC,                               -- metres, nullable
  depth_max   NUMERIC,
  access_notes TEXT,                                  -- free text — parking, entry points, hazards, conditions etc. Not structured; include where known.
  description TEXT,                                   -- long-form guide, free & indexable for SEO
  description_source TEXT DEFAULT 'stub'
    CHECK (description_source IN ('stub', 'ai_draft', 'human', 'ai_reviewed')),
  description_status TEXT DEFAULT 'draft'
    CHECK (description_status IN ('draft', 'reviewed', 'published')),
  hero_image_url TEXT,                                -- denormalized from photos.url WHERE is_hero = TRUE; updated by pipeline/admin
  data_quality TEXT DEFAULT 'stub'
    CHECK (data_quality IN ('stub', 'partial', 'complete')),
    -- stub = just a name and region
    -- partial = has coords + basic info
    -- complete = ready to publish
  source      TEXT,                                   -- how we found this location
  published   BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,                        -- last data pipeline run
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
  name            TEXT NOT NULL,                      -- common name, e.g. "Weedy Seadragon"
  scientific_name TEXT UNIQUE,                        -- e.g. "Phyllopteryx taeniolatus"
  slug            TEXT NOT NULL UNIQUE,

  -- External IDs for multi-source deduplication
  inat_taxon_id   INTEGER,                           -- iNaturalist taxon ID
  worms_aphia_id  INTEGER,                           -- WoRMS canonical ID (universal join key)
  taxon_id_ala    TEXT,                               -- ALA species GUID

  -- Taxonomic hierarchy (populated from iNat/ALA/OBIS)
  kingdom         TEXT,
  phylum          TEXT,
  class           TEXT,
  "order"         TEXT,                               -- reserved word, must quote
  family          TEXT,
  genus           TEXT,

  -- Content
  summary         TEXT,                               -- 1-2 sentences, FREE tier, SEO-indexed
  deep_dive       TEXT,                               -- rich content, PREMIUM tier, not indexed
  deep_dive_status TEXT DEFAULT 'draft'
    CHECK (deep_dive_status IN ('draft', 'reviewed', 'published')),
  hero_image_url  TEXT,

  -- Filterable attributes for Species ID tool
  size_category   TEXT CHECK (size_category IN (
    'tiny',       -- shrimp/nudibranch
    'small',      -- hand-sized (blenny, seahorse)
    'medium',     -- forearm (leatherjacket, cuttlefish)
    'large',      -- arm-length (groper, octopus)
    'very_large'  -- body+ (shark, dolphin, turtle)
  )),
  colours         TEXT[] DEFAULT '{}',                -- {blue,green,spotted,striped,...}
  habitat         TEXT[] DEFAULT '{}',                -- {reef,sand,open_water,crevice,...}
  behaviour_tags  TEXT[] DEFAULT '{}',                -- {camouflaged,schooling,nocturnal,...}

  -- Enrichment (from FishBase/WoRMS/pipeline)
  max_length_cm       NUMERIC,                       -- FishBase: maximum recorded length
  depth_min_m         INTEGER,                        -- FishBase: depth range shallow
  depth_max_m         INTEGER,                        -- FishBase: depth range deep
  depth_common_min_m  INTEGER,                        -- FishBase: common depth range
  depth_common_max_m  INTEGER,
  habitat_type        TEXT,                           -- FishBase: reef-associated, pelagic, demersal
  iucn_category       TEXT,                           -- IUCN Red List category (LC, NT, VU, EN, CR)
  is_endemic          BOOLEAN,                        -- iNaturalist: scoped to preferred_place_id (Australia)
  is_native           BOOLEAN,                        -- iNaturalist: scoped to preferred_place_id (Australia)
  is_introduced       BOOLEAN,                        -- iNaturalist: scoped to preferred_place_id (Australia)
  is_charismatic      BOOLEAN DEFAULT FALSE,           -- manually flagged for homepage/sort priority

  data_quality TEXT DEFAULT 'stub'
    CHECK (data_quality IN ('stub', 'partial', 'complete')),
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_species_published ON species(published) WHERE published = TRUE;
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
  confidence      NUMERIC                             -- 0-1 composite score across all sources (NULL = not yet scored)
    CHECK (confidence >= 0 AND confidence <= 1),
  total_observations INTEGER DEFAULT 0,               -- sum across all sources
  observer_count  INTEGER,                            -- unique observers (better signal than raw count)
  first_observed_month SMALLINT CHECK (first_observed_month BETWEEN 1 AND 12),
  last_observed_month  SMALLINT CHECK (last_observed_month BETWEEN 1 AND 12),
  season_notes    TEXT,                               -- e.g. "mainly winter, May-Aug"
  verified        BOOLEAN DEFAULT FALSE,              -- has a human confirmed this?
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
-- Tracks where each location_species record came from.
-- A single species at a location may have records from iNat, ALA, and OBIS.
-- ============================================================
CREATE TABLE source_records (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_species_id UUID NOT NULL REFERENCES location_species(id) ON DELETE CASCADE,
  source              TEXT NOT NULL
    CHECK (source IN ('inaturalist', 'ala', 'obis', 'gbif', 'manual', 'community_report')),
  source_dataset      TEXT,                           -- e.g. "AIMS LTMP", "CSIRO ANFC"
  observation_count   INTEGER DEFAULT 0,
  basis_of_record     TEXT,                           -- HUMAN_OBSERVATION, PreservedSpecimen, etc
  license             TEXT,                           -- per-record license from source
  last_queried        TIMESTAMPTZ,
  raw_response        JSONB,                          -- store raw for debugging/audit
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
  raw_observation_count   INTEGER,                    -- from histogram endpoint
  normalized_frequency    NUMERIC,                    -- deferred: effort normalization added later if raw data proves misleading
  total_effort_that_month INTEGER,                    -- deferred: baseline effort for normalization (not used at launch)
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
  slug            TEXT NOT NULL UNIQUE,               -- /photographers/tom-park
  bio             TEXT,
  website_url     TEXT,
  instagram_url   TEXT,
  youtube_url     TEXT,
  referral_code   TEXT UNIQUE,                        -- unique code for affiliate tracking
  profile_image_url TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHOTOS
-- Uses separate nullable FKs instead of polymorphic entity_type/entity_id
-- to preserve referential integrity.
-- ============================================================
CREATE TABLE photos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url               TEXT NOT NULL,                    -- self-hosted URL (never hotlink)
  alt_text          TEXT,
  photographer_name TEXT NOT NULL,                    -- required for attribution
  photographer_id   UUID REFERENCES photographers(id) ON DELETE SET NULL,
  license           TEXT NOT NULL,                    -- cc_by, cc_by_sa, cc0, all_rights_granted, etc
  license_url       TEXT,                             -- link to license deed
  source            TEXT NOT NULL
    CHECK (source IN ('wikimedia', 'flickr', 'inaturalist', 'csiro', 'gbrmpa',
                      'partner', 'commissioned', 'community')),
  source_url        TEXT,                             -- original URL for audit trail
  date_accessed     DATE,                             -- when license was verified
  inaturalist_obs_id INTEGER,                         -- links back to iNat observation (nullable)

  -- Polymorphic FKs replaced with two nullable columns + CHECK
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  species_id        UUID REFERENCES species(id) ON DELETE SET NULL,
  is_hero           BOOLEAN DEFAULT FALSE,            -- source of truth for hero image; entity hero_image_url is a denormalized cache

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
-- USERS (extends Supabase auth.users — NO password storage)
-- Supabase Auth manages email, password, OAuth providers.
-- This table stores application-specific user data only.
-- ============================================================
CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT,
  has_purchased_id    BOOLEAN DEFAULT FALSE,          -- one-off Species ID tool purchase
  stripe_customer_id  TEXT,
  stripe_payment_id   TEXT,                           -- one-off payment intent ID
  referred_by         TEXT,                           -- photographer referral_code (nullable)
  favourite_locations UUID[] DEFAULT '{}',            -- saved location bookmarks
  notification_prefs  TEXT DEFAULT 'email'
    CHECK (notification_prefs IN ('email', 'push', 'none')),
  is_admin            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SPECIES_ALERTS (opt-in per species + location)
-- "Notify me when weedy seadragons are in season at Cabbage Tree Bay"
-- Free for all authenticated users.
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
-- SIGHTINGS (dive log + species checklist)
-- Each row = "I saw this species at this location on this date"
-- Powers: personal dive log, species checklist per location,
-- and future community sighting counts.
-- ============================================================
CREATE TABLE sightings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id          UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  location_id         UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  sighted_at          DATE NOT NULL DEFAULT CURRENT_DATE,  -- when they saw it
  quantity            INTEGER DEFAULT 1,                   -- how many seen (default 1)
  notes               TEXT,                                -- optional personal notes
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sightings_user ON sightings(user_id);
CREATE INDEX idx_sightings_user_location ON sightings(user_id, location_id);
CREATE INDEX idx_sightings_location_species ON sightings(location_id, species_id);  -- for future community counts

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

-- Auto-update updated_at on all tables
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
-- PURCHASE GATING FUNCTION
-- One-off purchase unlocks: Species ID tool + species deep dives.
-- ============================================================
CREATE OR REPLACE FUNCTION has_purchased()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND has_purchased_id = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Returns deep_dive content only for users who have purchased.
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

-- Enable RLS on all tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_seasonality ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_alerts ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ: published content visible to everyone (anon + authenticated)
CREATE POLICY "Public read published regions" ON regions FOR SELECT USING (published = TRUE);
CREATE POLICY "Public read published locations" ON locations FOR SELECT USING (published = TRUE);
CREATE POLICY "Public read published species" ON species FOR SELECT USING (published = TRUE);
CREATE POLICY "Public read location_species" ON location_species FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM locations l JOIN species s ON TRUE
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

-- USERS: own row only
CREATE POLICY "Users read own row" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own row" ON users FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- SIGHTINGS: own sightings only (for now — community counts added in Phase 4)
CREATE POLICY "Users read own sightings" ON sightings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sightings" ON sightings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sightings" ON sightings FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sightings" ON sightings FOR DELETE USING (auth.uid() = user_id);

-- SPECIES_ALERTS: own alerts only
CREATE POLICY "Users read own alerts" ON species_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alerts" ON species_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alerts" ON species_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own alerts" ON species_alerts FOR DELETE USING (auth.uid() = user_id);

-- SERVICE ROLE: full access for admin/pipeline operations (bypasses RLS by default)
```

### Bootstrapping: seed script

Before the pipeline can run, the database needs at least one region and one location. A seed SQL script (`scripts/seed-cabbage-tree-bay.sql`) inserts the Sydney region and Cabbage Tree Bay location stub:

```sql
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
```

Run once after migration. Phase 2 adds more locations via bulk seed scripts or admin UI.

### Data pipeline workflow

The pipeline orchestrator accepts a **single location ID** and runs the full pipeline for that location. In Phase 1 this is triggered via CLI script (`scripts/run-pipeline.ts --location cabbage-tree-bay`). Phase 2 adds bulk "run all locations" and admin dashboard triggers.

**Adding locations at scale (Phase 2+):**
1. **Add a new region** — AI researches location list → bulk insert as stubs (name, region, coords, activities, source, data_quality=stub)
2. **Enrich locations** — AI generates descriptions, access notes from web sources → status=draft, data_quality=partial

**Per-location pipeline (runs for each location):**
1. **Pull species (multi-source):**
   - iNaturalist `/species_counts` — 4 calls per location (by taxon group)
   - ALA faceted search — 1 call per location (excluding iNat via `fq=-data_resource_uid:"dr1411"`)
   - OBIS `/checklist` — 1 call per location (WKT bounding box)
   - Deduplicate by normalized scientific name → resolve to WoRMS AphiaID
   - Calculate composite confidence score per species-at-location
   - Upsert into `location_species` + `source_records` tables
2. **Pull seasonality** — iNaturalist `/histogram` per species per location. Classify months by raw count relative to the species' own annual pattern at that location: months with counts above the species' monthly average = "common", below average but non-zero = "occasional", zero observations = "rare". Skip months where total site observations are very sparse (<3) — mark as "no data" rather than trying to normalise. ALA month facets as supplement. Store in `species_seasonality` with raw counts. Effort normalisation (dividing by total observer activity) is deferred — it doubles API calls, produces noisy results at low observation counts, and the species' own seasonal presence/absence is a stronger signal than observer bias for the charismatic species users care about. Add it later if raw data proves misleading.
3. **Pull photos** — Automated pipeline in order: Wikimedia Commons API (by scientific name) → Flickr CC API (cc-by, cc0, public domain) → CSIRO Science Image (CC BY) → iNaturalist (`&photo_license=cc0,cc-by,cc-by-sa`, ~10-20%). Manual: GBRMPA Image Library (requires registration, check per-image), photographer partnerships (outreach). Download to Supabase Storage. Store metadata + license audit trail in `photos` table.
4. **Enrich species** — AI generates deep dive content and assigns filterable attributes. FishBase parquet files for depth range, max size, habitat type. WoRMS for authoritative common names. → status=draft

   **Filterable attribute status:**
   - **`size_category`** — LOCKED IN. Derived from FishBase `max_length_cm` (reliably available) mapped to 5 buckets: tiny (<5cm), small (5-15cm), medium (15-40cm), large (40-100cm), very_large (>100cm). Not from API data — AI/human judgment informed by max length.
   - **`colours`** — LOCKED IN. Assigned by AI from photos + species descriptions. Vocabulary: blue, green, yellow, orange, red, brown, black, white, grey, silver, spotted, striped. These are what a casual snorkeller remembers. May add 1-2 more (e.g., translucent for jellyfish) but the palette is stable.
   - **`habitat`** — LOCKED IN. Assigned by AI, informed by FishBase `habitat_type` (reef-associated → reef, pelagic → open_water, demersal → rocky_bottom/sand). Vocabulary: reef, sand, open_water, surface, crevice, seagrass, rocky_bottom, kelp. User-friendly translations of scientific habitat categories.
   - **`behaviour_tags`** — DEFERRED. No API returns behaviour data directly — entirely AI-generated from species descriptions. Don't define the tag vocabulary until after the first pipeline run for Cabbage Tree Bay. Populate what's obvious (schooling, nocturnal, camouflaged are likely candidates), then review coverage across species. Only add corresponding Species ID tool filter steps for tags with >80% coverage across species.
5. **Human review** — review and publish. Only published + complete items appear on the site.
6. **Data refresh:** Species lists at dive sites are stable — the same species have been at Bare Island for decades. Don't automate re-pulls at launch. Run the pipeline once per location at setup, then re-pull manually when expanding to new locations or when you want to refresh data. Consider a quarterly batch refresh across all locations once you have 50+ sites, just to catch new species records. Automate cron-based re-pulls only when there's evidence the data drifts enough to justify the complexity.

**API call budget (50 locations):** iNat species counts: ~200 calls/week. iNat seasonality: ~2,500 calls/month. ALA: ~50 calls/month. OBIS: ~50 calls/quarter. Photos: ~1,000 calls/month. Total: ~3,800/month — well within all rate limits.

### Verified example API calls (Bare Island, Sydney)

Location: lat=-33.9917, lng=151.2314, radius=1.5 km

**iNaturalist — species list:**
```
https://api.inaturalist.org/v1/observations/species_counts?lat=-33.9917&lng=151.2314&radius=1.5&taxon_ids=47178,47273&quality_grade=research&geoprivacy=open&per_page=500&locale=en&preferred_place_id=6744
```

**iNaturalist — seasonality (Weedy Seadragon, taxon_id from species_counts):**
```
https://api.inaturalist.org/v1/observations/histogram?lat=-33.9917&lng=151.2314&radius=1.5&taxon_id=54536&quality_grade=research&date_field=observed&interval=month_of_year
```

**ALA — species list (excluding iNat):**
```
https://biocache-ws.ala.org.au/ws/occurrences/search?q=*:*&lat=-33.9917&lon=151.2314&radius=1.5&fq=-data_resource_uid:"dr1411"&facets=species&pageSize=0&flimit=500&disableQualityFilter=spatial-suspect
```

**OBIS — species checklist:**
```
https://api.obis.org/v3/checklist?geometry=POLYGON((151.2179 -34.0052, 151.2449 -34.0052, 151.2449 -33.9782, 151.2179 -33.9782, 151.2179 -34.0052))&taxonid=2&size=500
```

**WoRMS — resolve species name to AphiaID:**
```
https://www.marinespecies.org/rest/AphiaIDByName/Achoerodus%20viridis?marine_only=true
```

### API comparison summary

| Feature | iNaturalist | ALA | OBIS | WoRMS |
|---------|-------------|-----|------|-------|
| Spatial query | Point+radius | Point+radius | WKT only | None |
| Coord system | WGS84 | WGS84 | WGS84 | N/A |
| Lng param | `lng` | `lon` | N/A | N/A |
| Species list endpoint | `/species_counts` | `/occurrences/search` + facets | `/v3/checklist` | N/A |
| Seasonality | `/histogram` | Month facets | Manual aggregation | N/A |
| Auth required | No | No | No | No |
| Rate limit | 100/min (hard), 60 rec. | None published | None published | None published |
| Common names | Yes | Yes | No | Yes |
| Photos | Yes | Some | No | No |
| Marine filter | Taxon IDs | Class filter | Marine by default | Marine by default |
| Taxonomy | iNat backbone | AU National Species List | WoRMS AphiaID | WoRMS AphiaID |

The `data_quality` and `*_status` fields are what let you ship a region before it's perfect — publish the locations that are ready, keep working on the rest. You always know exactly what's missing.

---

## 2. Tech Stack

Moving off Notion/Super.so. What to build with.

### Website — DECIDED
- **Frontend:** Next.js (React)
- **Database + Auth:** Supabase (Postgres) — email/password + Google, Apple, Facebook social login
- **Hosting:** Vercel
- **Maps:** Mapbox — 50K free map loads/month, bathymetry data for reef visualisation, superior React ecosystem (`react-map-gl` + Supercluster), PWA tile caching possible. See [[research-tech-stack-decisions]] for full rationale.
- **Search:** Supabase Full-Text Search + `pg_trgm` — dataset too small for a dedicated search engine. Migrate to Algolia later if needed (official Supabase connector exists). See [[research-tech-stack-decisions]] for full rationale.

### Mobile App — DECIDED
- **PWA first.** Responsive website with progressive web app capabilities. Native app deferred to Phase 4+ once there's traction.

### Services to integrate

**Phase 1 — Data pipeline (batch, server-side):**
- **iNaturalist API:** Primary species + seasonality source for shore dives. See [[inaturalist-report]].
- **ALA API** (`biocache-ws.ala.org.au`): Supplementary species data from AIMS, CSIRO, museums. Best offshore coverage. See [[supplementary-api-sources]].
- **OBIS API** (`api.obis.org`): Marine-specific checklist endpoint. WoRMS-validated taxonomy. See [[supplementary-api-sources]].
- **WoRMS API** (`marinespecies.org/rest`): Taxonomy normalization — resolve all species to canonical AphiaIDs for cross-source deduplication.
- **Wikimedia Commons API** (`commons.wikimedia.org/w/api.php`): Primary photo source — all images commercially usable. 50K req/hour.
- **Flickr API:** Secondary photo source — filter by CC commercial licenses. Requires Pro account + commercial API key.

**Phase 1 — Application services:**
- **Species ID:** No external API needed — pure database filtering on species attributes (size, colour, habitat). Like Merlin Bird ID.
- **Auth:** Supabase Auth (email/password + Google social login) — needed for dive logging and species alert opt-ins.
- **Mapbox:** Maps on location pages. 50K free map loads/month.
- **Email:** Resend — free tier (3K emails/month), first-class Supabase SMTP integration, React Email templates. Needed for "In Season Now" alert emails. See [[research-tech-stack-decisions]].

**Phase 2 — Enrichment:**
- **FishBase/SeaLifeBase:** Species enrichment (depth, habitat, size). Parquet files via DuckDB.
- **Google Places:** For location details, photos, reviews context.

**Phase 3 — Monetisation:**
- **Payments:** Stripe for one-off Species ID tool purchase (A$9.99, single payment intent, not recurring).
- **Affiliate tracking:** Rewardful Starter ($49/month) — Stripe integration for one-off purchase attribution. See [[research-tech-stack-decisions]].

**Phase 4+:**
- **Push notifications:** Deferred (native app).

**Decided:** Next.js + Supabase + Vercel + Mapbox + Supabase FTS + Resend. Multi-source data pipeline from Phase 1 (iNat + ALA + OBIS + WoRMS). Multi-source photo pipeline (Wikimedia + Flickr + photographer partnerships). PWA first, native app deferred. Solo dev. Design via Claude /design. **$0/month at launch** (all free tiers) — Stripe (one-off A$9.99 purchase) and Rewardful deferred to Phase 3. See [[research-tech-stack-decisions]] and [[pricing-affiliate-strategy]] for full rationale.

---

## 3. Core Features

### Phase 1 — Cabbage Tree Bay
1. **Cabbage Tree Bay location page** — description, species list with summaries, map, access notes, depth, skill level. Free.
2. **Species pages** — name, photo, summary, which locations you can find it. Free and indexable for SEO.
3. **Species ID tool** — the Merlin-style stepped form. **Free at launch; gated behind one-off purchase in Phase 3 once Stripe is integrated.** This is the core monetisation. Scrolling through 50+ species to find what you saw is friction — the ID tool removes it. Impulse-buy at the beach. Purchase also unlocks species deep dives (behaviour, fun facts, ID tips, conservation status) — the curiosity gap drives conversion.
4. **Dive/sighting log + species checklist** — authenticated users record what they saw, where, when, how many, and optional notes. Each sighting row records a quantity count (e.g., "saw 3 cuttlefish") and an optional note (e.g., "under the ledge on the north side"). Notes appear on the trip detail page as extra context per species. Personal log history. Species collection mechanic: check off species as you see them, track progress per location ("12 of 47 species seen at Cabbage Tree Bay"). Like Pokémon — gotta find them all. Free. This is the retention loop. The sighting log powers the shareable trip report.
   - **Shareable trip reports** — after logging a session, generate a shareable link/card: "Ben saw 8 species at Cabbage Tree Bay on April 11" with species thumbnails and checklist progress. Trips are grouped by (user_id, location_id, sighted_at date) — no separate trips table needed. The shareable link uses a composite key or hash of those three fields. The shareable link (e.g., `/trips/abc123`) opens a full trip detail page on the site — this is the growth loop that brings people to Salt Safari. The link preview (OG image) is dynamically generated to show: species hero photos in a grid, quantity per species (e.g., "3x Cuttlefish"), location name, date, and checklist progress. Generated server-side via Next.js OG image generation (`next/og` / `ImageResponse`) at 1200×630px (standard OG) with a square 1080×1080px variant for Instagram. The preview image is what makes people tap — it needs to look good in iMessage, WhatsApp, Instagram DMs, and Facebook Messenger link previews. Anyone who taps the link lands on the site with full context. This is the organic growth loop — no referral reward needed, the share itself is the product. People already post this stuff; give them a beautiful format for it.
5. **User profile pages** — public profile at `/u/[username]` showing the user's dive history: list of trips (location, date, species count), total species spotted across all locations, and Spotted grid progress per location. All trips are public. Profile is the user's "dive CV" — motivates logging and sharing.
7. **"In Season Now" alerts** — free, opt-in per species + location. Users pick charismatic species they care about (e.g. "notify me when weedy seadragons are at Cabbage Tree Bay"). Email notification when their favourites come into season. Free growth engine that creates the moment where someone is most likely to buy the ID tool. At launch, "in season" is determined by API seasonality data (iNaturalist histogram — years of historical observations). As user sighting volume grows (Phase 4+), supplement or replace with real-time signals from user-logged sightings ("3 people spotted weedy seadragons at Cabbage Tree Bay this week"). The `species_seasonality` table stores the API baseline; the `sightings` table provides the real-time layer later.
8. **"Spotted" — species collection grid per location** — Each location has a visual grid of all species known to appear there. Species the user hasn't logged yet appear as desaturated, darkened near-silhouettes (using the species hero image with a CSS filter). When a user logs a sighting at that location, the species card reveals in full colour. Tapping any species opens its detail page. Progress shown as "12 of 47 spotted at Cabbage Tree Bay." This is the core collection/gamification mechanic — like Pokemon, gotta spot them all. Requires authentication (sightings are per-user). Works alongside the sighting log — logging a sighting automatically updates the Spotted grid.

### Species ID tool

A step-by-step form (like Merlin Bird ID) that narrows down what you saw:
- Step 1: **Where did you see it?** — pick a location or region (narrows to species known at that site). Pre-fills from browser geolocation (nearest location) or `?location=slug` query param if linked from a location page. Editable.
- Step 2: **When?** — date picker (narrows by seasonality). Pre-fills to today's date/current month. Editable.
- Step 3: **How big was it?** — silhouette scale from shrimp-sized up to dolphin-sized
- Step 4: **What colours?** — multi-select colour grid (select 1-3)
- Step 5: **Where was it?** — on the reef, in sand, open water, on the surface, in a crevice, on the bottom

Results show ranked matches with photos. No LLM needed — it's pure database filtering. Each answer narrows the candidate list; location + season alone gets you most of the way. Works offline, no API costs, instant results.

**Data-driven question evolution:** The current 5 steps (location, when, size, colour, habitat) are the baseline. Additional filter steps should be added as the species data supports them:
- If schooling/solitary behaviour data is reliably available, add a "Was it alone or in a group?" step
- If distinctive markings data is available, add pattern recognition options
- The `behaviour_tags` column on the species table (e.g., `{schooling, nocturnal, camouflaged}`) enables this — populate it during species enrichment and add corresponding ID tool steps
- Review what attributes are reliably populated across species after the first pipeline run, and add filter steps for any attribute with >80% coverage

### Phase 2 — Expand locations
9. **Browse locations by region** — map + list view, filterable by activity (snorkelling/diving), skill level
10. **All location pages** — Sydney + Central Coast locations with species data
11. **Search & filter** — by species, region, activity type

### Monetisation — One-off purchase (Phase 3)

**What you get:** Species ID tool + species deep dives. Pay once, use forever.

**Pricing:** One-off purchase, A$9.99. No recurring billing. All prices GST-inclusive.

**Cabbage Tree Bay is always free.** All premium features (Species ID tool, species deep dives) are permanently free for Cabbage Tree Bay. This is the flagship location — it drives SEO, word-of-mouth, and demonstrates the product. The paywall only applies when users access premium features for other locations.

**Free vs paid:**
| | Free (all locations) | Free (Cabbage Tree Bay only) | Paid (one-off, other locations) |
|---|---|---|---|
| Location pages, species lists, summaries | Yes | Yes | Yes |
| Dive/sighting log + species checklist | Yes | Yes | Yes |
| "In Season Now" alerts | Yes | Yes | Yes |
| **Species ID tool** | — | **Always free** | **Gated in Phase 3** |
| **Species deep dives** (behaviour, fun facts, ID tips, conservation) | No — see teaser + "unlock" CTA | **Always free** | **Yes** |

**Why one-off:**
- No subscription fatigue — people don't want another monthly charge for something they use a few times a year
- Impulse-buy friendly — someone at the beach who just saw something cool will pay A$9.99 right now
- Simpler to build — no recurring billing, no churn management, no failed payment emails
- Simpler affiliate attribution — one conversion event, not tracking recurring for 12 months

**Affiliate commissions:** Photographers earn a percentage of one-off purchases driven through their referral links. Each photographer gets a unique referral code. Clean, single-event attribution.

**Why this works:**
- Two curiosity gaps working together: "what did I just see?" (ID tool) and "tell me more about it" (deep dive)
- The free species list is genuinely useful but creates friction — scrolling through 50+ species to match what you saw
- The ID tool removes that friction with a guided 5-step wizard
- Species pages show a teaser summary for free → "unlock the full story" CTA for the deep dive
- Natural upsell moments everywhere: browse species list → ID tool CTA. Read summary → deep dive CTA. Log a sighting → "learn more about what you saw" CTA.
- "In Season Now" alerts (free) drive engagement → user goes snorkelling → sees something → buys to ID it and learn about it
- Photographers promote: "use this to ID what you just saw" — more natural than asking someone to commit to a membership
- The species checklist creates ongoing engagement — users keep coming back to find more species, and each new sighting is another moment where they want the ID tool and deep dives

### Phase 4+ features (in priority order)
- **Community sighting counts** — see how many others have logged each species at a location. Social proof + competition ("only 3 people have spotted a pygmy pipehorse here").
- Community species sightings/reports ("spotted this week" feed)
- Dive shop directory — linked to locations they service, with tracked outbound links. Only worth building once you have enough traffic that shops want to be listed.
- Gear recommendations (affiliate revenue)
- Trip planning tools

### Why NOT conditions-based features
Real-time "good conditions now" recommendations are tempting but dangerous. You'd need to know the ideal wind direction, swell window, and recent rainfall impact for every site — data that locals work out through years of experience and Facebook groups. Visibility data simply isn't available via API. One bad recommendation and trust is destroyed. Leave conditions advice to the community; focus on species knowledge where you can be authoritative.

---

## 4. SEO Strategy

This is make-or-break for organic growth. Your existing SEO thinking is solid — here's how to execute it properly on a custom site.

### URL structure for long-tail keywords
```
/locations/                             → Regions index (browse all regions)
/locations/sydney/                      → "snorkelling in Sydney" / "diving in Sydney"
/locations/sydney/bare-island/          → "Bare Island snorkelling" / "Bare Island scuba diving"
/species/weedy-seadragon/               → "weedy seadragon"
/species/weedy-seadragon/sydney/        → "weedy seadragon Sydney"
/id/                                    → "identify marine species"
/best/snorkelling/sydney/               → "best snorkelling spots in Sydney"
/locations/sydney/bare-island/           → species collection state shown inline for authenticated users (no separate /spotted route)
```

Locations use a single canonical URL (`/locations/region/place/`) with activity type as a filter/tag on the page — not separate URLs per activity. This avoids duplicate content. The location page itself mentions both snorkelling and diving where applicable, capturing both search terms.

### Content strategy
- **Location guides** (1000-2000 words each): access, what to expect, best time to go, species highlights. Free and fully indexable. These rank for "[place] snorkelling" searches.
- **Species pages:** free summary (indexable) + deep dive behind paywall (not indexed). Free summary ranks for "[species] diving" searches and acts as a teaser for the paid deep dive.
- **"Best of" listicles:** "Best snorkelling spots in Sydney", "Where to see seahorses in NSW". High search volume, linkable. Generated from the database.
- **Seasonal content:** "What marine life to see in Sydney in winter" etc.

### SEO and the paywall
Google cannot index gated content, but the paid features are a tool (Species ID) and extended content (deep dives) — the SEO workhorses are all free.
- Location pages: **fully free and indexable** — these are your SEO workhorses
- Species pages: **free summary (indexable) + deep dive behind paywall (not indexed)** — Google indexes the summary, users see enough to trigger the curiosity gap
- Species ID tool: the `/id/` landing page and tool functionality are both **free and indexable** during Phase 1-2 (ranks for "identify fish" type queries). Gated behind one-off purchase in Phase 3 once Stripe is integrated. Use `isAccessibleForFree` structured data.
- "In Season Now" alerts: **free, requires an account, opt-in per species + location** — not indexable by nature but drives return visits and engagement

### Technical SEO
- Server-side rendering (Next.js handles this)
- Structured data / Schema.org markup (LocalBusiness, TouristAttraction)
- Fast page loads (target < 2s)
- Mobile-first design
- XML sitemap auto-generation
- New Google Search Console setup
- Canonical URLs on all pages to prevent duplicate content

### Backlinks
- Your existing ideas are good: UTS (.edu), Australian Geographic
- Add: local council tourism pages, PADI/SSI dive shop directories, travel bloggers
- Guest posts on diving/travel blogs
- Get listed on "best diving websites" roundups

---

## 5. Marketing & Growth

### Affiliate partnerships with marine photographers (your core strategy)
This is smart. Here's how to structure it:

- **Identify targets:** Marine photographers/videographers with YouTube, Instagram, TikTok followings. Tom Park is already on your list. Others: underwater photography communities, popular dive vloggers.
- **Value exchange:** They earn commission on Species ID tool purchases driven through their referral links + their photos are credited and linked on the platform. You get content + their audience.
- **How it works technically:** Each photographer gets a unique referral code. When users visit via their link and purchase the ID tool, the photographer earns a one-off commission. Use a platform like Rewardful or FirstPromoter to manage this.
- **Why this works now:** The ID tool purchase is a clean conversion event. Unlike dive shop click-throughs (low value, hard to attribute), it's easy to track and natural for photographers to promote ("use this to ID what you just saw").
- **Content collab:** Photographers contribute location photos + species photos. They get a profile page on your site ("Photos by Tom Park") with links to their socials. Their content enriches species pages. Win-win.

### Other growth channels
- **SEO** (detailed above) — your primary long-term channel
- **Social media:** Instagram (underwater photos are incredibly shareable), TikTok (short species ID clips), YouTube (location guides)
- **Reddit:** r/scuba, r/snorkeling, r/diving, r/sydney — be helpful, not spammy
- **Facebook groups:** Diving/snorkelling community groups (you've noted this)
- **Discord community:** Already exists — nurture it
- **Product Hunt launch:** James can help. Time it with the custom site launch, not the Notion version
- **Local dive shop partnerships:** They promote you in-store/online, you send them customers. Tracked with affiliate links.
- **Email newsletter:** "What's been spotted this week" — builds retention, gives photographers something to contribute to

---

## 6. Revenue Model

### Primary: One-off purchase — Species ID tool + deep dives (Phase 3)
The core revenue stream and the conversion event that powers affiliate marketing. Pay once, use forever. Unlocks both the Species ID tool and all species deep dives. A$9.99. Revenue per purchase after GST: ~A$9.08. No app store commission (PWA). No recurring billing complexity.

**Funnel:** Two curiosity gaps working together. (1) Free species list creates friction (too many to scroll through) → ID tool CTA. (2) Free species summary teases the deep dive → "unlock the full story" CTA. "In Season Now" alerts (free) drive users to go snorkelling → they see something → want to ID it and learn about it → purchase.

### Secondary: Photographer affiliate commissions drive growth, not revenue
Photographers earn a percentage of one-off ID tool purchases driven through their referral links. This is a cost, not a revenue stream — but it's the growth engine. Simpler than recurring commission tracking — one conversion event per user.

### Additional revenue streams (once you have traffic)
- **Dive shop directory listings** — free basic listing, paid for premium placement / featured status. Only worth pursuing once traffic justifies it to shop owners.
- **Gear affiliate links** — recommendations on species/location pages (Amazon, dive retailers)

### Future (with scale)
- **Sponsored content** — tourism boards, dive equipment brands
- **Dive trip/course bookings** — commission on bookings
- **Data licensing** — aggregated seasonality/species data for research or tourism

---

## 7. Build Sequence

### Phase 1: One Beach, Done Right (weeks 1-4)
Scope: **Cabbage Tree Bay Aquatic Reserve only.** Build the full multi-source data pipeline and refine it against one location until the species list, confidence scores, deduplication, seasonality, and photos are all working correctly. Cabbage Tree Bay is the test case — if the pipeline produces a good result here, it scales to every other location.

- [x] Set up repo, Next.js + Supabase project (done — Next.js 15, Supabase client, Tailwind, Motion configured)
- [ ] Run database migration SQL (schema, RLS policies, triggers, helper functions)
- [ ] Run seed script — insert Sydney region + Cabbage Tree Bay location stub (`scripts/seed-cabbage-tree-bay.sql`)
- [ ] Set up Supabase Auth (email/password + Google social login)
- [ ] Build iNaturalist pipeline script — species counts + seasonality for Cabbage Tree Bay
- [ ] Build ALA pipeline script — faceted species search, iNat exclusion via `fq=-data_resource_uid:"dr1411"`
- [ ] Build OBIS pipeline script — `/checklist` endpoint, WKT bounding box for Cabbage Tree Bay
- [ ] Build WoRMS taxonomy resolver — AphiaID lookup + cache for cross-source deduplication
- [ ] Build multi-source orchestrator — CLI script (`scripts/run-pipeline.ts --location cabbage-tree-bay`) that queries all sources for a single location, deduplicates by scientific name → WoRMS AphiaID, flags unresolved species for review, calculates composite confidence scores, upserts to database
- [ ] Build photo pipeline — Wikimedia Commons (primary) + Flickr CC (cc-by, cc0, public domain) + CSIRO Science Image (CC BY) + iNat (cc-by/cc0 only, ~10-20%) for Cabbage Tree Bay species, download to Supabase Storage, store license audit trail
- [ ] **Validate pipeline output against local knowledge** — review species list, flag false positives/negatives, tune confidence thresholds, check seasonality against what locals actually see
- [ ] **Log pipeline learnings** — document API quirks, tuning decisions, and gotchas in `docs/19-pipeline-learnings.md` as they're discovered. This is the institutional memory that makes Phase 2 scaling smooth.
- [ ] Build Cabbage Tree Bay location page (description, species list, map, access notes)
- [ ] Build species pages for species found at Cabbage Tree Bay
- [ ] Wire Species ID tool to real Supabase data (UI already built at `src/app/id/page.tsx`) — free access during Phase 1-2, gated behind purchase in Phase 3
- [ ] Build dive/sighting log + species checklist — users record what they saw, where, and when. Track species collection per location ("12 of 47 seen"). `sightings` table.
- [ ] Build shareable trip reports — after a session, generate a shareable link/card with species seen, location, date, checklist progress. OG image for social previews. Organic growth loop.
- [ ] Build species collection state into location page Species tab — progress bar ("12 of 47 spotted"), checkmark badges on spotted species cards, sign-up CTA for unauthenticated users
- [ ] Build "In Season Now" alert opt-ins — users pick charismatic species + location to be notified about (free, requires auth). `species_alerts` table.
- [ ] Build alert email system — Supabase Edge Function cron, Resend API, React Email templates. Sends when opted-in species come into season.
- [ ] Design and visual polish — use Claude's `/design` frontend design skill for all page builds
- [ ] Deploy to Vercel, point saltsafari.app DNS
- [ ] Basic SEO: meta tags, structured data, sitemap

### Phase 2: Expand Locations + Enrich (weeks 5-8)
The pipeline is proven on Cabbage Tree Bay — now run it across all Sydney + Central Coast locations.

- [ ] Run multi-source pipeline across all locations, spot-check results
- [ ] FishBase enrichment import — download parquet files, import depth/habitat/size data via DuckDB
- [ ] Implement search and filtering (Supabase FTS + pg_trgm)
- [ ] Build core pages: home, region listing, all location pages
- [ ] Add Mapbox maps to all location pages
- [ ] Start writing species deep dive content (this is slow — start early)
- [ ] Build admin dashboard (`/admin`) — overview stats, locations/species/photos tables with filters, pipeline trigger buttons, content status management
- [ ] Set up Google Search Console
- [ ] Privacy policy, terms of service, cookie consent
- [ ] DMCA/takedown process page (for photo licensing disputes)

### Phase 3: Monetise + Launch (weeks 9-12)
- [ ] Stripe integration for one-off Species ID tool purchase (connect to Supabase Auth, set `has_purchased_id` flag)
- [ ] Gate Species ID tool behind purchase (free users see CTA, purchasers get full access)
- [ ] Set up affiliate tracking (Rewardful/FirstPromoter) for photographer partnerships — commission on one-off purchases
- [ ] Reach out to first photographer partners
- [ ] Soft launch to Discord community for feedback
- [ ] Product Hunt + Reddit + Facebook group launch

### Phase 4: Growth (weeks 13+)
- [ ] Onboard more photographer affiliates
- [ ] Community species sightings
- [ ] Referral program (refer a friend, both get a discount on purchase)
- [ ] Push notifications (mobile)
- [ ] Mobile app (React Native)
- [ ] Expand to new regions (run data pipeline per region)

---

## 7b. Page Designs

What each page looks like — section order, layout, and key UI components. All pages use the Pelagic design system (Fraunces display headings, Outfit body text, deep navy / sand / teal / coral palette). Mobile-first. The homepage, Species ID wizard, and Header are already built as prototypes; the designs below are the target for all pages.

### Homepage `/`
Already built (`src/app/page.tsx`). Sections top to bottom:
1. **Hero** — full-viewport dark gradient with caustic light overlay. Headline, subtitle, quick stats (species / locations / regions count). Wave SVG divider into sand background. Search bar deferred to Phase 2.
2. **In Season Now** — 1 row (3 cards mobile, 4-5 desktop). Shows only species local to the user (browser geolocation API; fallback to most popular region). Small region selector once multiple regions exist. Three-tier priority fill: (1) seasonal + charismatic + in season now → pulsing green "In season" badge, (2) seasonal + in season now → green badge, (3) charismatic year-round residents as backfill → "Year-round" pill, no green dot. Tiebreaker within tiers: alert opt-in count, then daily-seeded shuffle (deterministic random using current date as seed — same cards all day, different tomorrow; preserves CDN/ISR caching). Each card: species hero photo, badge/pill, species name, location, months. Links to species page. "Get alerts" link.
3. **Explore by Region** — 2-col grid of region cards, capped at 4-6 (nearest first via geolocation, fallback to most popular). Each card: hero image (16:9), region name overlaid bottom-left, location count. "View all regions" link goes to `/locations`.
4. **Species ID Tool promo** — 2-col layout: phone mockup showing the wizard on left, copy + feature bullets + CTA on right.
5. **Premium upsell** — dark section with feature cards (alerts + deep dives) and pricing.
6. **Footer** — brand, nav links, data attribution.

**Note:** The premium section currently shows subscription pricing (monthly/yearly) but the plan decided on a one-off A$9.99 purchase. This needs updating when we build for real.

### Location page `/locations/[region]/[site]`
The main content page — this is what ranks for "[place] snorkelling" searches. Free and fully indexable.

**Structure: Hero above tabs.**

1. **Hero** — full-width hero image (location photo) with dark gradient overlay. Location name (Fraunces, large), region breadcrumb above, quick facts row below: skill level pill, depth range, activity tags (snorkelling/diving/freediving), best time to visit (auto-derived from seasonality data — month with highest species activity).

**Tabs** (species is default):

**Tab 1: Species** — the core feature and the user's per-location species collection ("find them all"). Single flat grid of species cards (3-col mobile, 4-5 col desktop). All species shown, no truncation.

   **Collection state (logged-in users):**
   - Progress bar at the top of the grid, prominent and bold: "12 of 47 spotted" — this is the primary engagement hook
   - All cards stay **full colour** (no desaturation) so the grid remains visually rich and browsable
   - **Spotted species:** checkmark badge or coloured ring on the card — clear "collected" state
   - **Unspotted species:** no badge — clean card, full info, still inviting to browse
   - No toggle needed — collection state is always visible for logged-in users, additive over the informational content

   **Unauthenticated users:**
   - Same full-colour informational grid, no collection state
   - Progress bar becomes a CTA: "0 of 47 — sign up to start collecting"

   **Each card (all users):**
   - Species hero photo (4:3 aspect)
   - Common name (bold) + scientific name (italic, smaller)
   - Likelihood pill: "Common" (emerald), "Occasional" (amber), "Rare" (slate)
   - "In season" badge if currently in season (pulsing green dot) — **only for seasonal species** (active ≤8 months at this location); year-round residents never get the badge
   - Links to species page
   - Filters above the grid: season toggle ("In season now" / "All"), likelihood filter, search within species
   - Count: "47 species recorded at this location"
   - Default sort order: (1) seasonal + in season now, by likelihood descending, (2) common residents, (3) occasional/rare residents, (4) seasonal but not currently in season
   - Single API call — one query returns all species with current-month likelihood and active-month count; client-side filtering for the toggle

**Tab 2: About** — the long-form location description (1000-2000 words). Access notes, what to expect, conditions, tips. This is the SEO workhorse content.

**Tab 3: Map** — Mapbox embed showing the location pin and nearby locations. Contained within content column with rounded corners. Nearby locations: horizontal scroll of 3-4 location cards from the same region. Include an open in maps button with a URI to the users default map app.

**Below tabs:** CTA banner — "Saw something you can't identify?" → Species ID tool link. Coral CTA button on sand background.

**Removed:** Seasonality overview (monthly calendar strip) — dropped because raw observation counts are biased by observer effort (more divers in summer ≠ more species). The "In season" badges on individual species cards communicate useful seasonal info without misleading aggregate trends.

### "In Season" badge rule (global)
A species gets the pulsing green "In season" badge **only** if it is (1) active ≤8 months out of 12 at that location (i.e. genuinely seasonal, not a year-round resident) AND (2) the current month is one of its active months (`common` or `occasional` in `species_seasonality`). This rule applies everywhere: homepage, location pages, region pages. Derived from existing `species_seasonality` data — count of months with `likelihood IN ('common', 'occasional')` per `location_species_id`.

### Species page `/species/[slug]`
Two tiers: free summary (indexed, visible to all) + premium deep dive (behind paywall, not indexed).

**Structure: Hero above tabs.** Same pattern as the location page — users learn the UI once.

1. **Hero** — full-width hero image of the species. Species common name (Fraunces, very large), scientific name in italic below. Quick facts row: size category, IUCN status (colour-coded pill), max length. **Endemic/Introduced badge** (pill, not shown for plain native species): "Endemic" or "Introduced" — driven by `is_endemic`/`is_introduced` booleans from iNaturalist (scoped to Australia via `preferred_place_id`). Native is the unremarkable default and gets no badge. Species not on iNat have no badge (fields are NULL). Range description (where the species lives globally) belongs in the AI-generated summary, not a separate field. See `docs/20-plan-international-expansion.md` for how these fields evolve when adding other countries.

**Tabs** (photos is default):

**Tab 1: Photos** — grid of all photos for this species (sourced from Wikimedia, Flickr, iNat, photographers). Same responsive grid layout as the location species grid (3-col mobile, 4-5 col desktop) via shared `ResponsiveGrid` component. Each cell: photo (4:3 aspect, rounded corners), optional caption (angle, life stage, photographer name). Tap to expand shared `PhotoLightbox` with full attribution overlay (photographer name, license, source). Grid layout lets users scan multiple photos at a glance for ID confirmation — someone checking "is this what I saw?" or looking at a species a friend told them about needs to compare angles, colouring, and size context quickly, not scroll through a carousel one-by-one. If only 1 photo exists, show it as the hero only (no photos tab).

**Tab 2: About** — summary + deep dive, stacked vertically.
   - **Summary** — free tier, 1-2 paragraphs. What this species is, what it looks like, where you'll find it. Always visible and indexable.
   - **Deep dive (premium)** — directly below the summary. Behind paywall. Teaser visible: first paragraph faded out with a gradient overlay and "Unlock the full story — A$9.99" CTA button (coral). When unlocked: full rich content — behaviour, diet, reproduction, ID tips (how to distinguish from similar species), fun facts, conservation status details. This is the "be the interesting person in your group" content.
   - **Similar species** — 3-4 cards of species commonly confused with this one, or from the same family. Helps with ID and drives internal linking.

**Tab 3: Where & When** — two-column table of locations with inline seasonality. No aggregate chart — seasonality is inherently per-location.
   - **Layout** — two-column rows. Left column: location name (links to location page), region, likelihood pill (common/occasional/rare). Right column: 12-month mini bar chart showing which months the species is active at that location (colour intensity = likelihood: common/occasional/rare). Months labelled J–D.
   - **Sort** — by total observation count descending (locations where this species is most frequently recorded appear first).
   - On mobile, stack the columns (location info above its seasonality bar).

**Below tabs:** "Think you spotted one?" → Species ID tool link. Coral CTA button on sand background.

### Shared components

Reusable layout components used across multiple pages. The cards/tiles within them are page-specific — only the containers and chrome are shared.

- **`TabBar`** — generic tab navigation. Takes tab labels, handles active state, URL hash sync, and keyboard navigation.
  - Region page (Locations / Species / Map)
  - Location page (Species / About / Map)
  - Species page (Photos / About / Where & When)
  - User profile (Trips / Spotted)

- **`ResponsiveGrid`** — responsive card grid (3-col mobile, 4-5 col desktop, consistent gap). Accepts any card component as children.
  - Homepage "Explore by Region" (region cards, 2-col)
  - Regions index `/locations` (region cards)
  - Location page Tab 1 (species cards)
  - Region page Tab 1 (location cards)
  - Region page Tab 2 (species cards)
  - Species page Tab 1 (photo tiles)
  - Species ID tool results (species match cards)
  - Spotted grid (spotted/unspotted species cells)
  - Trip detail (species grid)

- **`PhotoLightbox`** — tap-to-expand overlay with full attribution (photographer, license, source).
  - Species page photo grid
  - Location page species cards (tap photo to expand)
  - Trip detail species grid
  - Spotted grid (tap spotted species photo)

### Regions index `/locations`
All regions listing. Grid of region cards (same style as homepage "Explore by Region" but showing all published regions). Sorted by nearest first (geolocation) or alphabetical fallback. Each card: hero image (16:9), region name, location count, short description. Links to individual region page. Ranks for "snorkelling spots in Australia" type searches.

### Region page `/locations/[region]`
Landing page for a region. Ranks for "[region] snorkelling spots" type searches.

**Structure: Hero above tabs.** Same pattern as location and species pages.

1. **Hero** — region hero image, region name, location count, short description.

**Tabs** (locations is default):

**Tab 1: Locations** — filterable grid of location cards via shared `ResponsiveGrid`. Each card: hero image (4:3), location name, species count, skill level pill, depth range, activity tags, "In season" count ("5 species in season now" — uses the same seasonal-only badge rule: only counts species active ≤8 months). Filters: activity type (snorkelling/diving), skill level, sort by (name, species count, distance if geo available).

**Tab 2: Species** — "What you might see in [Region]" — grid of the most commonly spotted species across all locations in the region via shared `ResponsiveGrid`. Same species card style as location page (photo, common name, scientific name, likelihood pill). Sorted by total observation count descending.

**Tab 3: Map** — Mapbox showing all location pins in the region. Clicking a pin shows a tooltip with location name + species count, links to location page. Map is prominent (not sidebar).

### Species ID tool `/id`
Already built (`src/app/id/page.tsx`). 5-step wizard:
1. Where (location picker) → 2. When (month grid) → 3. Size (scaled silhouettes) → 4. Colours (multi-select grid, max 3) → 5. Habitat (icon grid).

**Pre-fill behaviour:** Step 1 (Where) pre-fills from browser geolocation → nearest location, or from a `?location=slug` query param if linked from a location page. Step 2 (When) pre-fills to today's date/current month. Both are editable — pre-fill just skips the step if the user doesn't need to change it.

Results: ranked species cards with hero photo, common name, confidence level (Confirmed / Likely / Possible — same vocabulary as pipeline confidence scoring in Section 1). Each card links to species page. "Want the full story?" premium upsell below results.

**Design changes needed:** Wire to real data. Update colours step from swatches to a multi-select grid layout. Add pre-fill logic for location and date.

### User profile `/u/[username]`
Public page. The user's "dive CV." Username is sourced from Supabase Auth user metadata (`raw_user_meta_data->>'username'`) — set during signup or social login. The public `users` table stores `display_name` for UI display; the username slug for the profile URL comes from `auth.users`.

**Structure: Header above tabs.** Same `TabBar` component as other detail pages.

1. **Profile header** — username, join date, total species spotted across all locations, total trips logged. Avatar (optional, default to initials).

**Tabs** (trips is default):

**Tab 1: Trips** — reverse-chronological list of trips. Each trip row: location name, date, species count, thumbnail stack (up to 5 circular species photos overlapping like an avatar stack, with "+N" pill if more). Tap row to expand into full trip detail page.

**Tab 2: Spotted** — single grid of every species the user has ever spotted, across all locations. No location grouping.
   - Progress counter: "47 species spotted"
   - Species grid via shared `ResponsiveGrid`: full-colour photo + common name for each spotted species. Tap any species to go to species page.
   - Sort: charismatic species first (`is_charismatic DESC`), then alphabetical by common name. One join from `sightings` → `species`.
   - Per-location collection progress is shown inline on each location page's Species tab — the profile is the combined lifetime collection across all locations.

### Trip detail / shareable trip report `/trips/[id]`
The shareable link people send after a snorkel/dive. This is the organic growth loop.

1. **Header** — "[Name] saw [N] species at [Location]" + date. Checklist progress below: "12 of 47 species spotted at [Location]" with visual progress bar. CTA buttons: "Discover what lives at [Location]" → location page link, "What did you see?" → Species ID tool link. Clean, bold, shareable-looking. This is how the growth loop converts visitors.
2. **Species grid** — hero photos of each species spotted, in a tight grid via shared `ResponsiveGrid`. Each cell: species photo, common name, quantity if >1 ("3x"), optional note snippet.
3. **OG image** — dynamically generated (Next.js `ImageResponse`): species photos in a grid, location name, date, progress. 1200x630 (standard) + 1080x1080 (Instagram). Must look good in iMessage/WhatsApp/Instagram DMs link previews.

### ~~Spotted grid `/locations/[region]/[site]/spotted`~~ — REMOVED
**Decision:** The spotted collection is not a separate route or section. It is integrated directly into the location page's Species tab (Tab 1). Logged-in users see their collection progress (progress bar + checkmark badges on spotted species) as the default experience on every location page. All cards stay full colour — no desaturation. See the Species tab spec above for full details. The `/spotted` route is eliminated.

### Browse all species `/species`
Simple index page for SEO and navigation.

1. **Header** — "All Species" title, total count, search bar.
2. **Filter bar** — size category, colour, habitat, alphabetical/taxonomic sort.
3. **Species grid** — same card style as location page species list (photo, common name, scientific name, location count). Paginated or infinite scroll.

### Credits `/credits`
Legal requirement. Lists all photo sources with attribution. Table: photographer name, source (Wikimedia/Flickr/iNat/etc.), license, number of photos used. Links to photographer profiles where applicable.

---

## 8. What You Need

- **Design:** DECIDED. "Pelagic" design system — Fraunces + Outfit fonts, deep navy hero, warm sand backgrounds, teal accents, coral CTAs. Homepage, Species ID wizard, and Header component already built. Use Claude's `/design` frontend design skill for all new page builds and UI components.
- **Photography:** Automated pipeline: Wikimedia Commons (primary, all commercially usable), Flickr CC (cc-by, cc0, public domain), CSIRO Science Image (CC BY), iNaturalist (cc-by/cc0 only, ~10-20%). Manual: GBRMPA Image Library (requires registration, check per-image), photographer partnerships (outreach). Expect 60-75% species coverage in first month, 70-85% at launch. See [[marine-photo-sourcing]] for full strategy.
- **Content writing:** Location and species guides. Can be AI-assisted but needs local knowledge and review.
- **Development:** Frontend + backend + deployment. Solo dev.
- **Domain/hosting:** Already have the domain. Vercel free tier is fine to start.
- **Legal:** Privacy policy, terms of service, cookie consent, DMCA takedown page, iNaturalist attribution compliance, photo license audit trail.

---

## 9. Competitive Advantages

What makes Salt Safari different from Zentacle, DivePlanIt, PADI, snorkeling-report:

1. **Species-first browsing** — "what can I see here?" not just "where can I dive?" None of the competitors do this well.
2. **Species knowledge as social currency** — the deep dives turn a casual snorkel into a story worth telling. No competitor offers this.
3. **Species ID tool** — "what did I just see?" solved without needing to know iNaturalist exists.
4. **Curated quality** — fewer locations but better info. Zentacle has 15k entries but poor descriptions. You go deep, not wide.
5. **Photographer partnerships** — beautiful imagery from real creators, not stock photos. Photographers are incentivised to promote you.
6. **Accessible to casuals** — aimed at snorkellers and swimmers, not just certified divers. Most competitors cater to divers.

---

## 10. Technical Specs (consolidated)

RLS policies, purchase gating (`has_purchased()`, `get_species_deep_dive()`), sightings + species alert RLS, auto-user creation trigger, and updated_at triggers are all implemented in the database schema SQL above (Section 1).

### "In Season Now" Email Notifications (Phase 1 — free for all users)
- **Trigger:** Supabase Edge Function on cron (monthly, timed to when species seasons shift)
- **Flow:** Query `species_alerts` where `enabled = TRUE` → join with `species_seasonality` for current month → check if opted-in species is now `common` or `occasional` at the opted-in location → group by user → send via Resend API with React Email template
- **Subject:** "Weedy seadragons are at Cabbage Tree Bay this month"
- **Content:** Species name, photo, location, likelihood (common/occasional), link to species page + ID tool CTA
- **Footer:** "Based on historical observation data. Sightings are not guaranteed." + manage alerts + unsubscribe
- **Edge cases:** No alerts set → send "pick species to watch" prompt. No data for a species/location this month → skip. Species not in season → don't send (only notify when species comes INTO season).

### Admin Dashboard (`/admin`)
Protected Next.js routes gated by `users.is_admin`. Service role key for server-side data operations only.

| Page | Content | Actions |
|------|---------|---------|
| `/admin` | Content stats by data_quality and status per entity type. "Needs attention" list. | — |
| `/admin/locations` | Table with region, data_quality, description_status, published. Filters + sort. | Edit, mark reviewed, publish/unpublish, bulk publish |
| `/admin/species` | Table with scientific_name, deep_dive_status, data_quality. Preview button. | Edit, mark reviewed, publish/unpublish |
| `/admin/photos` | Grid with thumbnails + attribution. Filter by location/species, license, is_hero. | Upload, edit attribution/license/alt_text |
| `/admin/pipeline` | Per-location pipeline triggers. Last sync date, species count, errors. | "Pull data" per location, "Re-pull all", "Generate AI descriptions" |

### File & folder conventions
```
src/app/                    — Next.js App Router pages & layouts
src/app/api/                — API routes (server-side only)
src/components/             — Shared React components
src/lib/                    — Utility functions, Supabase client, constants
src/lib/supabase/           — Supabase client (browser + server), middleware helpers
src/lib/pipeline/           — Data pipeline modules (iNat, ALA, OBIS, WoRMS, photos)
src/types/                  — Shared TypeScript types/interfaces
scripts/                    — One-off or cron scripts (pipeline runner, seed, etc.)
supabase/                   — Migrations, edge functions, seed SQL
public/                     — Static assets (images, icons, manifest)
data/                       — Legacy Notion exports (reference only, not imported)
docs/                       — Project documentation
```

### API route design
```
POST /api/pipeline/run          — Trigger pipeline for a location (admin only)
POST /api/pipeline/run-all      — Trigger pipeline for all locations (admin only)
GET  /api/species/search        — Full-text species search (public)
GET  /api/locations/search      — Full-text location search (public)
POST /api/sightings             — Log a sighting (authenticated)
GET  /api/sightings/[userId]    — Get user's sighting history (authenticated, own data)
POST /api/stripe/checkout       — Create Stripe checkout session (Phase 3)
POST /api/stripe/webhook        — Stripe webhook handler (Phase 3)
POST /api/alerts/subscribe      — Opt into species alert (authenticated)
DELETE /api/alerts/[id]         — Remove species alert (authenticated)
```

Note: Most read operations use Supabase client directly (no API route needed). API routes are for server-only operations (pipeline, webhooks, operations that need service role).

### Environment variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=       — Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  — Supabase publishable key
SUPABASE_SECRET_KEY=                   — Secret key (server-side only, never expose)

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=       — Mapbox public access token

# External APIs (pipeline, server-side only)
INATURALIST_APP_ID=             — iNaturalist app registration (optional, no auth benefit)
FLICKR_API_KEY=                 — Flickr API key (requires Pro + commercial key application)
RESEND_API_KEY=                 — Resend email API key

# Stripe (Phase 3)
STRIPE_SECRET_KEY=              — Stripe secret key
STRIPE_WEBHOOK_SECRET=          — Stripe webhook signing secret
NEXT_PUBLIC_STRIPE_PRICE_ID=    — One-off purchase price ID (single, not recurring)
```

### Validation & testing
Pipeline output is validated by spot-checking, not automated tests:
- After running the pipeline for a location, review the species list in the admin dashboard
- Check for obvious false positives (freshwater species, terrestrial animals)
- Check that confidence scores correlate with observation counts
- Check that seasonality data looks plausible (not all months identical)
- Check that photos have correct licenses and render properly
- Compare species counts across sources to catch dedup failures

No formal test suite for Phase 1. Add integration tests in Phase 2 when the pipeline is proven.

---
