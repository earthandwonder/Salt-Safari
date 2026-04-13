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
