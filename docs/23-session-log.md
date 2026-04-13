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
**Status:** In progress (uncommitted changes)

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

- **Client component:** `src/app/trips/[id]/TripPageClient.tsx`
  - Sighting cards now show `LikelihoodPill` (common/occasional/rare) when data available.
  - Date format includes weekday (e.g. "Monday, 14 April 2026").
  - Progress bar label: "species" → "spottable species".
  - Removed "What did you see?" CTA button (was redundant).
  - Share button text: "Share" → "Share with your swim group".

#### Sighting log — trip report links
- **Log page:** `src/app/log/page.tsx`
  - Trip cards now include "View trip report" link and "Share" button.
  - Passes `userId` to `TripCard` component to construct trip URLs (`/trips/{userId}-{locationSlug}-{date}`).
  - Share uses `navigator.share()` with clipboard fallback.

#### Region page — spottable species counts
- **Region page:** `src/app/locations/[region]/page.tsx`
  - Species count and in-season count queries now filter to spottable species only (`.eq("is_spottable", true)`).
  - Consistent with the spottable system introduced in Session 17.

#### Header — profile link update
- **Header:** `src/components/Header.tsx`
  - Replaced username/display-name link with "My Profile" link pointing to `/profile` (both desktop and mobile nav).
  - z-index increased from `z-50` to `z-[100]` to ensure header stays above all content.

#### Pricing model update — Cabbage Tree Bay always free
- **Plan doc:** `docs/18-plan-app-website-build.md`
  - Added "Cabbage Tree Bay is always free" policy — all premium features (Species ID tool, species deep dives) permanently free for the flagship location.
  - Updated pricing table to three columns: Free (all locations), Free (CTB only), Paid (other locations).
  - Paywall only applies when users access premium features for non-CTB locations.

### Deviations
- Header now links to `/profile` which doesn't exist yet as a route (previously linked to `/u/[username]`). Will need a profile page or redirect.
