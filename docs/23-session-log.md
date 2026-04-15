# Session Log

> **What this is:** A record of what each implementation session built. Read this at the start of every new session to understand what exists and what state the project is in.
>
> **Format:** Each entry is terse — structured facts, not narrative. Paths, deviations, and blockers only.

---

<!-- Append new session entries below this line -->

## Session 1 — Foundation: Database, Auth & Project Scaffolding
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Env setup:** `.env.local` populated with Supabase, Mapbox, Resend keys. `.env.example` already had placeholder names.
- **Database migration:** Run via Supabase SQL Editor. All 11 tables, RLS policies, triggers created.
- **Seed data:** `scripts/seed-cabbage-tree-bay.sql` — Sydney region + Cabbage Tree Bay location stub. Run via SQL Editor.
- **Supabase client helpers:**
  - `src/lib/supabase/client.ts` — browser client (`createBrowserClient`)
  - `src/lib/supabase/server.ts` — server client with cookie handling (`createServerClient`)
  - `src/lib/supabase/middleware.ts` — session refresh helper
- **Next.js middleware:** `src/middleware.ts` — refreshes Supabase auth session on every request
- **TypeScript types:** `src/types/database.ts` — types for all 11 tables. `src/types/index.ts` re-exports.
- **Auth callback:** `src/app/auth/callback/route.ts` — OAuth code exchange
- **Auth UI:**
  - `src/app/login/page.tsx` — email/password + Google OAuth button, on-brand (Pelagic design system)
  - `src/app/signup/page.tsx` — email/password + display name + Google OAuth, confirmation screen
- **Header updated:** `src/components/Header.tsx` — shows auth state (name + sign out when logged in, sign in / sign up when logged out)

### Deviations
- Google OAuth: credentials not yet configured in Supabase Dashboard. Button exists but won't work until Google Cloud Console OAuth is set up.
- No new dependencies needed — `@supabase/ssr` and `@supabase/supabase-js` already in `package.json`.

### Build
- `npm run build` passes clean.

---

## Session 2 — Data Pipeline: iNaturalist Module
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Pipeline types:** `src/lib/pipeline/types.ts` — shared types for the multi-source pipeline (`RawSpeciesRecord`, `SeasonalityData`, `PipelineResult`, `PipelineError`, `LocationQuery`, etc.)
- **iNaturalist module:** `src/lib/pipeline/inaturalist.ts` — full API client with:
  - `queryINaturalistSpecies()` — queries `/v1/observations/species_counts` across 4 marine taxon groups (fish+sharks, cephalopods+nudibranchs, cnidaria+echinoderms, turtles+cetaceans+seals+syngnathidae+crustaceans). Returns merged `RawSpeciesRecord[]`.
  - `queryINaturalistSeasonality()` — queries `/v1/observations/histogram` with `interval=month_of_year`. Returns 12-month `SeasonalityData[]`. Correctly omits `geoprivacy=open` per documented gotcha.
  - Token bucket rate limiter (60 req/min).
  - Retry with exponential backoff on 429, linear backoff on 500/503, skip on other 4xx.
  - Logging of every API call (URL, status, result count).
  - Extraction of `preferred_establishment_means` (endemic/native/introduced) from iNat response.
- **Test script:** `scripts/test-inaturalist.ts` — queries Cabbage Tree Bay and logs results + seasonality.

### Verification
- Cabbage Tree Bay query returned **691 species** across all 4 taxon groups (500 fish+sharks, 56 cephalopods+nudibranchs, 70 cnidaria+echinoderms, 65 others). Top species: Eastern Blue Groper (738 obs), Spotted Wobbegong (504 obs), Australian Giant Cuttlefish (450 obs).
- Weedy Seadragon seasonality returned **87 observations** across 12 months — plausible distribution with winter/spring peaks.
- `npm run build` passes clean.

### Deviations
- Taxonomy fields (kingdom, phylum, order, family, genus) are mostly null from `/species_counts` — this endpoint only returns `ancestor_ids` (numeric), not ancestor names. `iconic_taxon_name` is stored in the `class` field as a rough group. Full taxonomy will be resolved via WoRMS in Session 4.
- Fish+sharks group hit the 500-species cap (per_page limit). For high-diversity locations, some species may be truncated. This can be addressed in future by splitting into smaller taxon groups or paginating.

---

## Session 3 — Data Pipeline: ALA + OBIS Modules
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **ALA module:** `src/lib/pipeline/ala.ts` — full API client with:
  - `queryALASpecies()` — queries `/ws/occurrences/search` with faceted search (`facets=species`, `pageSize=0`).
  - Excludes iNaturalist data via `fq=-data_resource_uid:"dr1411"`.
  - Filters to marine fish classes only (`Actinopterygii`, `Chondrichthyes`). Reptilia excluded (terrestrial snakes).
  - Disables `spatial-suspect` quality filter for marine accuracy.
  - Uses `lon` (not `lng`) per ALA's API convention.
  - 500ms delay between calls (no published rate limits). Retry with backoff on 429/5xx.
- **OBIS module:** `src/lib/pipeline/obis.ts` — full API client with:
  - `queryOBISSpecies()` — queries `/v3/checklist` with WKT bounding box.
  - `pointToBBox()` — converts point+radius to WKT POLYGON (longitude-first).
  - Filters to `taxonid=2` (Animalia) to exclude microbial results.
  - Extracts WoRMS AphiaID directly from OBIS `taxonID` field.
  - Returns full taxonomy (kingdom through genus) from OBIS response.
- **Test script:** `scripts/test-ala-obis.ts` — queries Cabbage Tree Bay through both sources.
- Both modules return normalised `RawSpeciesRecord[]` with `source: 'ala' | 'obis'`.

### Verification
- **ALA:** Cabbage Tree Bay returned **323 species** (41,632 occurrence records). Top species: Spotted Wobbegong (25,234 obs), Eastern Blue Groper (11,413 obs), Port Jackson Shark (985 obs).
- **OBIS:** Cabbage Tree Bay returned **500 species** (page 1 of 1,370 total). Top species match ALA closely. Rich taxonomy: 302 Mollusca, 109 Chordata, 23 Porifera, 21 Annelida, 19 Arthropoda, 16 Echinodermata, 6 Cnidaria.
- **Cross-source overlap:** 72 species shared between ALA and OBIS. 251 ALA-only, 428 OBIS-only — good complementary coverage.
- `npm run build` passes clean.

### Notable findings
- **ALA observation counts are very high** for top species (25k+ for wobbegong). This likely includes data from the Manly Ocean Beach Sealife Survey, a long-running citizen science program (not iNat). These are legitimate non-iNat observations but heavily concentrated on a few charismatic species.
- **ALA returned "Not supplied" as a species name** (238 obs) — records with missing taxonomy. The orchestrator should filter these out during dedup.
- **OBIS reports 1,370 total species** but we only retrieved 500 (the `size` cap). For high-diversity sites, pagination may be needed. Seabirds appear as expected (Silver Gull, Little Penguin, cormorants).
- **OBIS returned Mollusca as the dominant phylum** (302 species) — far more invertebrate diversity than fish. This complements iNaturalist's fish-heavy results well.
- **Bull Shark (Carcharhinus leucas) appears in both** ALA and OBIS with 263 observations at Cabbage Tree Bay — surprising for an aquatic reserve, but these are likely tagged shark detections from acoustic receivers in the broader Manly area.

### Deviations
- ALA common names are not available from faceted search — will be resolved via WoRMS in Session 4.
- OBIS has no common names at all — also resolved via WoRMS.
- OBIS `size=500` caps results; 1,370 species reported for Cabbage Tree Bay. Pagination not implemented yet — the 500 most-recorded species are returned. Can add pagination later if needed.

### Session 4 plan updates (based on Session 3 findings)
- Added to `docs/21-implementation-prompt.md` Session 4 guidance: filter "Not supplied"/empty/genus-only names from ALA before dedup; use OBIS AphiaIDs directly to skip redundant WoRMS calls; confirmed no OBIS pagination needed (top 500 by record count is sufficient); confirmed ALA confidence weight stays at 1.0.

---

## Session 4 — Data Pipeline: WoRMS Resolver + Orchestrator
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **WoRMS resolver:** `src/lib/pipeline/worms.ts` — full API client with:
  - `resolveToWoRMS(scientificName)` — 2-step resolution: exact match (`AphiaIDByName`) → fuzzy match (`AphiaRecordsByMatchNames`). Returns AphiaID or null.
  - `getWoRMSRecord(aphiaId)` — full record including taxonomy, marine/terrestrial flags, accepted status. Follows `validAphiaId` for unaccepted names.
  - `getWoRMSVernaculars(aphiaId)` — common/vernacular names, prefers English.
  - In-memory caching for all three functions (aphiaId, record, vernacular) to avoid duplicate lookups within a pipeline run.
  - 500ms delay between requests (conservative, no published rate limits).
  - Retry with exponential backoff on 429, linear backoff on 5xx.

- **Multi-source orchestrator:** `src/lib/pipeline/orchestrator.ts` — full pipeline:
  1. Fetches location from database (lat, lng, radius_km).
  2. Queries iNaturalist, ALA, OBIS in parallel.
  3. Filters junk records: "Not supplied", empty, genus-only (no species epithet).
  4. Deduplicates by normalised scientific name (lowercase, trim).
  5. WoRMS resolution with OBIS AphiaID shortcut (skips API calls for species already resolved by OBIS).
  6. Fetches WoRMS taxonomy for species without OBIS taxonomy; uses OBIS taxonomy directly for OBIS-sourced species.
  7. Filters terrestrial-only species (WoRMS `isTerrestrial` flag).
  8. Post-merge AphiaID dedup (merges different scientific names that resolve to the same AphiaID).
  9. Confidence scoring: source weight × log-scaled obs count × corroboration factor.
  10. Upserts species, location_species, source_records to database.
  11. Queries iNat seasonality for each species with iNat taxon ID.
  12. Classifies months as common/occasional/rare; skips species with < 3 total observations.
  13. Upserts species_seasonality records and derives first/last observed months.
  14. Updates location `last_synced_at` and `data_quality`.

- **CLI runner:** `scripts/run-pipeline.ts` — accepts `--location <slug>`, loads env from `.env.local`, creates Supabase service role client.
- **Package.json script:** `"pipeline": "npx tsx --env-file=.env.local scripts/run-pipeline.ts"` — usage: `npm run pipeline -- --location cabbage-tree-bay`.

### Verification — Cabbage Tree Bay
- **Sources queried:** iNaturalist (691 species), ALA (323 species), OBIS (500 species) → 1436 valid records after filtering.
- **Unique species (by name):** 1110 → 1097 after AphiaID dedup and terrestrial filtering.
- **WoRMS resolution:** 423 from OBIS (cached), 682 resolved via API, 5 failed (kept as `data_quality = 'stub'`). 99.5% success rate.
- **Database writes:** 1097 species upserted, 1097 location_species records, 1436 source_records.
- **Seasonality:** 457 species have monthly data (225 skipped for < 3 observations).
- **Total pipeline time:** ~55 minutes (WoRMS resolution ~25min, seasonality ~20min, source queries ~5min, DB writes ~5min).
- `npm run build` passes clean.

### Deviations
- WoRMS rate limit reduced from 1 req/sec to 500ms (conservative but faster — no published limits).
- OBIS species skip `getWoRMSRecord` call entirely when OBIS taxonomy is available (OBIS taxonomy is already WoRMS-sourced). This cut WoRMS API calls significantly.
- Slug generation uses common name first, falls back to scientific name, with deduplication suffix for collisions.
- Vernacular name lookups only for species missing common names from iNat (ALA/OBIS-only species).
- iNat seasonality hitting 429 rate limits occasionally (~every 3rd call) but recovering with backoff. Pipeline still completed within the 60 req/min target.

### Notable findings
- **5 species unresolvable by WoRMS:** These are likely recently renamed or very obscure taxa. Kept with `worms_aphia_id = NULL` and `data_quality = 'stub'`.
- **Terrestrial species filtered:** Some species flagged as terrestrial-only by WoRMS were removed (e.g. goldfish Carassius auratus appeared in OBIS data).
- **AphiaID dedup caught synonym pairs:** Some species with different scientific names resolved to the same WoRMS AphiaID (e.g. old vs. accepted names). These were merged correctly.
- **457/682 species with seasonality** — the 225 skipped species had fewer than 3 total observations at Cabbage Tree Bay, making monthly distribution unreliable.

---

## Session 5 — Data Pipeline: Photo Pipeline
**Date:** 2026-04-13
**Status:** Complete (code written, awaiting first run)

### What was built
- **Wikimedia Commons module:** `src/lib/pipeline/photos/wikimedia.ts`
  - Searches by scientific name, falls back to common name.
  - `generator=search` in File namespace (`gsrnamespace=6`), returns `imageinfo` with `extmetadata`.
  - License filtering: accepts CC BY (all versions), CC BY-SA (all versions), CC0, Public Domain. Rejects CC BY-NC and anything else.
  - Parses photographer from `extmetadata.Artist` (strips HTML tags).
  - Skips SVGs and images below 400×300px.
  - Sorts results by resolution (largest first).
  - 200ms delay between requests. User-Agent header set.

- **iNaturalist photos module:** `src/lib/pipeline/photos/inaturalist.ts`
  - Queries `/v1/observations` with `photo_license=cc0,cc-by,cc-by-sa`, `quality_grade=research`, `order_by=votes`.
  - Supplementary source — only ~10-20% of iNat photos pass the license filter.
  - Extracts photo URL (large size), observer name, license, observation ID.
  - 1s delay between requests (shared 60 req/min rate limit).

- **Photo orchestrator:** `src/lib/pipeline/photos/index.ts`
  - `runPhotoPipelineForLocation(supabase, options)` — processes all species at a location.
  - For each species: Wikimedia (scientific name → common name fallback) → iNaturalist fallback.
  - Downloads images and uploads to Supabase Storage bucket `photos` at path `{species-slug}/hero.{ext}`.
  - Up to 3 photos per species (1 hero + 2 additional).
  - Inserts `photos` table records with full audit trail: source, source_url, license, license_url, photographer_name, date_accessed, dimensions.
  - Sets `species.hero_image_url` to the public Storage URL.
  - Skips species that already have a hero image (configurable via `skipExistingHeroes`).
  - Progress logging every 25 species.

- **CLI runner updated:** `scripts/run-pipeline.ts`
  - New flags: `--photos` (run species + photos), `--photos-only` (skip species pipeline, photos only).
  - Usage: `npm run pipeline -- --location cabbage-tree-bay --photos-only`

### Pre-run requirement
- **Supabase Storage:** User must create a public `photos` bucket in Supabase Dashboard before running.

### Deviations
- **Flickr skipped:** API key not yet available (application submitted). Wikimedia + iNaturalist only. Flickr can be added as a third source later.
- **CSIRO and GBRMPA skipped:** No proper API — deferred to Phase 2 manual sourcing per plan.
- **Wikimedia uses 1200px thumbnails** for hero uploads (via `iiurlwidth=1200`) rather than full-resolution originals, keeping storage reasonable.

### Build
- `npm run build` passes clean.

---

## Session 6 — Run Pipeline + Validate + Log Learnings
**Date:** 2026-04-13
**Status:** Complete

### What was done
- **Validation script:** `scripts/validate-and-publish.ts` — comprehensive validation + publish CLI tool.
  - Queries all species, location_species, source_records, seasonality, photos from Supabase.
  - Reports: phylum breakdown, charismatic species check, confidence distribution, source corroboration, seasonality graphs, photo coverage, potential issues (freshwater/terrestrial suspects).
  - `--publish` flag sets `published=TRUE` on region, location, and all WoRMS-resolved species.
  - Handles Supabase pagination (>1000 rows) and `.in()` batch limits (~200 IDs).
  - Package.json script: `npm run validate -- --location cabbage-tree-bay [--publish]`.

- **Data validation (Cabbage Tree Bay):**
  - **1092 species** (down from 1097 after cleanup). 99.5% WoRMS resolved.
  - **Phylum breakdown:** 624 Chordata, 316 Mollusca, 55 Arthropoda, 43 Cnidaria, 37 Echinodermata, 10 Annelida, 5 Porifera, 1 Bryozoa, 1 Platyhelminthes.
  - **Charismatic species confirmed:** Eastern Blue Groper (0.988 confidence), Port Jackson Shark (0.962), Spotted Wobbegong (0.972), Australian Giant Cuttlefish (0.542). Common Sea Dragon (Weedy Seadragon) and Blue-lined Octopus (Blue-ringed) also present under standard common names.
  - **Confidence distribution:** 9 high (≥0.6), 62 medium (0.4–0.6), 307 low (0.2–0.4), 714 very low (<0.2).
  - **Source corroboration:** 53 species in 3+ sources, 206 in 2 sources, 818 in 1 source.
  - **Seasonality:** 299 species with monthly data. Port Jackson Shark shows correct winter peak (Jul–Sep). Weedy Seadragon year-round.

- **False positives removed (5):**
  - Cyprinus carpio (European Carp) — freshwater, had WoRMS marine flag
  - Carassius auratus (gibel carp) — freshwater, had WoRMS marine flag
  - Porcellio scaber (Common Rough Woodlouse) — terrestrial isopod
  - Ameiurus melas (Black Bullhead catfish) — freshwater, no WoRMS ID
  - Gobiomorphus coxii (Cox's Gudgeon) — freshwater goby, no WoRMS ID

- **Photo pipeline fixes:**
  - Fixed Supabase `.in()` batch limit — species fetch now batches 200 IDs per query.
  - Fixed `location_species` pagination — now uses `.range()` for >1000 rows.
  - Created Supabase Storage `photos` bucket programmatically.
  - Added retry logic for Wikimedia CDN 429 errors (exponential backoff: 5s, 10s, 20s, 40s).
  - Increased delays: 500ms between Wikimedia API calls, 2s between image downloads, 1s between species.

- **Photo pipeline — rate limit discovery and fix:**
  - Initial approach (3 photos/species to Supabase Storage, 1s delay) triggered 568 Wikimedia CDN 429 errors across 225 species. Unsustainable — risked IP block.
  - Revised approach: 3s between species, single retry on 429, global cooldown (30-120s) after 3 consecutive 429s.
  - Added `--batch`, `--offset`, `--max-photos` CLI flags for incremental runs.

- **Cloudflare R2 migration (photo storage):**
  - Supabase Storage free tier (1 GB) too small for 3 photos × 1092 species (~1.1 GB).
  - Migrated to Cloudflare R2: 10 GB free, no egress fees, S3-compatible API.
  - New module: `src/lib/pipeline/photos/r2.ts` — S3Client upload via `@aws-sdk/client-s3`.
  - Cleaned up 336 Supabase Storage hero images + 453 photo records.
  - R2 public URL: `pub-679ea585b55d48a78970795a14563299.r2.dev/{species-slug}/{filename}.{ext}`.
  - Test batch: 5 species × 3 photos = 15 uploads, 0 failures, 57s. All URLs return HTTP 200.
  - Full pipeline running: 1092 species × 3 photos to R2. Estimated ~3 hours. Resumable via `skipExistingHeroes`.

- **Published Cabbage Tree Bay:**
  - Sydney region: `published=TRUE`
  - Cabbage Tree Bay location: `published=TRUE`
  - 1090 species: `published=TRUE` (2 stubs without WoRMS ID left unpublished)

- **Pipeline learnings:** `docs/19-pipeline-learnings.md` fully populated with API quirks, tuning decisions, deduplication findings, confidence scoring analysis, photo pipeline discoveries, and performance notes.

### Deviations
- Photo pipeline running in background at session end (sustainable rate, ~75min ETA). Re-run with `--photos-only` to catch any missed species.
- Seasonality count (299) is lower than Session 4 reported (457) — likely due to the Session 4 count including species that were later cleaned up or deduplicated.
- "Freshwater suspect" keywords in validation script produce false positives for marine species like Arripis trutta (Eastern Australian Salmon) and Meridiastra calcar (Carpet Sea Star) — these contain "trout"/"carp" substrings but are legitimate marine species.

### Build
- `npm run build` passes clean.

---

## Session 7 — Shared UI Components
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **`LikelihoodPill`** — `src/components/LikelihoodPill.tsx`
  - Server Component. Three variants: Common (emerald), Occasional (amber), Rare (slate).
  - Colored dot + label in a pill. Exports `Likelihood` type for reuse.

- **`SeasonBadge`** — `src/components/SeasonBadge.tsx`
  - Server Component. Pulsing green dot + "In season" text.
  - Enforces the ≤8 active months rule — returns null for year-round species or when not currently active.
  - Uses existing `.season-dot` CSS class from `globals.css`.

- **`WaveDivider`** — `src/components/WaveDivider.tsx`
  - Server Component. SVG wave path with configurable fill color and flip direction.
  - Uses existing `.wave-divider` CSS class for responsive height (60px mobile, 80px desktop).

- **`ResponsiveGrid`** — `src/components/ResponsiveGrid.tsx`
  - Server Component. CSS Grid with configurable mobile/tablet/desktop column counts.
  - Defaults: 2-col mobile, 3-col desktop. Pre-mapped Tailwind classes to avoid purge issues.

- **`TabBar`** + **`TabPanel`** — `src/components/TabBar.tsx`
  - Client Component. URL hash sync (read on mount, update on tab change, listen to popstate).
  - Sliding coral underline indicator (CSS transition, positioned dynamically via refs).
  - Full keyboard navigation: ArrowLeft/Right, Home/End.
  - ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` roving.
  - `TabPanel` helper renders content conditionally based on active tab.

- **`PhotoLightbox`** — `src/components/PhotoLightbox.tsx`
  - Client Component. Full-screen overlay with Motion (AnimatePresence, scale + fade animations).
  - Dark backdrop with blur. Close on Escape, click outside, or X button.
  - Attribution bar: photographer name, license badge (human-readable labels), source link.
  - Locks body scroll while open.

- **`SpeciesCard`** — `src/components/SpeciesCard.tsx`
  - Server Component. 4:3 hero photo (with placeholder gradient fallback), common name (Fraunces), scientific name (italic).
  - Composes `LikelihoodPill` + `SeasonBadge`.
  - Spotted state: emerald checkmark badge overlay on photo.
  - Hover: card lift + image zoom. Links to `/species/[slug]`.

- **`LocationCard`** — `src/components/LocationCard.tsx`
  - Server Component. 4:3 hero photo, location name (Fraunces).
  - Overlay badges: species count (navy pill), in-season count (emerald pill with pulsing dot).
  - Skill level pill (teal/amber/rose), depth range, activity tags.
  - Links to `/locations/[region]/[site]`.

- **`Footer`** — `src/components/Footer.tsx`
  - Server Component. 4-column layout (brand, Explore, Account, Legal).
  - Wave logo + "Salt Safari" brand mark matching Header.
  - Data attribution with links to iNaturalist, ALA, OBIS, WoRMS.
  - Copyright with dynamic year.

### Deviations
- None. All 9 components built as specified.

### Build
- `npm run build` passes clean.

---

## Session 8 — Location Page
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Route:** `src/app/locations/[region]/[site]/page.tsx`
  - Server Component. Fetches location by region slug + site slug from Supabase.
  - Fetches all species at location via `location_species` join with `species` table (paginated for >500 rows).
  - Fetches all `species_seasonality` data (batched 200 IDs per `.in()` query).
  - Computes per-species: `currentMonthLikelihood`, `activeMonthCount`, `isInSeason` (≤8 active months AND current month active).
  - Sorts: in-season first by likelihood desc, then by observation count.
  - Computes "best time to visit" = month with highest weighted species activity.
  - Fetches nearby locations from same region with species counts.
  - `generateMetadata()` — dynamic title, description, OG tags.
  - JSON-LD `TouristAttraction` schema.org structured data.
  - 404 if location not found or not published.

- **Client wrapper:** `src/app/locations/[region]/[site]/LocationPageClient.tsx`
  - Hero section: full-width image (or `hero-gradient` fallback), location name (Fraunces), breadcrumb nav, quick facts row (skill level pill, depth range, activity tags, best time to visit, in-season count).
  - Tabs via `TabBar` component: Species (default), About, Map.
  - Sticky tab bar below header on scroll.
  - About tab: renders `description` paragraphs or "coming soon" state. Access notes in amber callout.
  - CTA banner below tabs: "Saw something you can't identify?" → `/id` with coral button.
  - Footer included.
  - Auth check on mount: fetches user sightings for collection state.

- **Species tab:** `src/app/locations/[region]/[site]/SpeciesTab.tsx`
  - Client Component. All filtering is client-side (data pre-loaded from server).
  - Collection progress bar: authenticated users see "X of Y spotted" with gradient progress bar. Unauthenticated users see CTA "Sign up to start collecting".
  - Filters: season toggle (All / In Season), likelihood dropdown, text search (name + scientific name).
  - `ResponsiveGrid` of `SpeciesCard` (2-col mobile, 3-col tablet, 4-col desktop).
  - Likelihood derivation: uses current month seasonality, falls back to confidence score.
  - Empty state with "Clear all filters" button.

- **Map tab:** `src/app/locations/[region]/[site]/MapTab.tsx`
  - Client Component. Mapbox embed via `react-map-gl/mapbox` + `mapbox-gl`.
  - Custom coral marker pin with location name label.
  - Navigation controls (zoom/compass). Scroll zoom disabled.
  - "Open in Maps" button (Google Maps universal link).
  - Nearby locations: horizontal scroll of `LocationCard` components from same region.
  - Graceful fallback if Mapbox token not configured.

- **Dependencies added:** `react-map-gl`, `mapbox-gl`.

### Deviations
- `react-map-gl` v8 requires importing from `react-map-gl/mapbox` (not the package root) due to its exports field. Fixed during build.
- `npm run lint` requires ESLint initialization (next lint deprecated in Next.js 16 preview) — not blocking, build passes.
- Nearby locations `inSeasonCount` is simplified to 0 (would require full seasonality query per location). Can be enriched later.

### Build
- `npm run build` passes clean. Location page is 14 kB first load JS.

---

## Session 9 — Species Page
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Route:** `src/app/species/[slug]/page.tsx`
  - Server Component. Fetches species by slug from Supabase. 404 if not found or not published.
  - Fetches all photos for the species (hero first).
  - Fetches all locations where this species appears via `location_species` join, with region data.
  - Fetches seasonality data per location (batched 200 IDs per `.in()` query).
  - Fetches similar species (same family, limit 4).
  - Computes `currentMonthLikelihood` per location occurrence.
  - Sorts locations by total observation count descending.
  - `generateMetadata()` — dynamic title, description, OG image.
  - JSON-LD `Thing` structured data.

- **Client wrapper:** `src/app/species/[slug]/SpeciesPageClient.tsx`
  - Hero section: full-width photo (or `photo-placeholder-species` gradient fallback), common name (Fraunces), scientific name (italic), quick facts row.
  - Quick facts: size category, max length, IUCN status (colour-coded pill with all categories LC through EX), endemic/introduced badges.
  - Dynamic tabs: if only 1 photo, Photos tab is hidden and About becomes default.
  - Sticky tab bar below header on scroll.
  - CTA banner below tabs: "Think you spotted one?" → `/id`.
  - PhotoLightbox integration for photo viewing.
  - Footer included.

- **Photos tab:** `src/app/species/[slug]/PhotosTab.tsx`
  - Client Component. `ResponsiveGrid` (2-col mobile, 3-col tablet, 4-col desktop) of photo tiles.
  - 4:3 aspect ratio, rounded corners, hover zoom + photographer credit overlay.
  - Click opens `PhotoLightbox` with full attribution.

- **About tab:** `src/app/species/[slug]/AboutTab.tsx`
  - Client Component. Summary section (free tier, always visible) or "coming soon" state.
  - Deep dive section: if content exists, shows full text (Phase 1 — no Stripe gating yet). If null, shows teaser UI with gradient fade overlay and "Unlock the full story — A$9.99" CTA placeholder.
  - Similar species section: grid of up to 4 species cards from same family, with hero photos and links to their species pages.

- **Where & When tab:** `src/app/species/[slug]/WhereWhenTab.tsx`
  - Client Component. Location rows with inline 12-month mini bar chart.
  - Each month: colour-coded rectangle (emerald=common, amber=occasional, slate=rare, transparent=no data).
  - Current month highlighted with ring indicator.
  - Location name links to location page, region shown below.
  - `LikelihoodPill` per location (from current month seasonality, falls back to confidence score).
  - Legend row explaining the colour coding.
  - Mobile: columns stack (location info above its seasonality chart).
  - Empty state for species with no location data.

### Deviations
- None. All steps from the implementation prompt completed as specified.
- Tab behaviour for single-photo species (skip Photos tab, default to About) implemented per spec.

### Build
- `npm run build` passes clean. Species page is 47.8 kB first load JS (includes Motion for PhotoLightbox).

---

## Session 10 — Regions Index + Region Page
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Regions index:** `src/app/locations/page.tsx`
  - Server Component. Fetches all published regions with location counts.
  - Hero section with animated gradient background, wave divider transition to content.
  - Grid of region cards (16:9 hero image, name overlaid, location count badge, short description).
  - Sorted alphabetically. Empty state for when no regions are published.
  - SEO metadata targeting "snorkelling spots in Australia" keywords.

- **Region page (server):** `src/app/locations/[region]/page.tsx`
  - Server Component. Fetches region by slug. 404 if not found or not published.
  - Fetches all published locations in the region with species counts and in-season counts.
  - In-season count computed per location: queries all seasonality data, counts species active ≤8 months AND active in current month.
  - Fetches top 24 species across all locations by total observation count.
  - Aggregates seasonality across locations for top species (takes best likelihood per month).
  - `generateMetadata()` — dynamic title, description, OG tags.
  - JSON-LD `TouristDestination` schema.org structured data.

- **Region page (client):** `src/app/locations/[region]/RegionPageClient.tsx`
  - Hero section: full-width image (or gradient fallback), region name (Fraunces), breadcrumb nav, quick facts (location count, in-season indicator), description.
  - Tabs via `TabBar`: Locations (default), Species, Map.
  - Sticky tab bar below header on scroll.
  - CTA banner: "Saw something you can't identify?" → `/id`.
  - Footer included.

- **Locations tab:** `src/app/locations/[region]/LocationsTab.tsx`
  - Client Component. All filtering is client-side (data pre-loaded from server).
  - Filters: activity type dropdown, skill level dropdown, sort by (most species / most in season / alphabetical).
  - `ResponsiveGrid` of `LocationCard` components (1-col mobile, 2-col tablet, 3-col desktop).
  - Results count label. Clear filters button. Empty state with reset.

- **Species tab:** `src/app/locations/[region]/RegionSpeciesTab.tsx`
  - Client Component. "What you might see in [Region]" header.
  - Grid of top species via `SpeciesCard` (2-col mobile, 3-col tablet, 4-col desktop).
  - Uses aggregated seasonality for likelihood pills and in-season badges.

- **Map tab:** `src/app/locations/[region]/RegionMapTab.tsx`
  - Client Component. Mapbox with all location pins in the region.
  - Click pin → popup with location name, species count, in-season count, link to location page.
  - Auto-calculates center and zoom from location spread.
  - Location list below map with pin icons and quick stats.
  - Graceful fallback if Mapbox token not configured.

### Bug fix (cross-session)
- **Missing Header on dark-hero pages:** Location page (`LocationPageClient`), species page (`SpeciesPageClient`), and region page (`RegionPageClient`) were not rendering the `<Header />` component. The Header is `fixed top-0` and overlays the hero, and the heroes had `pt-28` to leave space — but without actually rendering Header, those pages had no navigation. Added `<Header />` to all three client wrappers. The Header's white text + transparent-to-dark-navy style works correctly over the dark hero backgrounds.

### Deviations
- None. All 5 steps from the implementation prompt completed as specified.

### Build
- `npm run build` passes clean. Regions index is 1.8 kB first load JS. Region page is 5.04 kB first load JS (includes Header).

---

## Session 11 — Species ID Tool — Wire to Real Data
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **API route:** `src/app/api/species/identify/route.ts`
  - `GET /api/species/identify` — server-side filtering endpoint.
  - Query params: `location` (slug), `month` (0-11), `size`, `colours` (comma-separated), `habitat`.
  - Location filter: fetches species at that location via `location_species` join. Supports `__all__` sentinel for no-location search.
  - Month filter: queries `species_seasonality` for species active that month with `common` or `occasional` likelihood.
  - Size filter: matches `species.size_category`.
  - Colour filter: checks array overlap with `species.colours`.
  - Habitat filter: checks array inclusion in `species.habitat`.
  - Scoring: match ratio (criteria matched / total criteria) + confidence boost. Labels: Confirmed (all criteria matched, 3+), Likely (>=60%), Possible (any match).
  - Missing enrichment data treated as "no match" (not "exclude") per spec.
  - Returns top 50 results sorted by match score. Handles Supabase pagination and `.in()` batch limits.

- **Updated Species ID wizard:** `src/app/id/page.tsx`
  - Replaced hardcoded `LOCATIONS` with Supabase query. Locations grouped by region with section headers.
  - Added "I'm not sure / Search all species" option for location-agnostic search.
  - Pre-fill behaviour: `?location=slug` URL param pre-fills Step 1 and auto-advances to Step 2 (month). Current month pre-selected.
  - Results section: shows real `SpeciesCard`-style rows with hero photos, common name, scientific name, match label (Confirmed/Likely/Possible colour-coded).
  - Loading states: skeleton placeholders for locations fetch and results fetch.
  - Empty state: "No matches found" with "Go back and adjust" link.
  - Dynamic results header: "We found N matches" with "Showing top 50" note when truncated.
  - Wrapped in `Suspense` boundary for `useSearchParams`.
  - Added `Footer` component.
  - Static data preserved: months, sizes, colours, habitats remain as constants (no query needed per spec).

### Deviations
- None. All 6 steps from the implementation prompt completed as specified.

### Build
- `npm run build` passes clean. `/id` page is 4.29 kB first load JS. API route is 123 B.

---

## Session 12 — Sighting Log + Species Checklist
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **API routes for sightings:**
  - `POST /api/sightings` — create a sighting (authenticated). Body: `{ speciesId, locationId, sightedAt, quantity, notes }`. Validates auth, requires speciesId + locationId.
  - `GET /api/sightings` — get current user's sightings. Optional filters: `?locationId=...&date=...`. Returns reverse chronological.
  - `DELETE /api/sightings/[id]` — delete a sighting (own only). RLS + explicit user_id check.
  - All routes use Supabase server client with user's session (not service role).

- **"Log a Sighting" modal:** `src/components/LogSightingModal.tsx`
  - Client Component. Slide-up modal (mobile-friendly bottom sheet pattern).
  - Species picker: searchable dropdown (Combobox pattern) — type to filter, select from list. Shows up to 50 results.
  - Form fields: species (required), date (default today, max today), quantity (stepper, default 1), notes (optional textarea).
  - Pre-selection support: can be opened with a specific species pre-filled (from quick-log).
  - Success state: checkmark animation + "Added to your collection" confirmation.
  - Error handling: validation messages, API error display.
  - Body scroll lock while open. Backdrop click to close.

- **Quick-log button on species cards:**
  - Updated `SpeciesTab.tsx` — each unspotted species card shows a "+" button (top-left, appears on hover) for authenticated users.
  - Clicking opens the sighting modal pre-filled with that species.
  - "Log sighting" link added to the collection progress bar.

- **Floating "Log a Sighting" FAB:**
  - `LocationPageClient.tsx` — coral floating action button (bottom-right) for authenticated users.
  - Opens the sighting modal without pre-selection.

- **Collection state updates:**
  - `LocationPageClient.tsx` — `handleSightingSuccess` callback adds the newly spotted species to `spottedIds` set, updating the progress bar and checkmark badges in real-time without page reload.

- **Sighting log page:** `src/app/log/page.tsx`
  - Client Component. Redirects to `/login` if not authenticated.
  - Hero section with animated gradient, stats row (total sightings, species spotted, trips count).
  - Fetches all user sightings with batched species, location, and region lookups.
  - Groups by trip (same location + same date = one trip).
  - Each trip card: location name (links to location page), formatted date (relative: "Today", "Yesterday", "3 days ago"; absolute after 7 days), species count badge, species thumbnail grid (up to 8 with overflow count), notes preview (first sighting with notes).
  - Species thumbnails link to species pages. Quantity badge on multi-sightings.
  - Empty state: "No sightings yet" with CTA to explore locations.
  - Loading state: skeleton placeholders.

- **Header updated:** Added "My Log" link for authenticated users (desktop nav + mobile menu).

### Deviations
- None. All 4 steps from the implementation prompt completed as specified.

### Build
- `npm run build` passes clean. `/api/sightings` routes are 131 B each. `/log` page is 3.02 kB first load JS. Location page unchanged at 8.89 kB.

---

## Session 13 — User Profile + Trip Reports
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Database migration:** `supabase/migrations/20260412000000_add_username.sql`
  - Added `username TEXT UNIQUE` column to `users` table with index.
  - Public read policy on `users` table (replaces "own profile only" policy) — needed for `/u/[username]` pages.
  - Public read policy on `sightings` table (replaces "own sightings only" policy) — needed for public trip reports and profiles.

- **Updated TypeScript types:** `src/types/database.ts` — added `username: string | null` to `User` type.

- **Updated signup form:** `src/app/signup/page.tsx`
  - Added username field with live validation (3-30 chars, lowercase alphanumeric + hyphens).
  - Auto-slugifies input. Shows `saltsafari.app/u/` prefix in the input.
  - Checks username uniqueness against `users` table before signup.
  - Stores username in both `auth.users` metadata and `users` table.

- **Updated Header:** `src/components/Header.tsx`
  - Display name now links to `/u/[username]` when user has a username set.

- **User profile page:** `src/app/u/[username]/page.tsx` + `ProfilePageClient.tsx`
  - Server Component fetches user by username, all sightings, batch-fetches species/locations/regions.
  - Groups sightings into trips (same location + date).
  - Computes unique species list sorted by charismatic first, then alphabetical.
  - `generateMetadata()` with OG tags.
  - Client Component: dark hero with avatar (initials), username, join date, stats row (species count, trip count).
  - WaveDivider to sand content area.
  - TabBar: "Trips" (reverse-chronological trip cards with overlapping circular thumbnail stacks, links to `/trips/[tripId]`) and "Spotted" (ResponsiveGrid of SpeciesCard with spotted checkmarks).
  - Empty states for both tabs.

- **Trip detail page:** `src/app/trips/[id]/page.tsx` + `TripPageClient.tsx`
  - Trip ID format: `{userId}-{locationSlug}-{YYYY-MM-DD}` (deterministic, URL-safe).
  - Server Component parses trip ID, fetches user, location, region, sightings, species, total species count at location.
  - `generateMetadata()` with descriptive title and OG tags.
  - Client Component: celebratory dark hero with animated species count badge, headline ("[Name] saw N species at [Location]"), date, animated progress bar (coral-to-teal gradient), CTA buttons (Discover Location + What did you see? + Share).
  - Species grid: ResponsiveGrid of sighting cards with photos, quantity badges, note snippets. Motion staggered fade-in.
  - Share button: mobile FAB (fixed bottom-right) + desktop inline. Uses `navigator.share()` with clipboard fallback. Toast notification on copy.
  - Profile link when user has username.
  - Faint photo mosaic background in hero for visual depth.

- **OG image generation:** `src/app/trips/[id]/opengraph-image.tsx`
  - Edge runtime. 1200x630 standard OG size.
  - Deep navy gradient background with decorative accent circles.
  - Salt Safari branding + date in top bar.
  - Large species count numeral with coral-to-teal gradient.
  - "[Name] at [Location]" headline.
  - Progress bar showing species spotted vs total at location.
  - Photo strip at bottom: up to 6 species photos in rounded tiles, "+N" overflow.

### Deviations
- Q10 (username format) had no answer — implemented option A (user-chosen) as recommended in the implementation prompt.
- No 1080x1080 Instagram variant for OG image — the standard 1200x630 covers iMessage/WhatsApp/Twitter/Facebook which are the primary share targets. Instagram variant can be added later if needed.
- `runtime = "edge"` on OG image route disables static generation for that route (expected, noted by Next.js build warning).

### Build
- `npm run build` passes clean. `/u/[username]` is 4.26 kB first load JS. `/trips/[id]` is 3.2 kB first load JS. OG image route is 135 B.

---

## Session 14 — "In Season Now" Alerts
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **API routes for alerts:**
  - `POST /api/alerts` — subscribe to a species alert (upserts on user+species+location). Body: `{ speciesId, locationId }`. Authenticated.
  - `GET /api/alerts` — list user's alerts with species and location details. Authenticated.
  - `DELETE /api/alerts/[id]` — remove an alert (own only). Authenticated.
  - `PATCH /api/alerts/[id]` — toggle enabled/disabled. Body: `{ enabled: boolean }`. Authenticated.

- **Alert subscribe modal:** `src/components/AlertSubscribeModal.tsx`
  - Client Component. Spring-animated modal (Motion).
  - Shows species name + location name, "Notify me" button.
  - Success state: checkmark animation + auto-close after 1.5s.
  - Error handling with inline message.

- **Alert bell icon on species cards:**
  - `SpeciesTab.tsx` — each species card shows a bell icon button (top-left, below quick-log +) on hover for authenticated users.
  - Already-alerted species show a solid teal bell indicator.
  - `LocationPageClient.tsx` — fetches user's alerts on mount, passes `alertedSpeciesIds` and `onAlertSubscribe` callback to SpeciesTab, renders AlertSubscribeModal.

- **Manage alerts page:** `src/app/alerts/page.tsx`
  - Client Component. Redirects to `/login` if not authenticated.
  - Dark hero with bell icon, wave divider to sand content.
  - Each alert row: species photo + name + scientific name + location name, enable/disable toggle, delete button.
  - Loading skeleton, empty state with CTA to explore locations.

- **Header updated:** Added "Alerts" link (with bell icon) for authenticated users in both desktop nav and mobile menu.

- **Email template:** `src/emails/season-alert.tsx`
  - React Email template. Navy header with Salt Safari branding.
  - Per-species cards with photo, name, likelihood, location.
  - "View species" and "ID tool" links per species. "Log your sighting" CTA.
  - Footer: data attribution disclaimer + manage alerts + unsubscribe links.
  - Subject: "[Species] are at [Location] this month" (single) or "N species are in season this month" (multiple).

- **Alert sender:** `src/lib/alerts/send-alerts.ts`
  - Queries all enabled `species_alerts` with species + location data.
  - Joins with `species_seasonality` for current and previous month.
  - Only sends alerts when species TRANSITIONS into season (previous month was rare/absent, current month is common/occasional).
  - Groups alerts by user — one email per user with all their in-season species.
  - Respects `notification_prefs = 'none'` (skips those users).
  - Fetches user emails via Supabase admin API.
  - Renders React Email template to HTML, sends via Resend.
  - Supports `--dry-run` mode for testing.

- **Cron API route:** `src/app/api/cron/alerts/route.ts`
  - GET endpoint protected by `CRON_SECRET` bearer token.
  - Calls `sendSeasonAlerts()` and returns results.

- **CLI script:** `scripts/send-alerts.ts`
  - Usage: `npm run send-alerts [-- --dry-run]`
  - Package.json script: `"send-alerts": "npx tsx --env-file=.env.local scripts/send-alerts.ts"`.

- **Vercel cron config:** `vercel.json`
  - Cron job: `/api/cron/alerts` runs on the 1st of each month (`0 0 1 * *`).

- **Dependencies added:** `resend`, `@react-email/components`.

- **Env vars:** Added `CRON_SECRET` and `NEXT_PUBLIC_BASE_URL` to `.env.example`.

### Deviations
- Q3 (Resend API key) and Q13 (sender domain) — no answers provided in `22-implementation-questions.md`. Using values from `.env.local` (`RESEND_API_KEY` and `RESEND_FROM_EMAIL=alerts@earthandwonder.com`).
- Alert subscription on the species page (from species → location context) not implemented — the species page doesn't have a single location context. Users subscribe via the location page's species cards where both species and location are known. The alerts management page is accessible from the species page via the header.
- No "Get alerts" link on individual species cards (SpeciesCard component) — the bell icon is overlaid on the card wrapper in SpeciesTab instead, matching the quick-log button pattern.

### Build
- `npm run build` passes clean. `/alerts` page is 2.6 kB first load JS. API routes are 142 B each. Location page unchanged at 9.14 kB.

---

## Session 15 — Homepage: Wire to Real Data
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Server Component data fetching:** `src/app/page.tsx`
  - Fetches real counts from Supabase: species (published), locations (published), regions (published).
  - Fetches In Season Now species via `species_seasonality` for current month (common/occasional likelihood), joined with species, location_species, locations, and regions.
  - Computes active month counts per location_species to determine seasonal vs year-round (≤8 active months = seasonal).
  - Three-tier priority fill: (1) seasonal + charismatic + in season → pulsing green badge, (2) seasonal + in season → green badge, (3) charismatic year-round → "Year-round" pill.
  - Daily-seeded shuffle (mulberry32 PRNG seeded with YYYYMMDD) for deterministic tiebreaking within tiers — same cards all day, different tomorrow. Preserves ISR caching.
  - Deduplicates species across locations (shows each species once at its first-encountered location).
  - Capped at 8 species for the homepage row.
  - Fetches published regions with location counts.
  - `revalidate = 3600` for ISR (hourly revalidation).

- **Client Component:** `src/app/HomePageClient.tsx`
  - Adapted from existing prototype. Preserved: hero gradient + caustic overlay, search bar styling, phone mockup for Species ID promo, overall section structure.
  - **Hero:** Real stats from database (species count with `toLocaleString()`, location count, region count). Singular/plural "Region(s)".
  - **Search bar:** Now links to `/locations` instead of being a non-functional input.
  - **In Season Now:** Real species cards with hero photos, season badges (pulsing green for seasonal, "Year-round" pill for charismatic backfill), location names, month ranges. Horizontal scroll on mobile, 4-5 col grid on desktop. "Get alerts" link points to `/alerts` (not `/premium`).
  - **Alert teaser:** Updated copy — "Get monthly alerts when your favourite species come into season" with "Set up alerts" CTA linking to `/alerts`.
  - **Explore by Region:** Real region data with hero images (gradient fallback if no image), location counts, capped at 6. "View all regions" link if >6 regions.
  - **Species ID promo:** Preserved phone mockup and copy unchanged. CTA links to `/id`.
  - **Premium section:** Updated from subscription pricing (A$4.99/mo, A$39.99/yr) to one-off A$9.99 purchase. New copy: "Lifetime access", "One-off purchase" badge, "No subscription. Pay once, keep forever." CTA: "Unlock Premium — A$9.99". Removed "Start Free Trial" and "Cancel anytime" text.
  - **Footer:** Replaced inline footer with `<Footer />` component from Session 7.
  - **Header:** `<Header />` rendered for navigation.

- **Used shared components:** `Header`, `Footer`, `WaveDivider`.

### Deviations
- Search bar is now a link to `/locations` rather than a non-functional input — Phase 2 will add real search (per plan: "Search bar deferred to Phase 2").
- In Season section hidden entirely if no species are in season (graceful empty state rather than showing stale/empty section).
- Species without hero photos are excluded from homepage cards (visual quality requirement).

### Build
- `npm run build` passes clean. `/` page is 4.37 kB first load JS.

---

## Session 16 — Browse All Species + Credits + SEO
**Date:** 2026-04-13
**Status:** Complete

### What was built
- **Browse All Species page:** `src/app/species/page.tsx` + `src/app/species/SpeciesBrowseClient.tsx`
  - Server Component fetches all published species with `count: "exact"`. Extracts unique colours and habitats for filter options.
  - Client Component handles search (by common/scientific name), filters (size, colour, habitat), sorting (A–Z or taxonomic), and pagination (50/page via URL search params).
  - Sticky filter bar with dropdown filters, active filter pills (coral accent), sort toggle (A–Z / Taxonomy), clear all button.
  - `ResponsiveGrid` (2-col mobile, 3-col desktop) of `SpeciesCard` components.
  - Pagination with smart page number generation (ellipsis for large page counts).
  - Sand background, subtle hero with species count.
  - JSON-LD `CollectionPage` structured data.

- **Credits page:** `src/app/credits/page.tsx`
  - Server Component. Fetches photos grouped by photographer + source + license, with photographer website URLs.
  - Table: photographer name (linked if website available), source (human-readable labels), license, photo count.
  - Alternating row colors (sand/white). Tabular nums for counts.
  - Data Sources section below table: iNaturalist, ALA, OBIS, WoRMS attribution.

- **XML Sitemap:** `src/app/sitemap.ts`
  - Dynamic generation from Supabase. Queries published regions, locations (with region slugs for correct URL paths), and species.
  - Static pages: homepage, /species, /locations, /id, /credits, /privacy, /terms.
  - Priority: homepage 1.0, browse pages 0.9, regions 0.8, locations 0.7, species 0.6.

- **Robots.txt:** `src/app/robots.ts`
  - Allows all crawlers on `/`. Disallows `/api/`, `/auth/`, `/login`, `/signup`.
  - Points to sitemap at `saltsafari.com.au/sitemap.xml`.

- **Canonical URLs:**
  - Added `metadataBase: new URL("https://saltsafari.com.au")` to root `layout.tsx`.
  - Added `alternates.canonical` to species detail pages (`/species/[slug]`), location pages (`/locations/[region]/[site]`), and region pages (`/locations/[region]`).

- **Structured data:**
  - Location pages already had `TouristAttraction` JSON-LD (Session 10).
  - Species detail pages already had `Thing` JSON-LD (Session 9).
  - Added `CollectionPage` JSON-LD to the species browse page.

### Deviations
- No structured data added to the homepage — it already has structured data via `HomePageClient` (Session 15).
- Filters are client-side (all species loaded at once). Acceptable for current dataset size; can be moved server-side if species count grows to thousands.

### Build
- `npm run build` passes clean. `/species` browse page is 5.41 kB, `/credits` is 1.96 kB.

---

## Session 17 — Spottable Species, Spotted Tab, Species ID Scoring, Homepage Redesign
**Date:** 2026-04-13
**Status:** Complete

### What was built

#### Spottable species system
- **Database migration:** `supabase/migrations/20260413000000_add_is_spottable.sql`
  - Added `is_spottable BOOLEAN DEFAULT false` column to `location_species` table with index.

- **Spottable classification script:** `scripts/set-spottable.ts`
  - CLI tool: `npx tsx scripts/set-spottable.ts --location <slug> [--dry-run] [--max 200]`
  - Taxonomic filtering: excludes algae, sponges, worms, bryozoans, birds, and most molluscs (only cephalopods + nudibranchs pass).
  - Charismatic taxa (sharks, rays, turtles, seahorses, cephalopods, whales, seals) guaranteed spottable with ≥30 observations.
  - Regular species spottable with ≥3 observations, up to a per-site cap (default 200).
  - Fetches all location_species with species taxonomy from Supabase, applies filters, updates `is_spottable` in batch.

- **Orchestrator integration:** `src/lib/pipeline/orchestrator.ts`
  - Added `markSpottableSpecies()` function with identical taxonomic logic to the standalone script.
  - Automatically called at the end of pipeline runs to set `is_spottable` on freshly ingested data.

#### Spotted Tab (new)
- **New component:** `src/app/locations/[region]/[site]/SpottedTab.tsx`
  - Client Component. Separate tab on location pages showing species as a checklist/collection.
  - Progress bar: "X of Y spotted" with gradient fill for authenticated users. CTA to sign up for unauthenticated users.
  - Species sorted: spotted species first, then by observation count.
  - Quick-log "+" button on unspotted species cards.
  - Grid layout via `ResponsiveGrid` (2-col mobile, 3-col tablet, 4-col desktop).

- **Location page updated:** `src/app/locations/[region]/[site]/page.tsx`
  - Added "Spotted" tab alongside Species, About, Map.
  - Passes `spottableCount` and spotted data to the new tab.
  - Updated TypeScript types: added `is_spottable` to database types.

#### Species ID scoring improvements
- **Weighted scoring:** `src/app/api/species/identify/route.ts`
  - Replaced simple match-count scoring with weighted criteria: colour (weight 4), size (weight 3), habitat (1.5), seasonality (1.5).
  - Colour matching is now proportional — matching 2/3 selected colours scores higher than 1/3.
  - Reduced confidence boost from 0.1 to 0.03 max, so observation count can't flip rankings over actual trait matches.
  - Added debug logging for top 10 results (scoring breakdown).

#### Homepage redesign — Cabbage Tree Bay focus
- **Server component:** `src/app/page.tsx`
  - Changed from generic multi-location homepage to Cabbage Tree Bay-focused landing page.
  - Replaced hero copy: "Discover what lives beneath the surface" → "{speciesCount}+ species call this place home."
  - Stats now show species count + in-season count (removed location/region counts).
  - Added user authentication check — fetches logged-in user's sighting data at CTB.
  - Personalised collection preview: spotted species shown first with "revealed" state, unspotted silhouetted.
  - Personalised trip report card: shows user's latest log data (species count, location, date, species images).
  - Progress bar shows real spotted/spottable ratio for logged-in users.
  - Changed from `revalidate = 3600` (ISR) to `dynamic = "force-dynamic"` (needs auth check per request).

- **Client component:** `src/app/HomePageClient.tsx`
  - Dual CTAs: "Explore the species" (coral button → location page) + "What did I just see?" (outline button → ID tool).
  - In Season section header: "Visiting this month? Look for these."
  - Collection section: real progress bar based on user data. "Log a sighting" link (logged-in) vs "Sign up" (logged-out).
  - Trip report card: shows user's real latest trip data when logged in, mock data when logged out.
  - CTA copy updates: "Create your free account" → "Log a sighting" when logged in.
  - New props: `userSpottedCount`, `userLatestLog`, `isLoggedIn`.

- **Hero image upload script:** `scripts/upload-location-hero.ts`
  - One-off script to download Cabbage Tree Bay panoramic image from Wikimedia Commons, upload to R2, and set as location hero image.
  - Creates photo record with full attribution (photographer, license, source URL).

### Deviations
- Homepage is now single-location focused (Cabbage Tree Bay) rather than multi-location. This is intentional — launching with one location first.
- Homepage changed from ISR to dynamic rendering to support per-user personalisation.

---

## Session 18 — Design Polish, Auth Flow, and UX Fixes
**Date:** 2026-04-13
**Status:** Complete

### What was built

#### Auth flow improvements
- **Login redirect preservation:** `src/app/login/page.tsx`
  - Added `redirectTo` query param support. After login, redirects to the page the user was on (instead of always going to `/`).
  - Google OAuth passes `redirectTo` through to the auth callback.
  - "Sign up" link preserves `redirectTo` when switching between login/signup.
  - Wrapped in `Suspense` boundary for `useSearchParams`.

- **Signup redirect preservation:** `src/app/signup/page.tsx`
  - Same `redirectTo` param support as login page.
  - Google OAuth passes redirect through.
  - "Sign in" link preserves `redirectTo`.
  - Wrapped in `Suspense` boundary.

- **Header auth-aware links:** `src/components/Header.tsx`
  - Sign in / Sign up links now include `redirectTo` with the current pathname (via `usePathname`).
  - "My Log" link moved outside the auth conditional — always visible (both desktop and mobile nav), not just for logged-in users.

- **Location page login redirect:** `src/app/locations/[region]/[site]/LocationPageClient.tsx`
  - "Log Sighting" FAB now always visible (was hidden for unauthenticated users).
  - Clicking when not authenticated redirects to login with `redirectTo` set to current location page.
  - `handleOpenSightingModal` checks `isAuthenticated` before opening modal.

- **Protected page redirects:**
  - `src/app/log/page.tsx` — redirect to `/login?redirectTo=%2Flog` (was just `/login`).
  - `src/app/alerts/page.tsx` — redirect to `/login?redirectTo=%2Falerts` (was just `/login`).

#### Infinite scroll on species lists
- **SpeciesTab:** `src/app/locations/[region]/[site]/SpeciesTab.tsx`
  - Added IntersectionObserver-based infinite scroll. Initial batch of 24 species, loads 24 more when sentinel enters viewport (400px root margin).
  - Resets visible count when filters change.

- **SpottedTab:** `src/app/locations/[region]/[site]/SpottedTab.tsx`
  - Same infinite scroll pattern as SpeciesTab (batch size 24, IntersectionObserver).
  - Added "View all your sightings" link below progress bar (links to `/log`).
  - Quick-log "+" button now always visible (was hover-only), redirects to login if not authenticated.

#### Sighting log page redesign
- **Trip card layout:** `src/app/log/page.tsx`
  - Replaced small thumbnail grid with full species list layout.
  - Each sighting: 128px square image, common name, scientific name, quantity badge, notes.
  - Removed overflow count indicator and "notes preview" section (notes now inline per species).

#### LogSightingModal improvements
- **Auto-close:** `src/components/LogSightingModal.tsx` — modal auto-closes 1.2s after successful sighting log.
- **Mobile input sizing:** Search, date, and notes inputs use `text-base sm:text-sm` to prevent iOS zoom on focus.

#### Location page mobile fixes
- **Breadcrumb overflow:** `src/app/locations/[region]/[site]/LocationPageClient.tsx`
  - Added `overflow-hidden`, `shrink-0` on breadcrumb segments, `truncate` on location name to prevent horizontal scroll.
  - Added `overflow-x-hidden` on page container.

#### Homepage personalisation polish
- **HomePageClient:** `src/app/HomePageClient.tsx`
  - Alert teaser copy split into heading + subtext for better readability.
  - Collection progress bar now shows real data for logged-in users.
  - Trip report card and CTA section: mobile-first ordering with `order-1`/`order-2` classes (text above card on mobile, beside on desktop).
  - Species ID promo section: same mobile-first ordering fix (text above phone mockup on mobile).

#### Data cleanup
- **Migration:** `supabase/migrations/20260413100000_delete_bull_shark.sql`
  - Removes Bull Shark species and associated photos from the database (incorrect data for Cabbage Tree Bay).

### Deviations
- None.

---

## Session 19 — Homepage Simplification, Trip Polish, Spottable Counts, Pricing Model Update
**Date:** 2026-04-14
**Status:** Complete

### What was built

#### Homepage hero image + simplification
- **Server component:** `src/app/page.tsx`
  - Fetches `hero_image_url` from Cabbage Tree Bay location record and passes to client.

- **Client component:** `src/app/HomePageClient.tsx`
  - Hero now displays location hero photo as full-bleed background image with gradient overlay (`from-deep/90 via-deep/55 to-deep/25`), falling back to caustic overlay if no image.
  - Heavy drop shadows on all hero text for readability over photo.
  - Reduced hero height from `100svh` to `70svh`.
  - Removed dual CTA buttons and stats row from hero — cleaner, more visual-first layout.
  - Copy tweak: "snorkelling spot" → "swim spot".
  - Subtitle text opacity increased (`white/70` → `white/90`).

#### Trip page polish
- **Server component:** `src/app/trips/[id]/page.tsx`
  - Fetches current-month likelihood for each species at the trip location via `species_seasonality`.
  - Passes `likelihood` field to each `TripSighting`.
  - Progress bar now counts spottable species only (`.eq("is_spottable", true)`).
  - Spottable count query now also filters to published species (`.eq("species.published", true)`) to match location page logic.

- **Client component:** `src/app/trips/[id]/TripPageClient.tsx`
  - Sighting cards now show `LikelihoodPill` (common/occasional/rare) when data available.
  - Date format now uses relative labels: "Today", "Yesterday", weekday name for <7 days, then ordinal format ("Monday, 14th April '26").
  - Progress bar label changed to "{displayName} has found X of Y spottable species".
  - Removed large species-count numeral circle from hero — cleaner layout.
  - Headline split: "saw X species" on first line, "at {locationName}" as a separate clickable link with hover arrow.
  - Removed "Discover {locationName}" CTA button (location link now in headline).
  - Share button text capitalised: "Share With Your Swim Group".

#### Sighting log — trip report links
- **Log page:** `src/app/log/page.tsx`
  - Trip cards now include "View trip report" link and "Share" button.
  - Passes `userId` to `TripCard` component to construct trip URLs (`/trips/{userId}-{locationSlug}-{date}`).
  - Share uses `navigator.share()` with clipboard fallback.
  - Trip card header redesigned: date is now the primary heading (was location name), location shown below with map pin icon as a link.
  - Date formatting updated: "X days ago" replaced with weekday name for 2-6 days ago, ordinal format for older dates.

#### Region page — spottable species counts
- **Region page:** `src/app/locations/[region]/page.tsx`
  - Species count and in-season count queries now filter to spottable species only (`.eq("is_spottable", true)`).
  - Consistent with the spottable system introduced in Session 17.

#### Header — profile link + username lookup
- **Header:** `src/components/Header.tsx`
  - "My Profile" link now queries `users` table for username and links to `/u/{username}` if available, falls back to `/log`.
  - z-index increased from `z-50` to `z-[100]` to ensure header stays above all content.
  - Mobile menu `max-h` increased from `max-h-80` to `max-h-[32rem]` and added top padding for better spacing.

#### Spotted tab — search + info tooltip
- **Spotted tab:** `src/app/locations/[region]/[site]/SpottedTab.tsx`
  - Added search bar to filter species by common name or scientific name with clear button.
  - Added info tooltip (?) button next to "X of Y spotted" explaining what "spottable" means (shows count of spottable vs total species).
  - Accepts new `totalSpeciesAtLocation` prop for the info tooltip context.
  - "Log sighting" button repositioned to bottom-right of progress section.
  - Visible count resets when search query changes.

- **Location page:** `src/app/locations/[region]/[site]/LocationPageClient.tsx`
  - Default tab changed from "species" to "spotted".
  - Tab labels: "Species" → "All Species".
  - Tab order: Spotted first, then All Species, About, Map.
  - Passes `totalSpeciesAtLocation` to `SpottedTab`.

#### Species browse — dark hero
- **Species browse:** `src/app/species/SpeciesBrowseClient.tsx`
  - Hero section restyled from light (`bg-sand`) to dark gradient with caustic overlay, matching site-wide hero pattern.
  - Text and search input colours updated for dark background (white text, translucent input).

#### Auth forms — minor copy tweaks
- **Login:** `src/app/login/page.tsx` — "Sign In" button label changed to "Log In".
- **Signup:** `src/app/signup/page.tsx` — "Display name" label changed to "First name", placeholder to "Your first name".

#### Pricing model update — Cabbage Tree Bay always free
- **Plan doc:** `docs/18-plan-app-website-build.md`
  - Added "Cabbage Tree Bay is always free" policy — all premium features (Species ID tool, species deep dives) permanently free for the flagship location.
  - Updated pricing table to three columns: Free (all locations), Free (CTB only), Paid (other locations).
  - Paywall only applies when users access premium features for non-CTB locations.

### Deviations
- None.

---

## Session 20 — Design Polish & Adjustments Implementation
**Date:** 2026-04-14
**Status:** Complete

### What was built

#### Implemented `docs/24-adjustments.md` — major feature batch

##### Bottom navigation bar (new)
- **New component:** `src/components/BottomNav.tsx`
  - Sticky app-style footer nav with icon buttons: Home, Species, Log (center FAB), Alerts, Profile.
  - Auth-aware — shows login link when logged out, username when logged in.
  - Hidden on login/signup pages.
  - Active state detection via pathname matching.
  - Center "Log" button styled as raised circular FAB with coral background.

##### Community sightings pages (new)
- **Calendar page:** `src/app/locations/[region]/[site]/community/page.tsx` + `CommunityCalendarClient.tsx`
  - Browse what everyone spotted at a location by date.
  - Monthly calendar grid with dot indicators for days with sightings.
  - Lists recent community sighting days with species counts and participant counts.
- **Day detail page:** `src/app/locations/[region]/[site]/community/[date]/page.tsx` + `CommunityDayClient.tsx`
  - Shows all species spotted by all users at a location on a specific day.
  - Individual swimmer cards with their sightings.
  - "See what everyone saw" linked from trip pages.

##### Spotter tier system (new)
- **Tier logic:** `src/lib/spotter-tiers.ts`
  - 8 tiers based on total species spotted: Landlubber (0) → Beachcomber (1-5) → Rockpool Ranger (6-15) → Reef Scout (16-30) → Current Rider (31-50) → Kelp Keeper (51-75) → Tide Master (76-100) → Sea Legend (101+).
- **Badge component:** `src/components/SpotterTierBadge.tsx`
  - Displays tier name with themed colour (slate → sky → teal → emerald → amber → purple → rose → yellow).
  - Shows on profile pages and trip reports.

##### Trips → Swims rename
- **Moved:** `src/app/trips/` → `src/app/swims/`
  - `[id]/page.tsx`, `[id]/TripPageClient.tsx`, `[id]/opengraph-image.tsx` all relocated.
  - References updated throughout.

##### Homepage updates
- **`src/app/HomePageClient.tsx`:**
  - Significant redesign with improved section structure.
  - Community section added (later commented out in Session 21).
  - Copy improvements throughout.
- **`src/app/page.tsx`:**
  - Layout adjustments for new homepage structure.

##### Log page improvements
- **`src/app/log/page.tsx`:**
  - Enhanced trip card layout and styling.
  - Improved visual hierarchy.

##### Spotted tab enhancements
- **`src/app/locations/[region]/[site]/SpottedTab.tsx`:**
  - Major UI overhaul with improved search and filtering.

##### LikelihoodPill — hide "common"
- **`src/components/LikelihoodPill.tsx`:**
  - "Common" likelihood pill no longer displayed (per feedback: "common" takes away from the magic).

##### Other UI refinements
- **`src/app/globals.css`:** New utility styles added.
- **`src/components/Footer.tsx`:** Layout updates.
- **`src/components/SpeciesCard.tsx`:** Card interaction polish.
- **`src/app/u/[username]/ProfilePageClient.tsx`:** Profile page updates for spotter tiers.
- **`src/app/login/page.tsx` / `src/app/signup/page.tsx`:** Minor copy tweaks.
- **`src/app/species/SpeciesBrowseClient.tsx`:** Design consistency improvements.

##### Documentation
- **New:** `docs/24-adjustments.md` — User feedback and adjustment requests.
- **New:** `docs/25-parallel-agent-prompts.md` — Implementation guidance for parallel agents.

### Deviations
- None.

---

## Session 21 — Navigation Rework, Copy Polish, Data Fixes
**Date:** 2026-04-14
**Status:** In progress (uncommitted changes)

### What was built

#### Bottom nav restructured
- **`src/components/BottomNav.tsx`:**
  - "Home" button → "All Species" (links to CTB species tab).
  - "Species" button → "ID Tool" (links to `/id?location=cabbage-tree-bay`).
  - "Log" button label → "Spot".
  - Fish icon replaces home icon for All Species; magnifying glass icon for ID Tool.

#### Header — removed community link
- **`src/components/Header.tsx`:**
  - Removed "Community" from desktop nav links.

#### Homepage — commented out community section
- **`src/app/HomePageClient.tsx`:**
  - Community section commented out (not ready for launch).
  - "Cabbage Tree Bay Aquatic Reserve" → "Cabbage Tree Bay" (shorter).
  - Location name text size increased (`text-sm` → `text-lg`).
  - Species count now rounds to nearest thousand (`speciesCount` → `Math.round(speciesCount / 1000) * 1000`).
  - Copy tweaks throughout:
    - "Visiting this month?" → "Swimming this month? Look out for these visitors."
    - "Got a species you're excited about?" → "Is there a species you're excited to see?"
    - "Your underwater collection" → "Your underwater gallery"
    - Collection description simplified to focus on CTB specifically.
    - "Remember what you saw." → "Log your adventures"
    - "swim report" → "swim card"
    - "Know before you go" → "About the reserve"

#### Homepage data fetching — pagination + deduplication
- **`src/app/page.tsx`:**
  - Species query now paginates in batches of 500 (was single unbounded query) to handle large species counts.
  - Added species deduplication by `species_id`, keeping the row with the most observations (matches location page logic).
  - Seasonality query separated from species query (no longer `Promise.all`).

#### Region page — in-season count fix
- **`src/app/locations/[region]/RegionPageClient.tsx`:**
  - In-season count now derived from `topSpecies.filter(sp => sp.isInSeason).length` instead of `Math.max` across locations (was inaccurate).
  - Hero badge now shows actual count: "X in season now" instead of generic "Species in season now".

#### Wave divider fix
- **`src/app/alerts/page.tsx`** and **`src/app/locations/page.tsx`:**
  - `WaveDivider` moved inside hero `<section>` to fix layout gap issues.

#### Card interaction polish
- **`src/app/globals.css`:**
  - Added `.card-lift:active` scale-down effect (`scale-[0.97]`) for tactile mobile feedback.

### Deviations
- None.

---

## Session 22 — Mapbox Maps on All Pages (Implementation Prompt Session 20)
**Date:** 2026-04-14
**Status:** Complete

### What was built

#### Shared map component
- **New component:** `src/components/MapView.tsx`
  - Reusable wrapper around `react-map-gl/mapbox` Map component.
  - Props: `center` (lat/lng), `zoom`, `height`, `children`, `style`.
  - Encapsulates Mapbox token check, `NavigationControl`, map style, scroll zoom disabled, attribution hidden.
  - Graceful fallback message when Mapbox token not configured.
  - Rounded corners + border styling matching design system.

- **`MapPin` component** — coral pin marker with optional label (two sizes: default + small).
- **`MapPinSecondary` component** — teal pin for nearby/secondary locations, smaller size with optional label.

#### Location page map tab refactored
- **`src/app/locations/[region]/[site]/MapTab.tsx`:**
  - Refactored to use shared `MapView`, `MapPin`, `MapPinSecondary` components.
  - Nearby locations from same region now shown as teal pins on the map (previously only shown as cards below).
  - Auto-calculates zoom to fit both primary location and nearby locations when coordinates available.
  - Primary location pin (coral) renders on top of nearby pins (teal).

- **`src/app/locations/[region]/[site]/page.tsx`:**
  - Nearby locations query now includes `lat, lng` fields for map pin placement.

- **NearbyLocation type updated** in `page.tsx`, `LocationPageClient.tsx`, and `MapTab.tsx` — added `lat: number | null` and `lng: number | null`.

#### Region page map tab refactored
- **`src/app/locations/[region]/RegionMapTab.tsx`:**
  - Refactored to use shared `MapView` and `MapPin` components.
  - Popup interaction preserved (click pin → location name, species count, in-season indicator, link).
  - Location list below map preserved.

### Deviations
- Supercluster clustering not added — with only one region and one location currently, clustering would add complexity with no benefit. The `supercluster` package is already bundled with `mapbox-gl` and can be integrated when multiple locations per region exist.
- No lazy loading added — maps are already behind tabs, so they only render when the tab is active.

### Build
- `npm run build` passes clean. Location page is 10.5 kB first load JS. Region page is 7.29 kB first load JS.

---

## Session 23 — FishBase Enrichment (Implementation Prompt Session 18)
**Date:** 2026-04-14
**Status:** Complete

### What was built

#### FishBase parquet data download
- Downloaded `species.parquet` (5.0 MB, 36,132 species) and `ecology.parquet` (1.4 MB) from [cboettig/fishbase on HuggingFace](https://huggingface.co/datasets/cboettig/fishbase) (v25.04).
- Stored in `data/fishbase/` (gitignored — large files, CC-BY-NC license).

#### DuckDB dependency
- Installed `duckdb-async` for reading parquet files in Node.js scripts.

#### Enrichment script — derived fields only
- **New:** `scripts/enrich-fishbase.ts`
  - Loads FishBase species + ecology parquet files via DuckDB.
  - Joins species table with ecology table on `SpecCode`, matches to Supabase species by scientific name (case-insensitive).
  - **No raw FishBase data stored** — only our own derived classifications.
  - Supports `--dry-run` flag.
  - Usage: `npx tsx scripts/enrich-fishbase.ts [--dry-run]`
  - **Re-run safe:** can be re-run anytime when new species are added. Overwrites previous values.

#### Derivation rules (for consistency when adding new species)

##### `size_category` — from FishBase `species.Length` (max recorded length in cm)
| FishBase Length | Our category |
|---|---|
| < 5 cm | `tiny` |
| 5–14 cm | `small` |
| 15–39 cm | `medium` |
| 40–99 cm | `large` |
| ≥ 100 cm | `very_large` |

##### `habitat[]` — from FishBase ecology booleans → our 8-tag vocabulary
| FishBase ecology boolean(s) | Our tag |
|---|---|
| `CoralReefs = -1` | `reef` |
| `Sand = -1` OR `SoftBottom = -1` | `sand` |
| `Pelagic = -1` | `open_water` |
| `Crevices = -1` | `crevice` |
| `SeaGrassBeds = -1` | `seagrass` |
| `Rocky = -1` OR `HardBottom = -1` | `rocky_bottom` |
| `Macrophyte = -1` | `kelp` |
| `Intertidal = -1` | `surface` |

If no ecology booleans match, falls back to `species.DemersPelag`:
- `reef-associated` → `reef`
- `pelagic` / `pelagic-neritic` / `pelagic-oceanic` → `open_water`
- `demersal` / `bathydemersal` → `rocky_bottom` + `sand`
- `benthopelagic` → `reef` + `open_water`
- `bathypelagic` → `open_water`

##### `depth_zone` — from FishBase depth fields (shallowest typical depth)
Uses `DepthRangeComShallow` if available, else `DepthRangeShallow`. Based on where the species is typically *found*, not its full range.
| Shallowest common depth | Our zone |
|---|---|
| ≤ 5 m | `snorkel-friendly` |
| 6–18 m | `shallow dive` |
| > 18 m | `deep dive` |

##### `danger_note` — from FishBase `species.Dangerous`
| FishBase Dangerous value | Our note |
|---|---|
| `harmless` | `harmless` |
| `venomous` | `venomous` |
| `traumatogenic` | `can bite or sting` |
| `poisonous to eat` / `reports of ciguatera poisoning` | `poisonous if eaten` |
| `potential pest` / `other` | *skipped* |

##### `where_to_look` — human-readable spotting tips from ecology booleans
Builds a semicolon-separated phrase (max 3 hints) from ecology booleans:
- `Crevices` → "hiding in crevices"
- `Burrows` → "buried in sand"
- `SeaGrassBeds` → "among seagrass"
- `Macrophyte` → "around kelp"
- `CoralReefs` (if not Crevices) → "on the reef"
- `DropOffs` → "near drop-offs"
- `Pelagic` → "hovering mid-water"
- `Intertidal` → "in rockpools and shallows"
- `Sand`/`SoftBottom` (if not Burrows) → "over sandy bottom"
- `Rocky`/`HardBottom` (if not CoralReefs) → "around rocky reef"
- `Benthic` (fallback) → "on the bottom"

Falls back to `DemersPelag` if no ecology booleans: `reef-associated` → "on the reef", `pelagic`/`pelagic-neritic` → "in open water", `demersal`/`bathydemersal` → "near the bottom", etc.

#### Database migrations
- **New:** `supabase/migrations/20260414100000_add_derived_species_fields.sql`
  - Added 3 new columns: `depth_zone`, `danger_note`, `where_to_look`.
  - Cleared previously-written raw FishBase values for CC-BY-NC compliance.
- **New:** `supabase/migrations/20260414200000_drop_max_length_cm.sql`
  - Dropped 6 raw FishBase columns entirely: `max_length_cm`, `depth_min_m`, `depth_max_m`, `depth_common_min_m`, `depth_common_max_m`, `habitat_type`.
  - These columns only ever held CC-BY-NC data. We derive `size_category`, `depth_zone`, and `habitat[]` instead.
- **Updated:** `src/types/database.ts` — added new derived field types, removed all 6 raw FishBase columns.

#### Enrichment results
- **483 of 1,000 species enriched** (48.3% match rate).
- 517 unmatched species are primarily invertebrates (not in FishBase — would need SeaLifeBase for those).
- 0 errors.

#### Species ID tool — depth_zone filter
- **`src/app/id/page.tsx`:** Added "How deep were you?" as step 3 (after month, before size). Three options: Snorkelling (≤5m), Shallow dive (5–18m), Deep dive (18m+). Skippable.
- **`src/app/api/species/identify/route.ts`:** Added `depth_zone` to species query and scoring (weight 2, between habitat at 1.5 and size at 3). Included in match count for Confirmed/Likely/Possible labels.

#### DangerPill component — site-wide safety warnings
- **New:** `src/components/DangerPill.tsx` — red warning pill, compact mode for cards.
  - Shows for `venomous`, `can bite or sting`, `poisonous if eaten`. Hidden for `harmless` and `null`.
- **Added to `SpeciesCard`** — new optional `dangerNote` prop, red pill appears alongside likelihood/season badges.
- **Wired into all 5 SpeciesCard usages:**
  - `SpeciesTab.tsx` (location species grid)
  - `SpottedTab.tsx` (spotted collection grid)
  - `RegionSpeciesTab.tsx` (region species grid)
  - `SpeciesBrowseClient.tsx` (browse all species page — added `danger_note` to type + query)
  - `ProfilePageClient.tsx` (user profile spotted tab — added `danger_note` to type + query)

#### Species detail page — enrichment data display
- **`SpeciesPageClient.tsx` hero badges:**
  - Added `depth_zone` badge (Snorkel-friendly / Shallow dive / Deep dive).
  - Added `danger_note` badge (red, for non-harmless species).
  - Removed `max_length_cm` badge (column dropped).
- **`AboutTab.tsx` — new "Quick facts" section:**
  - Shows above summary content (visible even when summary is "coming soon").
  - Displays: Size, Depth, Habitat (tags as readable labels), Where to look, Safety.
  - Safety shows green "Harmless" text or red DangerPill for dangerous species.

#### Pre-existing build fix
- Fixed `NearbyLocation` type mismatch in `MapTab.tsx` — was missing `lat` and `lng` fields (from Session 22 changes).

#### .gitignore
- Added `data/fishbase/` to `.gitignore`.

### Deviations
- Initially wrote raw FishBase values (depth ranges, max length, habitat type) to the database. User correctly flagged this as copying CC-BY-NC data rather than deriving from it. Script was rewritten to only produce our own classifications. Raw values were cleared and columns dropped.
- SeaLifeBase enrichment (for invertebrates) not implemented — would improve coverage from 48% to ~70-80%. Can be a follow-up task.

### CC-BY-NC compliance note
FishBase parquet files are read as transient input only. The enrichment script reads FishBase values in memory, applies our derivation rules (documented above), and writes only our own classifications to the database. No raw FishBase data is stored in Supabase. The 6 columns that previously held raw FishBase values (`max_length_cm`, `depth_min_m`, `depth_max_m`, `depth_common_min_m`, `depth_common_max_m`, `habitat_type`) have been dropped from the schema entirely.

### Build
- `npm run build` passes clean.

---

## Session 24 — Legal Pages + Cookie Consent (Implementation Prompt Session 22)
**Date:** 2026-04-14
**Status:** Complete

### What was built

#### Privacy Policy — `src/app/privacy/page.tsx`
- Full privacy policy covering: data collected (email, sightings, analytics), Supabase as data processor, Google Analytics, Stripe payments, no sale of data.
- Australian Privacy Act 1988 compliance.
- Sections: information collected, usage, data sharing (lists all processors), retention, cookies, user rights, security, third-party links, changes, contact.
- Lawyer-review disclaimer banner at top.

#### Terms of Service — `src/app/terms/page.tsx`
- Covers: service description, species data disclaimer (informational only, not guaranteed), data attribution (iNat, ALA, OBIS, WoRMS), user accounts, user-generated content license, premium features (A$9.99 one-off), prohibited use, limitation of liability, IP, termination, governing law (NSW), changes, contact.
- Lawyer-review disclaimer banner at top.

#### DMCA & Takedown Policy — `src/app/dmca/page.tsx`
- Takedown request process with 5-step checklist for copyright holders.
- 48-hour response commitment.
- Self-hosting and license audit trail mentioned.
- Also covers attribution corrections.

#### Cookie Consent Banner — `src/components/CookieConsent.tsx`
- Client component, appears on first visit (checks `localStorage`).
- "Accept all" (coral button) and "Essential only" options.
- Stores choice in `localStorage` as `salt-safari-cookie-consent`.
- Positioned above mobile bottom nav (`bottom-20 md:bottom-0`).
- Deep navy card, rounded, shadow. Added to root layout.

#### Footer update — `src/components/Footer.tsx`
- Added "DMCA & Takedowns" link to Legal section.

#### Cross-linking
- All three legal pages link to each other at the bottom.

### Files changed
- `src/app/privacy/page.tsx` — **new**
- `src/app/terms/page.tsx` — **new**
- `src/app/dmca/page.tsx` — **new**
- `src/components/CookieConsent.tsx` — **new**
- `src/components/Footer.tsx` — added DMCA link
- `src/app/layout.tsx` — added CookieConsent component

### Google Search Console
- Not code — user must manually verify domain ownership and submit sitemap URL at search.google.com/search-console.

### Deviations
- None.

---

## Session 23 — Performance Audit & Initial Fixes
**Date:** 2026-04-14
**Status:** Complete (audit + first round of fixes)

### What was built

#### Performance fixes applied
Four targeted fixes for the slowest pages (all verified with `npm run build`):

1. **Location site page deduplication** — `src/app/locations/[region]/[site]/page.tsx`
   - Wrapped `getLocationData` in `React.cache()` to deduplicate the double call from `generateMetadata` + page render.
   - Parallelized seasonality batch queries with `Promise.all` (was sequential for loop).
   - Parallelized nearby location count queries with `Promise.all` (was N+1 sequential).

2. **Species browse ISR** — `src/app/species/page.tsx`
   - Added `export const revalidate = 3600` for 1-hour ISR caching.

3. **Species identify API overhaul** — `src/app/api/species/identify/route.ts`
   - Consolidated 3 separate location lookups into 1.
   - Consolidated 3 separate `location_species` fetches into 1 (selecting `id, species_id, confidence`).
   - Parallelized seasonality and species batch queries with `Promise.all`.
   - Built confidence map from already-fetched data instead of extra queries.

4. **Bottom nav profile race condition** — `src/components/BottomNav.tsx`
   - Added `authLoaded` state. Profile link is `#` (no-op) until auth resolves, preventing premature redirect to `/login`.

#### Performance audit document
- Created `docs/25-performance-audit.md` — comprehensive site-wide performance audit with 12 prioritized tasks (P0–P2), each with file references, problem description, and fix outline. Next session should work through this document.

### Files changed
- `src/app/locations/[region]/[site]/page.tsx` — `React.cache()`, parallel batches
- `src/app/species/page.tsx` — added `revalidate`
- `src/app/api/species/identify/route.ts` — major query consolidation
- `src/components/BottomNav.tsx` — `authLoaded` race condition fix
- `docs/25-performance-audit.md` — **new**

### Deviations
- None.

---

## Performance Audit — Session B: Region Page Query Fix + ISR
**Date:** 2026-04-14
**Status:** Complete

### What was done

#### Step 1: Fixed N+1 query in region page
- **`src/app/locations/[region]/page.tsx`** — Replaced the per-location sequential loop (which ran 60-100+ queries for a 20-location region) with a batched approach:
  1. Single paginated query fetches all `location_species` rows for the entire region at once.
  2. All seasonality data fetched in parallel batches of 200 IDs via `Promise.all`.
  3. Species counts and in-season counts aggregated per location in JS from the batch results.
- In-season logic preserved: species with 1–8 active months (common/occasional) AND active in current month.
- Result: ~3 queries total instead of 60-100+.

#### Step 2: Added ISR to dynamic pages
- `src/app/locations/[region]/page.tsx` — `export const revalidate = 3600`
- `src/app/locations/[region]/[site]/page.tsx` — `export const revalidate = 3600`
- `src/app/species/[slug]/page.tsx` — `export const revalidate = 3600`
- `src/app/credits/page.tsx` — `export const revalidate = 3600`
- None had `force-dynamic` to remove.

#### Pre-existing build fixes (unrelated to Session B)
- `src/app/page.tsx` — Fixed type error: `PostgrestFilterBuilder` is `PromiseLike`, not `Promise`. Changed type annotations from `Promise<...>` to `PromiseLike<...>` for seasonality/active-month batch arrays.
- `src/app/page.tsx` — Added missing `ctbLocationId=""` prop to fallback `<HomePageClient>` render (required by Session A's prop interface changes).

### Build
- `npm run build` passes clean.

---

## Performance Audit — Session D: ID Tool Server-Side + API Route Cleanup
**Date:** 2026-04-14
**Status:** Complete

### What was built

1. **ID tool split into server + client components** — `src/app/id/page.tsx` + `src/app/id/SpeciesIdWizard.tsx`
   - `page.tsx` rewritten as a server component with `revalidate = 3600` (ISR). Fetches locations server-side with parallel queries (locations + regions via `Promise.all`).
   - `SpeciesIdWizard.tsx` is the new `"use client"` component. Receives `locations` as a prop (no more client-side fetch on mount). Uses `useMemo` for `locationsByRegion` grouping. Removed `locationsLoading` state and loading skeleton for locations.
   - `Suspense` boundary wraps the wizard in `page.tsx` with a skeleton fallback.

2. **Removed debug console.logs** — `src/app/api/species/identify/route.ts`
   - Deleted the `console.log("--- Species ID Debug ---")` block that ran `.find()` + `JSON.stringify` on every request.

3. **Added Cache-Control headers to API routes**
   - `src/app/api/species/identify/route.ts` — `public, s-maxage=300, stale-while-revalidate=600`
   - `src/app/api/search/route.ts` — `public, s-maxage=60, stale-while-revalidate=120`. Also removed redundant `export const dynamic = "force-dynamic"`.
   - `src/app/api/alerts/route.ts` — `private, no-store` on both GET and POST success responses (auth-dependent route).

### Files changed
- `src/app/id/page.tsx` — rewritten as server component
- `src/app/id/SpeciesIdWizard.tsx` — **new**, client component extracted from page.tsx
- `src/app/api/species/identify/route.ts` — removed debug logs, added Cache-Control
- `src/app/api/search/route.ts` — removed force-dynamic, added Cache-Control
- `src/app/api/alerts/route.ts` — added Cache-Control headers

### Deviations
- None.

### Build
- `npm run build` passes clean.

---

## Performance Audit — Session C: Loading Skeletons + Auth Provider
**Date:** 2026-04-14
**Status:** Complete

### What was built

1. **Loading skeletons** — Created `loading.tsx` for 5 routes:
   - `src/app/locations/[region]/loading.tsx` — dark hero placeholder + location card grid
   - `src/app/locations/[region]/[site]/loading.tsx` — dark hero + tab bar + species card grid
   - `src/app/species/[slug]/loading.tsx` — dark hero + image placeholder + text lines
   - `src/app/u/[username]/loading.tsx` — dark hero with avatar + stats row + card grid
   - `src/app/credits/loading.tsx` — dark hero + text block lines
   - All use `animate-pulse` on `bg-white/10` (dark) / `bg-slate-100` (light) per Pelagic design system.

2. **AuthProvider context** — `src/components/AuthProvider.tsx`
   - Shared `"use client"` context providing `{ user, username, loading }`.
   - Single `getUser()` call + username fetch on mount, shared across all consumers.
   - Listens to `onAuthStateChange` for login/logout, re-fetches username on auth change.

3. **Layout integration** — `src/app/layout.tsx`
   - Wrapped `{children}`, `<BottomNav />`, and `<CookieConsent />` in `<AuthProvider>`.

4. **Header refactored** — `src/components/Header.tsx`
   - Replaced local auth `useEffect` + `user`/`username`/`loading` state with `useAuth()` hook.
   - Removed `User` type import (no longer needed). Kept `createClient` for `handleSignOut()`.

5. **BottomNav refactored** — `src/components/BottomNav.tsx`
   - Replaced local auth `useEffect` + `username`/`authLoaded` state with `useAuth()` hook.
   - `authLoaded = !loading` alias preserves existing profile link behavior.
   - Removed `createClient` import and `useState`/`useEffect` imports (no longer needed).

### Files created
- `src/components/AuthProvider.tsx`
- `src/app/locations/[region]/loading.tsx`
- `src/app/locations/[region]/[site]/loading.tsx`
- `src/app/species/[slug]/loading.tsx`
- `src/app/u/[username]/loading.tsx`
- `src/app/credits/loading.tsx`

### Files changed
- `src/app/layout.tsx` — added `AuthProvider` wrapper
- `src/components/Header.tsx` — replaced local auth with `useAuth()` context
- `src/components/BottomNav.tsx` — replaced local auth with `useAuth()` context

### Deviations
- None. All 5 steps completed as specified.

### Build
- `npm run build` passes clean.

---

## Performance Audit — Session A: Home Page Performance + Middleware Scoping
**Date:** 2026-04-14
**Status:** Complete

### What was built

1. **Home page auth moved to client side** — `src/app/page.tsx`
   - Removed `supabase.auth.getUser()` and all user-specific data fetching (sightings, spotted species, latest log) from the server component.
   - Collection preview always uses the logged-out path (random shuffle, first 4 revealed). Client recomputes when auth resolves.
   - New prop `ctbLocationId` passed to `HomePageClient` so the client can query sightings.

2. **Home page switched to ISR** — `src/app/page.tsx`
   - Replaced `export const dynamic = "force-dynamic"` with `export const revalidate = 3600` (1-hour ISR cache).
   - Server component now fetches only public data — safe for caching.

3. **Home page data fetching parallelized** — `src/app/page.tsx`
   - Scoped seasonality query to CTB `location_species_id`s (was fetching all site-wide seasonality).
   - Parallelized current-month seasonality batches and active-month-count batches with `Promise.all`.
   - Built lookup map from `location_species_id` to species data for in-season list building.

4. **Client-side auth in HomePageClient** — `src/app/HomePageClient.tsx`
   - Added `useEffect` that calls `getUser()` via browser Supabase client, fetches CTB sightings if logged in.
   - Stores `isLoggedIn`, `userSpottedCount`, `userLatestLog` in component state.
   - `collectionPreview` state initialized from server prop, recomputed client-side when auth resolves (spotted species marked revealed, sorted first).
   - All auth-dependent UI (progress bar, trip card, CTA button, avatar stack) gates on `authResolved` to prevent flash of wrong content.

5. **Middleware scoped to protected routes only** — `src/middleware.ts`
   - Replaced catch-all matcher with explicit allowlist: `/log/*`, `/alerts/*`, `/u/*`, `/api/alerts/*`, `/api/sightings/*`, `/auth/*`.
   - Public pages no longer run middleware (no auth session refresh on every request).

### Files changed
- `src/app/page.tsx` — ISR, removed auth, parallelized queries
- `src/app/HomePageClient.tsx` — client-side auth, collection preview state
- `src/middleware.ts` — scoped matcher to protected routes

### Deviations
- None.

### Build
- `npm run build` passes clean.

---

## Performance Audit — Session E: Replace `<img>` with `next/image`
**Date:** 2026-04-14
**Status:** Complete

### What was built

#### Step 1: Added R2 remote pattern to `next.config.ts`
- Added Cloudflare R2 bucket hostname (`pub-679ea585b55d48a78970795a14563299.r2.dev`) to `images.remotePatterns`.

#### Step 2: Replaced all `<img>` tags with `next/image` across 17 files

**Components (3 files):**
- `src/components/SpeciesCard.tsx` — card image uses `fill` + responsive `sizes`
- `src/components/LocationCard.tsx` — card image uses `fill` + responsive `sizes`
- `src/components/PhotoLightbox.tsx` — wrapped in relative container with `height: 75vh`, uses `fill` + `object-contain`

**Home page (1 file):**
- `src/app/HomePageClient.tsx` — 6 replacements: hero background (`fill` + `priority`), in-season species cards, collection grid thumbnails, avatar stack images (`width`/`height`), discover species cards

**Species pages (3 files):**
- `src/app/species/[slug]/SpeciesPageClient.tsx` — hero image (`fill` + `priority`)
- `src/app/species/[slug]/AboutTab.tsx` — similar species card images (`fill`)
- `src/app/species/[slug]/PhotosTab.tsx` — photo grid items (`fill`)

**Location pages (5 files):**
- `src/app/locations/page.tsx` — region card images (`fill`)
- `src/app/locations/[region]/RegionPageClient.tsx` — hero image (`fill` + `priority`)
- `src/app/locations/[region]/[site]/LocationPageClient.tsx` — hero image (`fill` + `priority`)
- `src/app/locations/[region]/[site]/community/CommunityCalendarClient.tsx` — hero image (`fill` + `priority`)
- `src/app/locations/[region]/[site]/community/[date]/CommunityDayClient.tsx` — hero + species cards (2 instances)

**Other pages (5 files):**
- `src/app/id/SpeciesIdWizard.tsx` — species result thumbnails (`width={80} height={80}`)
- `src/app/log/page.tsx` — sighting row images (`fill`)
- `src/app/swims/[id]/TripPageClient.tsx` — hero mosaic + sighting row images (2 instances)
- `src/app/u/[username]/ProfilePageClient.tsx` — trip card thumbnails (`width={48} height={48}`)
- `src/app/alerts/page.tsx` — species thumbnails (`width={64} height={64}`)

#### Exclusions (as specified)
- `src/app/swims/[id]/opengraph-image.tsx` — uses `ImageResponse` from `next/og`, requires native `<img>`

### Conversion patterns used
- **Hero/fill images:** `fill` + `sizes="100vw"` + `priority` for LCP optimization
- **Card images in aspect-ratio containers:** `fill` + responsive `sizes` (parent already `relative`)
- **Fixed-size thumbnails/avatars:** explicit `width` and `height` props
- **Lightbox modal:** relative container with `style={{ height: "75vh" }}` + `fill` + `object-contain`

### Files changed
- `next.config.ts` — added R2 remote pattern
- 17 source files — replaced `<img>` with `<Image>`, removed eslint-disable comments

### Deviations
- None.

### Build
- `npm run build` passes clean. Zero `@next/next/no-img-element` warnings (only excluded `opengraph-image.tsx` retains native `<img>`).

---

## Header & Auth Fixes
**Date:** 2026-04-15
**Status:** Complete

### What was built

#### Header navigation overhaul
- **Nav links updated:** Removed hardcoded Cabbage Tree Bay / All Species links. Now: Species (`/locations/sydney/cabbage-tree-bay?tab=species`), Identify (`/id`).
- **Desktop search:** Moved from inline (middle of nav) to a search icon on the far right that expands into a full-width search bar, hiding other nav items. Close via X button, Escape, or outside click.
- **SearchBar component:** Added `autoFocus` prop so search input focuses when expanded.
- **Desktop link order:** Species, Identify, Swim Log, Profile/Sign in/Sign up, Alerts (bell icon), Search (magnifying glass icon).
- **Mobile menu:** Unchanged (search remains inline).

#### Auth flow — 4 bugs fixed

1. **Singleton browser client** (`src/lib/supabase/client.ts`): `createClient()` was creating a new `createBrowserClient` instance on every call. Multiple instances competed for the same `navigator.lock` on the auth token, causing `Lock was released because another request stole it` errors and breaking sign out. Fixed with module-level singleton.

2. **Sign out deadlock** (`src/components/AuthProvider.tsx` — root cause, `src/components/Header.tsx` — clean handler): The `onAuthStateChange` callback was `async` and awaited a `.from("users").select("username")` query that hangs forever (table doesn't exist yet / RLS blocks it). This callback runs inside Supabase's `navigator.locks` auth token lock — so the lock was held open indefinitely. Every subsequent auth operation (including `signOut()`) queued behind it and deadlocked. Fix: made the callback synchronous — username query fires via `.then()` so the callback returns immediately and releases the lock. Sign out handler now properly `await`s `signOut()` then does `window.location.href = "/"`.

3. **Middleware matcher** (`src/middleware.ts`): Was limited to 6 route patterns (`/log`, `/alerts`, `/u`, `/api/alerts`, `/api/sightings`, `/auth`), missing `/`, `/login`, `/signup`, `/locations/*`, `/species/*`. Stale auth cookies survived after sign out because middleware didn't run on `/`. Changed to catch-all matcher (excludes only static assets).

4. **Login navigation** (`src/app/login/page.tsx`): Used `router.push()` + `router.refresh()` (soft navigation) after sign in, which skipped middleware. Changed to `window.location.href` for full page load ensuring middleware runs.

#### AuthProvider resilience (`src/components/AuthProvider.tsx`)
- `setLoading(false)` now fires immediately after `getUser()`, before the `.from("users").select("username")` query. The username fetch runs in background — if the `users` table is unreachable or RLS blocks it, the nav still renders.
- Added try/catch around username queries in both `loadUser` and `onAuthStateChange`.

### Files changed
- `src/lib/supabase/client.ts` — singleton pattern
- `src/components/Header.tsx` — nav restructure, search icon, sign out fix
- `src/components/SearchBar.tsx` — `autoFocus` prop
- `src/components/AuthProvider.tsx` — loading state fix, error resilience
- `src/middleware.ts` — catch-all matcher
- `src/app/login/page.tsx` — full navigation after login, removed unused `useRouter`

### Build
- `npm run build` passes clean.
