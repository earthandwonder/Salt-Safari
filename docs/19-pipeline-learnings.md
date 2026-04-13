# Pipeline Learnings

Running log of discoveries, gotchas, and tuning decisions from building and running the data pipeline. Started with Cabbage Tree Bay as the test location. Reference this before scaling to new locations.

---

## iNaturalist

- **`/species_counts` returns max 500 species per query.** Fish+sharks hit this cap at Cabbage Tree Bay (691 total across 4 groups, but the fish group alone maxed at 500). For high-diversity locations, consider splitting fish into smaller taxon groups (e.g. separate sharks/rays from bony fish) or paginating.
- **Taxonomy fields are mostly null from `/species_counts`.** This endpoint returns `ancestor_ids` (numeric) but not ancestor names. `iconic_taxon_name` is stored in the `class` field as a rough group. Full taxonomy must be resolved via WoRMS.
- **Seasonality histogram hits 429s approximately every 3rd call** at sustained speed, but exponential backoff recovers reliably. The 60 req/min target is achievable but only with backoff logic.
- **`geoprivacy=open` must NOT be used on histogram endpoint** — it returns zero results. This is a documented gotcha in the iNat API.
- **`preferred_establishment_means`** extraction works well with `preferred_place_id=6744` (Australia) for endemic/native/introduced classification.
- **Seasonality data is sparse for rare species.** 225 species had fewer than 3 total observations — monthly distribution is unreliable for these. The `< 3 obs` threshold for skipping seasonality is appropriate.

---

## ALA (Atlas of Living Australia)

- **High observation counts for charismatic species** (25k+ for Spotted Wobbegong). This includes the Manly Ocean Beach Sealife Survey, a long-running citizen science program separate from iNaturalist. These are legitimate non-iNat observations.
- **"Not supplied" appears as a species name** (238 occurrences). The junk record filter (`isValidSpeciesRecord`) catches this.
- **ALA uses `lon` not `lng`** for longitude parameter — a silent API convention difference.
- **No common names from faceted search.** ALA's faceted endpoint doesn't return vernacular names. Resolved via WoRMS.
- **`-data_resource_uid:"dr1411"` effectively excludes iNat data** from ALA results, preventing double-counting.
- **`disableAllQualityFilters=true` and `fq=-assertions:COORDINATE_INVALID` needed** for marine sites — the default spatial-suspect filter incorrectly flags ocean coordinates.
- **ALA returned Actinopterygii + Chondrichthyes only** — Reptilia was excluded to avoid terrestrial snakes. This means sea turtles and sea snakes are not sourced from ALA (they come from iNat and OBIS).

---

## OBIS

- **OBIS reports 1,370 total species** for Cabbage Tree Bay but `size=500` caps results. The top 500 by record count is sufficient for Phase 1. Pagination can be added if needed.
- **OBIS `taxonID` = WoRMS AphiaID** — no additional resolution needed. This saved ~423 WoRMS API calls for Cabbage Tree Bay.
- **Mollusca dominates OBIS results** (302 species) — far more invertebrate diversity than fish. Excellent complement to iNaturalist's fish-heavy results.
- **OBIS returns full taxonomy** (kingdom through genus) sourced from WoRMS. Species with OBIS taxonomy can skip the WoRMS `getWoRMSRecord` call entirely.
- **No common names from OBIS.** Resolved via WoRMS vernaculars for OBIS-only species.
- **WKT bounding box uses longitude-first** (`POLYGON((lng lat, ...))`), matching WKT spec but opposite to most mapping APIs.
- **Seabirds appear in OBIS data** (Silver Gull, Little Penguin, cormorants) — 19 Aves species at Cabbage Tree Bay. These are legitimate marine-associated species.

---

## WoRMS (Taxonomy Resolution)

- **99.5% resolution rate** (1092/1097 species resolved). 5 species unresolvable:
  - `Pseudanthias cheirospilos` — recently described/renamed species
  - `Synchiropus papilio` — synonym not in WoRMS
  - `Porcellio scaber` — terrestrial isopod (should not have been in marine data — removed)
  - `Ameiurus melas` — freshwater catfish (removed)
  - `Gobiomorphus coxii` — freshwater goby (removed)
- **Synonym handling works well.** Unaccepted names follow `validAphiaId` to the accepted name. Post-merge AphiaID dedup catches cases where different scientific names resolve to the same accepted species.
- **Terrestrial filter catches most land species** via `isTerrestrial=true AND isMarine=false AND isBrackish=false`. However, some freshwater species have WoRMS records marked as marine (e.g. European Carp with AphiaID 154582). These must be caught by secondary filters or manual review.
- **500ms delay between requests** is conservative but reliable. No 429 errors observed from WoRMS during full pipeline run.
- **WoRMS resolution is the slowest pipeline stage** (~25 minutes for ~680 API calls). In-memory caching and the OBIS AphiaID shortcut are essential for performance.
- **Vernacular name lookups** only needed for species without iNat common names (ALA/OBIS-only species). Prefers English (`language_code="eng"`).

---

## Photo Pipeline

- **Wikimedia CDN aggressively rate limits image downloads.** The API search endpoint (commons.wikimedia.org/w/api.php) handles 500ms delays fine, but downloading thumbnails from upload.wikimedia.org triggers 429 errors at sustained rates. Downloading 3 photos/species was unsustainable — 568 rate limit errors across 225 species before we stopped.
- **Sustainable approach (validated):** 1 hero photo per species, 3s delay between species, 500ms between API calls, single retry on 429 (10s wait) then global cooldown (30-120s) after 3 consecutive 429s. Test batch of 20 species: 12 uploads, 0 failures, 0 rate limit errors, 77s total. Full run estimate: ~75 minutes for 1092 species.
- **Use `--batch` and `--offset` for incremental runs.** Example: `--batch 100 --offset 200` processes species 200-299. Useful for spreading load across sessions.
- **`--max-photos 3` available** for additional photos per species, but only recommended for small batches (e.g. top 50 charismatic species) or after the hero pass is complete.
- **PDF page thumbnails appear in search results** for some species — Wikimedia returns scanned book pages that match the scientific name. These get filtered by the SVG check but PDF thumbnails are JPEG and pass through.
- **License filter:** CC BY (all versions), CC BY-SA (all versions), CC0, Public Domain. CC BY-NC rejected.
- **iNaturalist photos** are supplementary — only ~10-20% of iNat photos pass the `cc0,cc-by,cc-by-sa` license filter. Sorted by community votes for quality.
- **Flickr skipped** in Phase 1 — no API key available. Can be added as a third source later.
- **Migrated from Supabase Storage to Cloudflare R2.** Supabase free tier is 1 GB (shared with DB). 3 photos × 1092 species = ~1.1 GB — already over the limit for one location. R2 gives 10 GB free with no egress fees. Uses `@aws-sdk/client-s3` (R2 is S3-compatible). Public access via r2.dev subdomain.
- **Batch size limits:** Supabase `.in()` queries fail with "Bad Request" when passing >~200 IDs. Photo pipeline species fetch needed batching (200 IDs per query). Same applies to location_species queries at high-diversity sites.

---

## Deduplication & Confidence Scoring

### Confidence formula
```
source_weight × log₁₀(obs_count + 1) / log₁₀(1000)  →  avg across sources  ×  corroboration_factor
```
- Source weights: ALA 1.0, OBIS 0.8, iNaturalist 0.7, GBIF 0.5, manual 0.3
- Corroboration: 3+ sources → 1.0, 2 sources → 0.8, 1 source → 0.6

### Observations from Cabbage Tree Bay
- **Only 9 species score ≥0.6 (high confidence).** The formula heavily penalises single-source species (corroboration factor 0.6). This is by design — a species confirmed by multiple independent sources is more trustworthy.
- **62 species in medium range (0.4-0.6).** These are typically 2-source species with moderate observation counts.
- **719 species below 0.2.** Most are OBIS-only invertebrates with low observation counts. This is expected — OBIS catalogues everything including deep-water and rarely-observed species.
- **Top species (Eastern Blue Groper at 0.988)** are corroborated by all 3 sources with very high observation counts. The scoring correctly surfaces the species a diver is most likely to encounter.
- **173 species have ≤1 observation.** These are borderline records that could be misidentifications or range-edge sightings. They're kept in the database at low confidence rather than deleted — the UI can filter by confidence threshold.

### Deduplication results
- **Name-based dedup** reduced 1436 valid records → 1110 unique species.
- **AphiaID-based dedup** caught additional synonym pairs (species with different scientific names resolving to the same WoRMS AphiaID), further reducing to 1097.
- **5 false positives removed manually:** 2 freshwater fish (Cyprinus carpio, Carassius auratus), 1 freshwater goby (Gobiomorphus coxii), 1 freshwater catfish (Ameiurus melas), 1 terrestrial isopod (Porcellio scaber). These slipped through because:
  - Cyprinus carpio and Carassius auratus have WoRMS records marked as marine (they occur in estuarine environments occasionally)
  - The others had no WoRMS AphiaID, so the terrestrial filter couldn't run

### Potential improvements for Phase 2
- Add a "known freshwater" blocklist for species like carp/goldfish that have misleading WoRMS marine flags.
- Consider raising the minimum observation threshold from 0 to 2-3 for single-source species.

---

## Radius & Spatial Tuning

- Cabbage Tree Bay uses the default radius from the seed data. For shore dives, a smaller radius (1-2km) reduces contamination from neighbouring sites.
- **Bull Shark (Carcharhinus leucas)** appeared with 263 observations — likely from acoustic receiver detections in the broader Manly area, not visual sightings. The species is legitimate but the observation count is inflated by non-visual detection methods.
- ALA's high counts for Spotted Wobbegong (25k+) include the broader Manly Ocean Beach monitoring program. The radius should be small enough to avoid pulling in data from substantially different habitats.

---

## General

### Performance (Cabbage Tree Bay, 1092 species)
- **Total species pipeline time:** ~55 minutes
  - Source queries (iNat + ALA + OBIS in parallel): ~5 minutes
  - WoRMS resolution (~680 API calls at 500ms each): ~25 minutes
  - iNat seasonality (~680 species × ~1s each with rate limiting): ~20 minutes
  - Database writes (species, location_species, source_records, seasonality): ~5 minutes
- **Photo pipeline:** TBD (running)

### Workflow
- The `--photos-only` flag is essential — re-running the species pipeline takes an hour but photo pipeline can run independently.
- Validation script (`scripts/validate-and-publish.ts`) should be run after every pipeline execution before publishing.
- Supabase `.in()` queries are limited to ~200 IDs per call — batch large ID arrays.
- Supabase default pagination returns max 1000 rows — use `.range()` for locations with many species.

### Seasonality validation
- **Port Jackson Shark:** Clear winter peak (Jul 85, Aug 113, Sep 121 observations). Matches known biology (winter breeding migration into Sydney Harbour).
- **Weedy Seadragon (Common Sea Dragon):** Year-round presence with peaks in May (15), Dec (15), Mar (10). No clear seasonal pattern — consistent with their known resident behaviour.
- Both patterns validate that the iNaturalist histogram data accurately reflects real seasonal distribution at this location.
