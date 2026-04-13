# Salt Safari — Claude Code Implementation Prompt

> **What this is:** A session-by-session implementation guide for Claude Code to build Salt Safari from the current prototype state to a fully working product. Each session is scoped to fit within a single Claude Code conversation. Sessions must be completed in order within each phase (they have dependencies), but read the full session before starting — some steps within a session can be parallelised.
>
> **How to use:** Start a new Claude Code conversation for each session. Paste or reference this file at the start. Tell Claude which session to work on. Claude should read the referenced docs before writing any code.
>
> **Key docs to reference throughout:**
> - `docs/18-plan-app-website-build.md` — the master plan (schema, API specs, page designs, features)
> - `supabase/migrations/20260411000000_initial_schema.sql` — the database schema
> - `CLAUDE.md` — project conventions and structure

---

## Pre-Session Checklist (do once, before Session 1)

Before any code is written, the user needs to do the following manually:

1. **Create a Supabase project** at [supabase.com](https://supabase.com). Note the project URL, publishable key, and secret key.
2. **Create a Mapbox account** at [mapbox.com](https://mapbox.com). Get a public access token (free tier: 50K map loads/month).
3. **Register for Resend** at [resend.com](https://resend.com). Get an API key (free tier: 3K emails/month).
4. Optional: **Flickr Pro account** + apply for a commercial API key (~A$10/month). Can be deferred to Session 5 if budget is a concern — the photo pipeline works without Flickr, just fewer photos.
5. Optional: **Register an iNaturalist application** at [inaturalist.org/oauth/applications](https://www.inaturalist.org/oauth/applications). Not required (no auth benefit), but gives you an app ID for tracking. Update: Making an app has activity requirements I don't meet yet. Too much effort to make if its not necessary.

**Put all keys in `.env.local`** (never commit this file). The `.env.example` file should be updated with placeholder variable names as you go.

---

## Phase 1: One Beach, Done Right

Goal: Cabbage Tree Bay fully working — pipeline, pages, auth, sighting log, alerts, deploy.

---

### Session 1: Foundation — Database, Auth & Project Scaffolding

**Goal:** Supabase connected, schema migrated, seed data in, auth working, TypeScript types generated, Supabase client helpers created. The app can talk to the database.

**Steps:**

1. **Environment setup**
   - Create `.env.local` with all Supabase keys (URL, publishable key, secret key), Mapbox token, Resend API key. User provides these values.
   - Update `.env.example` with placeholder variable names (no real values).

2. **Run database migration**
   - Use the Supabase CLI or Dashboard SQL editor to run `supabase/migrations/20260411000000_initial_schema.sql`.
   - Verify all 11 tables created, RLS policies active, triggers working.
   - If using Supabase CLI: `npx supabase db push` (requires `supabase/config.toml` — create if missing).

3. **Seed Cabbage Tree Bay**
   - Create `scripts/seed-cabbage-tree-bay.sql` with the seed SQL from the plan doc (Section 1, "Bootstrapping: seed script"). Insert Sydney region + Cabbage Tree Bay location stub.
   - Run it against the database.

4. **Supabase client helpers**
   - Create `src/lib/supabase/client.ts` — browser-side Supabase client (uses `@supabase/ssr` `createBrowserClient`).
   - Create `src/lib/supabase/server.ts` — server-side client for Server Components and Route Handlers (uses `@supabase/ssr` `createServerClient` with cookie handling).
   - Create `src/lib/supabase/middleware.ts` — auth middleware helper for session refresh.
   - Create `src/middleware.ts` — Next.js middleware that refreshes the Supabase auth session on every request.
   - Reference: [Supabase SSR docs for Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs).

5. **TypeScript types**
   - Create `src/types/database.ts` — TypeScript types matching the database schema. Include types for: `Region`, `Location`, `Species`, `LocationSpecies`, `SourceRecord`, `SpeciesSeasonality`, `Photographer`, `Photo`, `User`, `SpeciesAlert`, `Sighting`.
   - These should match the SQL schema exactly. Use the migration file as the source of truth.
   - Also create `src/types/index.ts` that re-exports everything.

6. **Supabase Auth configuration**
   - In the Supabase Dashboard: enable email/password auth and Google OAuth provider.
   - The user will need to configure Google OAuth credentials (Google Cloud Console → OAuth 2.0 Client ID). **If the user hasn't done this yet, skip Google OAuth and come back to it — email/password is enough to proceed.**
   - Create `src/app/auth/callback/route.ts` — the OAuth callback handler that exchanges the code for a session.

7. **Auth UI**
   - Create `src/app/login/page.tsx` — sign-in page with email/password form and Google button.
   - Create `src/app/signup/page.tsx` — sign-up page with email/password + display name field.
   - Keep the UI simple but on-brand (Pelagic design system: navy/sand/coral palette, Fraunces headings, Outfit body). Use `/design` skill for these pages.
   - Wire to Supabase Auth methods: `signInWithPassword`, `signUp`, `signInWithOAuth`.

8. **Update Header**
   - Read `src/components/Header.tsx`. Adapt it (don't rebuild from scratch) to show auth state: logged-in users see their name/avatar + sign-out button; logged-out users see Sign In / Sign Up links.

9. **Install missing dependencies**
   - Check if any additional packages are needed. Likely: none for this session (supabase packages already installed).

10. **Verify**
    - `npm run build` should pass.
    - Manually test: sign up → auto-creates user row in `public.users` (via trigger) → sign in → session persists across pages.

**Guidance:**
- The `@supabase/ssr` package is already in `package.json`. Use it, not the deprecated `@supabase/auth-helpers-nextjs`.
- Never expose `SUPABASE_SECRET_KEY` to the browser. Only use it in Server Components, Route Handlers, and scripts.
- The middleware must refresh the session on every request — without this, server components won't have a valid session.

---

### Session 2: Data Pipeline — iNaturalist Module

**Goal:** A working iNaturalist pipeline module that can query species counts and seasonality for any location.

**Read first:** `docs/18-plan-app-website-build.md` sections: "iNaturalist API: key endpoints", "Verified example API calls", "Spatial query implementation". Also `docs/15-inaturalist-report.md` if it exists.

**Steps:**

1. **Create pipeline module structure**
   - `src/lib/pipeline/inaturalist.ts` — iNaturalist API client
   - `src/lib/pipeline/types.ts` — shared pipeline types (`RawSpeciesRecord`, `SeasonalityData`, `PipelineResult`, etc.)

2. **Implement `queryINaturalistSpecies()`**
   - Accepts: `{ lat, lng, radiusKm, taxonIds }`.
   - Calls `/v1/observations/species_counts` with correct parameters.
   - Makes 4 calls per location, split by marine taxon groups:
     - Call 1: Fish + sharks/rays (`taxon_ids=47178,47273`)
     - Call 2: Cephalopods + nudibranchs (`taxon_ids=47459,47113`)
     - Call 3: Cnidaria + echinoderms (`taxon_ids=47534,47549`)
     - Call 4: Sea turtles + cetaceans + seals + syngnathidae + crustaceans (`taxon_ids=372234,152871,372843,49106,85493`)
   - Always include: `quality_grade=research`, `geoprivacy=open`, `per_page=500`, `locale=en`, `preferred_place_id=6744` (Australia).
   - Returns: array of `{ scientificName, commonName, inatTaxonId, observationCount, photoUrl }`.

3. **Implement `queryINaturalistSeasonality()`**
   - Accepts: `{ lat, lng, radiusKm, taxonId }`.
   - Calls `/v1/observations/histogram` with `interval=month_of_year`, `date_field=observed`.
   - **Do NOT include `geoprivacy=open`** on histogram calls (may not work correctly — documented gotcha).
   - Always include: `quality_grade=research`.
   - Returns: `{ month: number, observationCount: number }[]` (12 entries).

4. **Rate limiting**
   - Implement a simple rate limiter: max 60 requests/minute (the plan recommends this, hard cap is 100).
   - Use a token bucket or simple delay between requests.
   - Log each API call (URL, status, result count) for debugging.

5. **Error handling**
   - Retry on 429 (rate limited) with exponential backoff, max 3 retries.
   - Retry on 500/503 with linear backoff.
   - Log and skip on 404 or other client errors.

6. **Verify**
   - Create a temporary test script or add a `main()` function that queries Cabbage Tree Bay (lat=-33.7983, lng=151.2885, radius=1.5).
   - Log results: should return 100+ species with names and counts.
   - Run seasonality for one species (e.g., Weedy Seadragon taxon_id=54536) and check the monthly distribution looks plausible.

**Guidance:**
- Base URL: `https://api.inaturalist.org/v1/`
- The taxon IDs listed above are from the plan doc and are correct. Don't look them up — use them directly.
- `preferred_place_id=6744` gives Australian common names and endemic/native/introduced status.
- The `/species_counts` endpoint returns `results[].taxon.id` — this is the taxon ID to use for histogram calls. Don't look up taxon IDs separately.
- Parse the full taxonomic hierarchy from the response: `taxon.kingdom`, `taxon.phylum`, `taxon.class`, `taxon.order`, `taxon.family`, `taxon.genus`.
- Also extract `taxon.endemic` and `taxon.native` and `taxon.introduced` (scoped to `preferred_place_id`).

---

### Session 3: Data Pipeline — ALA + OBIS Modules

**Goal:** Working ALA and OBIS pipeline modules.

**Read first:** `docs/18-plan-app-website-build.md` sections: "ALA API: spatial query details", "OBIS API: spatial query details". Also `docs/17-supplementary-api-sources.md` if it exists.

**Steps:**

1. **ALA module** — `src/lib/pipeline/ala.ts`
   - Implement `queryALASpecies()`.
   - Endpoint: `GET https://biocache-ws.ala.org.au/ws/occurrences/search`
   - Parameters: `q=*:*`, `lat`, `lon` (**note: `lon` not `lng`** — easy bug), `radius`, `fq=-data_resource_uid:"dr1411"` (exclude iNat), `fq=class:Actinopterygii OR class:Chondrichthyes` (fish classes — **do NOT include `class:Reptilia`**, it pulls terrestrial snakes), `facets=species`, `pageSize=0`, `flimit=500`, `disableQualityFilter=spatial-suspect`.
   - Returns: array of `{ scientificName, observationCount }`.
   - **Gotchas:** `classs` has three s's in the response JSON (Java reserved word). `lon` not `lng`. No common names — WoRMS will provide them later. No published rate limits — be conservative, add 500ms delay between calls.

2. **OBIS module** — `src/lib/pipeline/obis.ts`
   - Implement `queryOBISSpecies()`.
   - Endpoint: `GET https://api.obis.org/v3/checklist`
   - **No point+radius support** — must convert to WKT bounding box.
   - Implement `pointToBBox()` helper (see plan doc for the exact function).
   - Parameters: `geometry={WKT}`, `taxonid=2` (Animalia — **critical**, without it results are overwhelmingly microbial), `size=500`.
   - Returns: array of `{ scientificName, aphiaId, records }`.
   - **Gotchas:** WKT is longitude-first. `scientificName` must be the WoRMS-accepted name. OBIS `taxonID` in results IS the WoRMS AphiaID — extract it directly. No common names. Seabirds will appear (this is fine — they pass WoRMS marine_only).

3. **Verify both modules**
   - Query Cabbage Tree Bay through each.
   - ALA should return marine fish species (likely 50-200 depending on radius).
   - OBIS should return a broader set (~500+ animal species for a coastal site).

**Guidance:**
- Both modules should return a normalised `RawSpeciesRecord` type (same as iNat module) so the orchestrator can merge them.
- Include `source: 'ala' | 'obis'` in the returned records so provenance is tracked.
- For ALA, the response shape is `facetResults[0].fieldResult[]` — each entry has `label` (scientific name) and `count`.

---

### Session 4: Data Pipeline — WoRMS Resolver + Orchestrator

**Goal:** WoRMS taxonomy resolver working. Multi-source orchestrator that queries all sources, deduplicates, and writes to the database.

**Read first:** `docs/18-plan-app-website-build.md` sections: "WoRMS API: taxonomy normalization", "Deduplication strategy", "Terrestrial filtering & WoRMS resolution failures", "Confidence scoring", "Data pipeline workflow".

**Steps:**

1. **WoRMS resolver** — `src/lib/pipeline/worms.ts`
   - Implement `resolveToWoRMS(scientificName: string)`:
     1. Try exact match: `GET https://www.marinespecies.org/rest/AphiaIDByName/{name}?marine_only=true`
     2. If no match, try fuzzy: `GET https://www.marinespecies.org/rest/AphiaRecordsByMatchNames?scientificnames[]={name}&marine_only=true`
     3. If both fail: return `null` (species is kept with `worms_aphia_id = NULL`, `data_quality = 'partial'`).
   - Implement `getWoRMSRecord(aphiaId: number)` — gets full record including common names.
   - Implement `getWoRMSVernaculars(aphiaId: number)` — gets common/vernacular names (needed for OBIS records which lack them).
   - **Cache AphiaIDs in memory** during a pipeline run to avoid duplicate lookups. A species resolved once doesn't need resolving again.
   - Rate limit: WoRMS has no published limits, but be conservative — 1 request/second.

2. **Multi-source orchestrator** — `src/lib/pipeline/orchestrator.ts`
   - Implement `runPipelineForLocation(locationSlug: string)`:
     1. Fetch the location from the database (get lat, lng, radius_km).
     2. Query all three sources in parallel (iNat, ALA, OBIS).
     3. Normalise all results to `{ scientificName, commonName, source, observationCount, ... }`.
     4. Deduplicate by normalised scientific name (lowercase, trim).
     5. Resolve each unique scientific name to WoRMS AphiaID (with the 3-step fallback).
     6. Merge records with the same AphiaID — sum observation counts, track all sources.
     7. Calculate composite confidence score per species-at-location:
        - Source weight: AIMS/CSIRO survey (ALA) = 1.0, iNat citizen science = 0.7, OBIS = 0.8, range-only = 0.3.
        - Observation count: log-scaled (log10(count + 1) / log10(1000), capped at 1.0).
        - Number of corroborating sources: 1 source = 0.6x, 2 = 0.8x, 3 = 1.0x.
        - Final = weighted average of source scores * corroboration factor.
     8. Upsert species to `species` table (by scientific_name). Set `inat_taxon_id`, `worms_aphia_id`, taxonomic hierarchy, `is_endemic`, `is_native`, `is_introduced`.
     9. Upsert `location_species` records (by location_id + species_id). Set confidence, total_observations, observer_count.
     10. Insert `source_records` for each source per location_species.
     11. Query iNat seasonality for each species (batch, respecting rate limits).
     12. Classify months into likelihood:
         - Months with count > species' monthly average at this location = "common"
         - Below average but non-zero = "occasional"
         - Zero observations = "rare"
         - Skip if total observations < 3 at this location (too sparse).
     13. Insert `species_seasonality` records.
     14. Update location `last_synced_at` and `data_quality` to 'partial'.
   - Log progress and results throughout.

3. **CLI runner** — `scripts/run-pipeline.ts`
   - Accepts `--location <slug>` argument.
   - Loads env vars, creates Supabase service role client, runs the orchestrator.
   - Add to `package.json` scripts: `"pipeline": "npx tsx scripts/run-pipeline.ts"`.
   - Usage: `npm run pipeline -- --location cabbage-tree-bay`.

4. **Verify**
   - Run for Cabbage Tree Bay.
   - Check database: species table should have 100+ entries, location_species should have records with confidence scores, source_records should show provenance, seasonality should have monthly data.

**Guidance:**
- Use the Supabase **secret key** for all pipeline database writes (bypasses RLS).
- The orchestrator is the most complex piece. Take it step by step. Log generously.
- Seasonality calls are the most API-intensive part (one `/histogram` call per species). For 200 species, that's 200 calls at 60/min = ~3.5 minutes. This is fine.
- Species slugs: generate from common name if available, otherwise scientific name. Lowercase, hyphenated. e.g., "Weedy Seadragon" → "weedy-seadragon".
- The `first_observed_month` and `last_observed_month` on `location_species` can be derived from the seasonality data.
- Install `tsx` as a dev dependency if not present: `npm install -D tsx`.

**Findings from Session 3 (ALA + OBIS modules) — important for this session:**
- **Filter junk scientific names from ALA:** ALA faceted results include entries with `scientificName` of "Not supplied" (238 obs at Cabbage Tree Bay). During normalisation (step 3), strip any records where `scientificName` is empty, "Not supplied", or lacks a space (genus-only names without a species epithet). Do this before dedup and WoRMS resolution.
- **Use OBIS AphiaIDs directly — skip redundant WoRMS resolution:** OBIS records already contain WoRMS AphiaIDs in the `taxonID` field (extracted into `wormsAphiaId` by the OBIS module). In step 5, check if a species already has a `wormsAphiaId` from OBIS before calling WoRMS. Only resolve species from iNat and ALA that don't match an existing OBIS AphiaID. This can cut WoRMS API calls by 30-50%.
- **OBIS returns 500 species (sorted by record count desc) from a total of 1,370 for Cabbage Tree Bay.** The un-fetched tail is low-observation species. No pagination needed — 500 is sufficient.
- **ALA confidence weight stays at 1.0.** ALA data (after iNat exclusion) is a mix of AIMS/CSIRO surveys, museum specimens, and structured citizen science programs — all higher quality than casual observations. The log-scale cap at 1000 already neutralises inflated counts from any single source.

**Findings from Session 2 (iNaturalist module) — important for this session:**
- **500-species cap per taxon group:** The iNat `/species_counts` endpoint is called with `per_page=500`. The fish+sharks group (taxon_ids=47178,47273) hit this cap for Cabbage Tree Bay (returned exactly 500). High-diversity locations may truncate long-tail species. Options: (a) accept truncation (the missing species have the fewest observations and lowest confidence), (b) split fish+sharks into two separate calls (47178 and 47273), or (c) add pagination. Recommendation: accept truncation for now — the truncated species are the least observed and add marginal value.
- **Taxonomy fields from iNat are mostly null:** The `/species_counts` endpoint does not return ancestor names — only `ancestor_ids` (numeric) and `iconic_taxon_name` (e.g. "Actinopterygii"). The iNat module stores `iconic_taxon_name` in the `class` field as a rough group; kingdom/phylum/order/family/genus are null. **The WoRMS `getWoRMSRecord()` response must be used to populate the full taxonomic hierarchy** (kingdom, phylum, class, order, family, genus) when upserting to the `species` table. This is the authoritative source for taxonomy.

---

### Session 5: Data Pipeline — Photo Pipeline

**Goal:** Automated photo sourcing from Wikimedia Commons (+ optionally Flickr, CSIRO, iNat). Photos downloaded to Supabase Storage with license audit trail.

**Read first:** `docs/18-plan-app-website-build.md` section "Photo sourcing strategy". `docs/13-marine-photo-sourcing.md` if it exists.

**Steps:**

1. **Supabase Storage setup**
   - Create a `photos` bucket in Supabase Storage (via Dashboard or CLI). Public bucket (images served publicly).
   - Add `NEXT_PUBLIC_SUPABASE_STORAGE_URL` to env if needed (usually `{SUPABASE_URL}/storage/v1/object/public/photos/`).

2. **Wikimedia Commons module** — `src/lib/pipeline/photos/wikimedia.ts`
   - Search by scientific name: `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch={scientificName}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1200&format=json`
   - Parse license from `extmetadata.LicenseShortName`. Accept: `CC BY`, `CC BY-SA`, `CC0`, `Public domain`. Reject: `CC BY-NC`, `CC BY-NC-SA`, or anything else.
   - Parse photographer from `extmetadata.Artist` (strip HTML tags).
   - Download the image (use `iiprop=url` for the direct URL).
   - Rate limit: max 50K requests/hour (generous). Add 200ms delay between requests.

3. **iNaturalist photos module** — `src/lib/pipeline/photos/inaturalist.ts`
   - Query: `/v1/observations?taxon_id={id}&lat={lat}&lng={lng}&radius={radius}&photo_license=cc0,cc-by,cc-by-sa&per_page=5&order_by=votes`
   - Only ~10-20% of iNat photos pass the license filter. This is supplementary.
   - Extract photo URL, observer name, license.

4. **Photo orchestrator** — `src/lib/pipeline/photos/index.ts`
   - For each species in the database (at the given location):
     1. Check if species already has a hero photo. Skip if yes.
     2. Search Wikimedia Commons by scientific name.
     3. If no results, search by common name.
     4. If still nothing, try iNaturalist (cc-by/cc0 only).
     5. Download best photo (largest, best quality).
     6. Upload to Supabase Storage: `photos/{species-slug}/hero.{ext}`.
     7. Insert into `photos` table with full audit trail: source, source_url, license, photographer_name, date_accessed.
     8. Set `is_hero = TRUE`, link to species via `species_id`.
     9. Update `species.hero_image_url` with the public storage URL.
   - Also attempt to get 2-3 additional photos per species (different angles/life stages) — store as non-hero.

5. **Integrate into pipeline runner**
   - Add a `--photos` flag to `scripts/run-pipeline.ts` that runs photo pipeline after species pipeline.
   - Or run separately: `npm run pipeline -- --location cabbage-tree-bay --photos`.

6. **Verify**
   - Run for Cabbage Tree Bay species.
   - Check Supabase Storage: photos uploaded.
   - Check `photos` table: records with correct attribution.
   - Check `species` table: `hero_image_url` populated for species with photos.
   - Expect ~60-75% coverage from Wikimedia alone.

**Guidance:**
- **Never hotlink.** Always download and re-host in Supabase Storage.
- Record `date_accessed` for every photo — this is your legal proof that the license was valid when you accessed it.
- Wikimedia Commons API is generous but can return low-quality results. Sort by image size and prefer photos over illustrations.
- If Flickr API key is available, add it as a second source between Wikimedia and iNat. If not, skip it — Wikimedia + iNat will cover 60-75%.
- CSIRO Science Image doesn't have a proper API — defer to manual sourcing later.
- Photo filenames should be sanitised (no spaces, special chars).

---

### Session 6: Run Pipeline + Validate + Log Learnings

**Goal:** Run the full pipeline for Cabbage Tree Bay, validate the output, tune confidence thresholds, document learnings.

**This session is more review than coding.** Run the pipeline, inspect results, fix issues, tune parameters.

**Steps:**

1. **Run the full pipeline** for Cabbage Tree Bay:
   ```bash
   npm run pipeline -- --location cabbage-tree-bay
   npm run pipeline -- --location cabbage-tree-bay --photos
   ```

2. **Validate species list**
   - Query the database for all species at Cabbage Tree Bay.
   - Check for obvious problems:
     - Terrestrial species that snuck through? (Check `worms_aphia_id IS NULL` records.)
     - Freshwater fish?
     - Duplicate species (same species under different names)?
     - Missing well-known species (Blue Groper, Weedy Seadragon, Port Jackson Shark should be there)?
   - Check confidence scores: do they correlate with observation counts? Are multi-source species scored higher?

3. **Validate seasonality**
   - Check a few charismatic species: do the monthly patterns match known behaviour?
   - Port Jackson Sharks: should show winter peak (May-October).
   - Weedy Seadragons: should be year-round but possibly with breeding season peak.

4. **Validate photos**
   - Check that photos render correctly from Supabase Storage.
   - Check that license metadata is correct.
   - Spot-check a few attributions against the source URL.

5. **Tune and fix**
   - Adjust confidence scoring weights if needed.
   - Fix any pipeline bugs discovered.
   - Remove any false positive species.

6. **Log learnings**
   - Create or update `docs/19-pipeline-learnings.md` with:
     - API quirks discovered
     - Tuning decisions made (e.g., confidence thresholds adjusted)
     - Species that needed manual intervention
     - Photo coverage gaps
     - Timing/performance notes
   - This document is institutional memory for Phase 2 scaling.

7. **Publish Cabbage Tree Bay**
   - Set `published = TRUE` on the Sydney region, Cabbage Tree Bay location, and all validated species.
   - This makes them visible through RLS policies.

**Guidance:**
- This session may require multiple iterations. Run pipeline → inspect → fix → re-run.
- Don't aim for perfection — aim for "good enough to ship." The `data_quality` and `*_status` fields let you publish incrementally.
- Mark unresolved species as `data_quality = 'partial'` and move on. They can be reviewed later via the admin dashboard (Phase 2).

---

### Session 7: Shared UI Components

**Goal:** Build the reusable UI components that multiple pages depend on. These are built before the pages that use them.

**Read first:** `docs/18-plan-app-website-build.md` section "Shared components" and "7b. Page Designs".

**Use the `/design` frontend design skill** for each component. Follow the Pelagic design system as a starting point (deep navy, sand, coral, teal; Fraunces display, Outfit body) but the `/design` skill may improve on it — that's fine.

**Steps:**

1. **`TabBar` component** — `src/components/TabBar.tsx`
   - Generic tab navigation. Props: `tabs: { label: string, id: string }[]`, `activeTab`, `onTabChange`.
   - URL hash sync (clicking a tab updates the URL hash, loading a page with a hash selects the right tab).
   - Keyboard navigation (arrow keys).
   - Underline or pill indicator for active tab.
   - Used on: location page, species page, region page, user profile.

2. **`ResponsiveGrid` component** — `src/components/ResponsiveGrid.tsx`
   - Responsive card grid container. Props: `columns?: { mobile: number, desktop: number }`, `gap?: string`, `children`.
   - Default: 2-col mobile, 3-4 col desktop (varies by usage — the parent specifies).
   - Consistent gap and padding.
   - Used on: homepage, location page species grid, region page, species page photos, spotted grid, trip detail, ID tool results.

3. **`PhotoLightbox` component** — `src/components/PhotoLightbox.tsx`
   - Tap-to-expand overlay for photos. Props: `photo: Photo`, `onClose`.
   - Full attribution overlay: photographer name (linked if photographer has profile), license badge, source link.
   - Close on click outside, Escape key, or X button.
   - Animate open/close with Motion.
   - Used on: species page, location page, trip detail.

4. **`SpeciesCard` component** — `src/components/SpeciesCard.tsx`
   - The species card used in grids on location pages, region pages, etc.
   - Props: species data, likelihood, isInSeason, isSpotted (optional, for collection state).
   - Shows: hero photo (4:3), common name, scientific name, likelihood pill, "In season" badge (pulsing green dot, only for seasonal species active ≤8 months).
   - Spotted state: checkmark badge overlay when `isSpotted = true`.
   - Links to species page.

5. **`LocationCard` component** — `src/components/LocationCard.tsx`
   - Location card for grids on region pages, homepage.
   - Hero image (4:3), location name, species count, skill level pill, depth range, activity tags, "in season" count.

6. **`LikelihoodPill` component** — `src/components/LikelihoodPill.tsx`
   - Reusable pill: "Common" (emerald), "Occasional" (amber), "Rare" (slate).

7. **`SeasonBadge` component** — `src/components/SeasonBadge.tsx`
   - Pulsing green dot + "In season" text.
   - Only renders when the species is truly seasonal (active ≤8 months) AND current month is active.

8. **Wave SVG divider** — `src/components/WaveDivider.tsx`
   - Already styled in `globals.css` (.wave-divider). Create a proper component.

9. **`Footer` component** — `src/components/Footer.tsx`
   - Brand, nav links, data attribution ("Species data from iNaturalist, ALA, OBIS. Taxonomy verified by WoRMS.").
   - Copyright, privacy/terms links (placeholder for now).

**Guidance:**
- Every component should be a separate file in `src/components/`.
- Use TypeScript for all props. Export types where they'll be reused.
- Use Tailwind for all styling. Respect the existing design tokens in `tailwind.config.ts` (deep, coral, sand colors, font-display, font-body).
- The `motion` package is already installed — use it for animations (not `framer-motion`, which is the old name).
- Make components work without JavaScript where possible (progressive enhancement). The TabBar can use URL hash as fallback.
- `npm run build` should pass after this session.

---

### Session 8: Location Page

**Goal:** Build the Cabbage Tree Bay location page — the core content page. Fully working with real data from the database.

**Read first:** `docs/18-plan-app-website-build.md` section "Location page `/locations/[region]/[site]`".

**Use the `/design` frontend design skill.** Follow the plan doc's page structure precisely but let `/design` handle visual execution.

**Steps:**

1. **Create the route** — `src/app/locations/[region]/[site]/page.tsx`
   - Server Component. Fetch location data from Supabase (by region slug + site slug).
   - Fetch all species at this location (join `location_species` + `species` + `species_seasonality` for current month).
   - 404 if location not found or not published.

2. **Hero section**
   - Full-width hero image (location `hero_image_url`, fallback to gradient placeholder).
   - Location name (Fraunces, large), region breadcrumb above.
   - Quick facts row: skill level pill, depth range, activity tags, best time to visit.
   - "Best time to visit" = month with highest average species activity (derived from seasonality data).

3. **Tabs using `TabBar`**
   - Tab 1: **Species** (default)
   - Tab 2: **About**
   - Tab 3: **Map**

4. **Species tab**
   - Count header: "47 species recorded at this location".
   - Filters above grid: "In season now" / "All" toggle, likelihood filter, search within species.
   - `ResponsiveGrid` of `SpeciesCard` components.
   - Default sort: (1) seasonal + in season now, by likelihood descending, (2) common residents, (3) occasional/rare residents, (4) seasonal but not in season.
   - **Collection state for logged-in users:** fetch user's sightings at this location. Show progress bar ("12 of 47 spotted"). Show checkmark badge on spotted species cards. **For unauthenticated users:** progress bar becomes CTA "0 of 47 — sign up to start collecting".
   - **"In season" badge rule:** only for species active ≤8 months out of 12 at this location AND current month is active (`common` or `occasional`).
   - Single server-side query returns all species + current month likelihood + active month count. Client-side filtering for the toggle.

5. **About tab**
   - Long-form location description (the `description` field).
   - Access notes.
   - This is the SEO workhorse content.

6. **Map tab**
   - Mapbox embed showing the location pin.
   - Install `react-map-gl` and `mapbox-gl`: `npm install react-map-gl mapbox-gl`.
   - Use `NEXT_PUBLIC_MAPBOX_TOKEN`.
   - "Open in Maps" button with URI to user's default map app.
   - Nearby locations: horizontal scroll of 3-4 location cards from the same region.

7. **Below tabs**
   - CTA banner: "Saw something you can't identify?" → Species ID tool link. Coral button.

8. **SEO**
   - Dynamic metadata: `generateMetadata()` returns title, description, OG tags for the location.
   - Structured data: `TouristAttraction` schema.org markup.

**Guidance:**
- The species tab is the most complex part. Build the server-side data fetching first, then the UI.
- For collection state: the sighting check needs to be a separate client-side query (or passed as a prop from a server component that checks auth). Don't block the page render on auth state.
- The Mapbox component must be client-side (`"use client"`) — wrap it in a separate component.
- Filters can be client-side (all data loaded in one query, filtered in the browser).
- **Note:** Cabbage Tree Bay won't have a real `description` yet (it's `data_quality: 'stub'`). Show the hero + species tab anyway. Descriptions come from content writing (separate process).

---

### Session 9: Species Page

**Goal:** Build species detail pages with photos, summary, deep dive teaser, and "where & when" data.

**Read first:** `docs/18-plan-app-website-build.md` section "Species page `/species/[slug]`".

**Use the `/design` frontend design skill.**

**Steps:**

1. **Create the route** — `src/app/species/[slug]/page.tsx`
   - Server Component. Fetch species by slug. 404 if not found or not published.
   - Fetch all photos for this species.
   - Fetch all locations where this species appears (join through `location_species`), with seasonality data per location.

2. **Hero section**
   - Full-width hero image (species `hero_image_url`).
   - Common name (Fraunces, very large), scientific name (italic).
   - Quick facts: size category, IUCN status (colour-coded pill), max length.
   - Endemic/Introduced badge (pill) — only if `is_endemic` or `is_introduced` is true. Native is the default, no badge.

3. **Tabs using `TabBar`**
   - Tab 1: **Photos** (default)
   - Tab 2: **About**
   - Tab 3: **Where & When**

4. **Photos tab**
   - `ResponsiveGrid` of photo tiles. Each: photo (4:3, rounded corners), optional caption.
   - Tap to expand → `PhotoLightbox` with full attribution.
   - If only 1 photo exists, show it as hero only (no photos tab — adjust tabs to show About as default).

5. **About tab**
   - **Summary** — free tier, always visible. 1-2 paragraphs.
   - **Deep dive** — premium. Show teaser: first paragraph faded out with gradient overlay. "Unlock the full story — A$9.99" CTA button (coral). **In Phase 1, this content won't exist yet** (it's AI-generated separately). Show the teaser UI anyway with placeholder text explaining deep dives are coming soon, or hide the section if `deep_dive` is null.
   - **Similar species** — 3-4 cards of species from the same family. Simple query: `WHERE family = {this species' family} AND id != {this id} LIMIT 4`.

6. **Where & When tab**
   - Two-column table of locations with inline seasonality.
   - Left column: location name (link), region, likelihood pill.
   - Right column: 12-month mini bar chart (J–D), colour intensity by likelihood.
   - Sort by total observation count descending.
   - Mobile: stack columns.

7. **Below tabs**
   - "Think you spotted one?" → Species ID tool link.

8. **SEO**
   - `generateMetadata()` with species name, description, OG image.

**Guidance:**
- The "Where & When" mini bar chart is a small inline visualisation. Can be done with simple div bars (no charting library needed). Each month is a small rectangle, coloured: emerald for common, amber for occasional, slate for rare, transparent for no data.
- Deep dive gating: in Phase 1, just show the UI shell. The actual purchase gating (Stripe) comes in Phase 3. For now, if `deep_dive` content exists, show it to everyone. If not, show a "coming soon" state.
- Species without any photos should show a gradient placeholder (the existing `.photo-placeholder-species` class in globals.css).

---

### Session 10: Regions Index + Region Page

**Goal:** Build the regions browse page and individual region pages.

**Read first:** `docs/18-plan-app-website-build.md` sections "Regions index `/locations`" and "Region page `/locations/[region]`".

**Use the `/design` frontend design skill.**

**Steps:**

1. **Regions index** — `src/app/locations/page.tsx`
   - Server Component. Fetch all published regions with location counts.
   - `ResponsiveGrid` of region cards (hero image, name, location count, short description).
   - Sorted alphabetically (geolocation sorting deferred — would need client component).

2. **Region page** — `src/app/locations/[region]/page.tsx`
   - Server Component. Fetch region by slug. 404 if not found.
   - Fetch all published locations in this region with species counts.
   - Fetch top species across all locations in the region.

3. **Hero section**
   - Region hero image, region name, location count, short description.

4. **Tabs using `TabBar`**
   - Tab 1: **Locations** (default) — filterable grid of `LocationCard` components.
   - Tab 2: **Species** — "What you might see in [Region]" — grid of most common species across all locations.
   - Tab 3: **Map** — Mapbox with all location pins. Click pin → tooltip with name + species count → link to location page.

5. **SEO**
   - Metadata for both pages. Region page targets "[region] snorkelling spots" keywords.

**Guidance:**
- For Phase 1, only Sydney region will have data. This is fine — the pages should work with 1 region and scale to many.
- The location card's "in season count" (e.g., "5 species in season now") requires a subquery counting seasonal species active this month at each location. This can be a computed field in the location query.

---

### Session 11: Species ID Tool — Wire to Real Data

**Goal:** Connect the existing Species ID wizard prototype to real Supabase data.

**Read first:** `docs/18-plan-app-website-build.md` sections "Species ID tool" and "Species ID tool `/id`". Also read the existing `src/app/id/page.tsx` thoroughly.

**Steps:**

1. **Read the existing prototype** — `src/app/id/page.tsx`. Understand the current UI, step flow, and hardcoded data.

2. **Replace hardcoded data with Supabase queries:**
   - Step 1 (Where): Fetch published locations from Supabase. Group by region.
   - Step 2 (When): Keep the month grid (static data, no query needed).
   - Step 3 (Size): Keep the size options (static, matches `size_category` enum).
   - Step 4 (Colours): Fetch distinct colour values from `species.colours` array across all species. Or use a hardcoded vocabulary list: `blue, green, yellow, orange, red, brown, black, white, grey, silver, spotted, striped` (from the plan doc).
   - Step 5 (Habitat): Similar — use the vocabulary: `reef, sand, open_water, surface, crevice, seagrass, rocky_bottom, kelp`.

3. **Implement filtering logic:**
   - After all steps completed, query Supabase for matching species:
     - Filter by location (if selected): species at that location via `location_species`.
     - Filter by month (if selected): species where `species_seasonality.month = {selected}` AND likelihood IN ('common', 'occasional').
     - Filter by size: `species.size_category = {selected}`.
     - Filter by colours: `species.colours && ARRAY[{selected}]` (array overlap).
     - Filter by habitat: `species.habitat && ARRAY[{selected}]` (array overlap).
   - Return ranked by number of matching criteria, then by confidence score.

4. **Results display:**
   - Show `SpeciesCard` components in a `ResponsiveGrid`.
   - Each result shows: photo, common name, match confidence label (Confirmed/Likely/Possible based on how many criteria matched).
   - Link to species page.

5. **Pre-fill behaviour:**
   - Check URL for `?location=slug` param → pre-fill Step 1.
   - Pre-fill Step 2 to current month.
   - If pre-filled, auto-advance past those steps (but allow going back to edit).

6. **Adapt the UI** — don't rebuild from scratch. Keep the existing step-by-step wizard structure and visual design. Replace mock data with real data and add the filtering/results logic.

**Guidance:**
- The Species ID tool is **free in Phase 1-2**. No purchase gating yet (that's Phase 3).
- The filtering query can be done server-side via an API route (`GET /api/species/identify?location=...&month=...&size=...&colours=...&habitat=...`) or client-side via Supabase directly. Server-side is probably cleaner.
- Some species won't have `size_category`, `colours`, or `habitat` populated yet (they're enrichment fields populated during content work). The filter should treat missing values as "no match" for that criterion, not as "exclude."
- If no location is selected, search across all species (not just one location).

---

### Session 12: Sighting Log + Species Checklist

**Goal:** Authenticated users can log sightings and track their species collection per location.

**Read first:** `docs/18-plan-app-website-build.md` section on "Dive/sighting log + species checklist" and "Spotted — species collection grid per location".

**Steps:**

1. **API routes for sightings**
   - `POST /api/sightings` — create a sighting (authenticated). Body: `{ speciesId, locationId, sightedAt, quantity, notes }`.
   - `GET /api/sightings` — get current user's sightings. Optional filters: `?locationId=...&date=...`.
   - `DELETE /api/sightings/[id]` — delete a sighting (own only).
   - All routes check auth. Use Supabase server client with the user's session (not service role).

2. **"Log a Sighting" UI**
   - A modal or slide-over triggered from the location page.
   - Form: species picker (searchable dropdown of species at this location), date (default today), quantity (default 1), optional notes.
   - On submit: POST to API, show success state.
   - Also allow quick-logging from the species card itself (tap a "+" button or "Log sighting" action).

3. **Collection state on location page**
   - Update the location page's Species tab (Session 8) to show collection progress.
   - Fetch user's sightings at this location (client-side, after auth check).
   - Progress bar: "12 of 47 spotted at Cabbage Tree Bay".
   - Checkmark badges on spotted species cards.
   - For unauthenticated users: CTA "Sign up to start collecting".

4. **Sighting log page** — `src/app/log/page.tsx` (or integrate into user profile)
   - List of all user's sightings, reverse chronological.
   - Grouped by trip (same location + same date = one trip).
   - Each trip row: location, date, species count, species thumbnails.

**Guidance:**
- RLS policies already handle sighting security (users can only read/write their own sightings).
- The species picker should be a `Combobox` pattern — type to search, select from list. Don't build a complex custom component; a simple filtered dropdown is fine.
- Sightings are lightweight — quantity + optional notes. Don't over-complicate the form.
- The collection mechanic is the retention loop. Make the progress bar prominent and satisfying.

---

### Session 13: User Profile + Trip Reports

**Goal:** Public user profiles and shareable trip reports.

**Read first:** `docs/18-plan-app-website-build.md` sections "User profile `/u/[username]`" and "Trip detail / shareable trip report `/trips/[id]`".

**Steps:**

1. **User profile page** — `src/app/u/[username]/page.tsx`
   - Public page. Fetch user by username (from `auth.users` metadata or `users.display_name`).
   - **Note:** The plan mentions username from `auth.users` metadata. For simplicity, you can use `display_name` from the `users` table as the slug (slugified). Or add a `username` column to the `users` table. **Decision: add a `username TEXT UNIQUE` column to `users` via a new migration** — display names aren't unique, usernames must be. Also add `username` to the signup form.
   - Header: username, join date, total species spotted, total trips.
   - Tab 1: **Trips** — reverse-chronological list. Each row: location, date, species count, thumbnail stack.
   - Tab 2: **Spotted** — lifetime species grid. Every unique species the user has ever spotted. Sorted by charismatic first, then alphabetical.

2. **Trip detail page** — `src/app/trips/[id]/page.tsx`
   - **Trip ID:** Trips are grouped by `(user_id, location_id, sighted_at)`. The ID can be a hash of these three fields, or you could encode it as a URL-safe string. Simplest: use the first sighting ID of that trip as the trip identifier, or generate a composite key.
   - **Decision: create a deterministic trip ID** from `userId-locationSlug-date` (e.g., `abc123-cabbage-tree-bay-2026-04-12`). This is the URL slug.
   - Header: "[Name] saw [N] species at [Location]" + date. Progress bar. CTA buttons.
   - Species grid: hero photos, common name, quantity if >1, note snippet.
   - This page is public (anyone with the link can view it).

3. **OG image generation** — `src/app/trips/[id]/opengraph-image.tsx`
   - Use Next.js `ImageResponse` (from `next/og`).
   - 1200x630 standard OG size.
   - Show: species photos in a grid (up to 6), location name, date, "[Name] saw [N] species", progress bar.
   - Must look good as a link preview in iMessage/WhatsApp/Instagram DMs.
   - Also create a 1080x1080 variant if feasible (for Instagram — can be a separate route).

4. **Share button on trip detail**
   - Copy link to clipboard. Show "Link copied!" toast.
   - Optional: native Web Share API if available.

5. **Database migration**
   - Create `supabase/migrations/20260412000000_add_username.sql`:
     ```sql
     ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
     CREATE INDEX idx_users_username ON users(username);
     ```
   - Update the signup flow to set username.
   - Update RLS policy: user profiles should be publicly readable (add a new policy: `FOR SELECT USING (TRUE)` on specific columns, or create a view).

**Guidance:**
- The OG image is critical for the growth loop. It's what makes people tap the link. Invest time here.
- `next/og` uses Satori under the hood — it supports a subset of CSS (flexbox, basic styling). No grid. Keep the layout simple.
- Trip pages must work for unauthenticated visitors (they're the growth mechanism).
- The user profile must work even if the user has no trips yet (empty state).
- Username validation: lowercase, alphanumeric + hyphens, 3-30 chars.

---

### Session 14: "In Season Now" Alerts

**Goal:** Users can opt into species alerts. Monthly email notifications when their chosen species come into season.

**Read first:** `docs/18-plan-app-website-build.md` sections on "In Season Now alerts" and "In Season Now Email Notifications" (Technical Specs).

**Steps:**

1. **Alert opt-in UI**
   - On species cards (location page, species page): "Get alerts" link or bell icon.
   - Clicking opens a quick modal: "Notify me when [Species] is in season at [Location]" with a confirm button.
   - Requires authentication — prompt sign-in if not logged in.
   - API route: `POST /api/alerts/subscribe` — body: `{ speciesId, locationId }`.
   - API route: `DELETE /api/alerts/[id]` — remove an alert.
   - API route: `GET /api/alerts` — list user's active alerts.

2. **Manage alerts page** — `src/app/alerts/page.tsx`
   - Authenticated only. List of all user's active alerts.
   - Each row: species name + photo, location name, enable/disable toggle, delete button.
   - Link from user menu in Header.

3. **Email template**
   - Install React Email: `npm install @react-email/components`.
   - Create `src/emails/season-alert.tsx` — the alert email template.
   - Subject: "[Species] are at [Location] this month"
   - Content: species photo, species name, location, likelihood, link to species page, link to ID tool, "Log your sighting" CTA.
   - Footer: "Based on historical observation data. Sightings are not guaranteed." + manage alerts link + unsubscribe.

4. **Alert sender** — `src/lib/alerts/send-alerts.ts`
   - Query `species_alerts` WHERE `enabled = TRUE`.
   - Join with `species_seasonality` for current month.
   - Check if species is `common` or `occasional` this month at the opted-in location.
   - Group alerts by user (one email per user with all their in-season species).
   - Send via Resend API: `npm install resend` if not installed.
   - Use `RESEND_API_KEY` env var.

5. **Cron trigger**
   - **Option A (simpler for Phase 1):** Script that can be run manually or via Vercel Cron: `scripts/send-alerts.ts`. Add to `package.json`: `"send-alerts": "npx tsx scripts/send-alerts.ts"`.
   - **Option B:** Supabase Edge Function with cron schedule. This is more robust but more complex to set up.
   - **Decision: Use Option A for Phase 1.** Set up a Vercel Cron Job (`vercel.json` → `crons` config) that hits an API route (`/api/cron/alerts`) monthly. The API route runs the alert sender.
   - Protect the cron route with a `CRON_SECRET` env var.

6. **Verify**
   - Create a test alert. Run the sender manually. Check that the email arrives via Resend.

**Guidance:**
- Resend free tier: 3K emails/month. More than enough for early users.
- The cron should run on the 1st of each month (when seasons shift).
- Only send alerts when a species COMES INTO season (transitions from not-in-season to in-season). Don't re-alert every month if the species has been in season for 3 months straight.
- This means tracking "was this species in season last month?" — compare current month vs previous month in `species_seasonality`. If previous month was `rare` or doesn't exist, and current month is `common` or `occasional`, send alert.

---

### Session 15: Homepage — Wire to Real Data

**Goal:** Rebuild the homepage with real data from the database. Adapt the existing prototype.

**Read first:** `docs/18-plan-app-website-build.md` section "Homepage `/`". Also read existing `src/app/page.tsx` thoroughly.

**Use the `/design` frontend design skill.**

**Steps:**

1. **Read the existing homepage** — `src/app/page.tsx`. Understand what's there, what works, what needs changing.

2. **Adapt (don't rebuild from scratch) the homepage sections:**

   - **Hero** — keep the existing animated gradient/caustic effect. Replace hardcoded stats with real counts from the database (total species, locations, regions). Add wave SVG divider into sand background.

   - **In Season Now** — replace hardcoded data with real query:
     - Fetch species that are in season this month (seasonal species, active ≤8 months, current month is `common` or `occasional`).
     - Priority fill: (1) seasonal + charismatic + in season → pulsing green badge, (2) seasonal + in season → green badge, (3) charismatic year-round as backfill → "Year-round" pill.
     - Show 1 row (3 cards mobile, 4-5 desktop).
     - Each card: species hero photo, badge, species name, location, months.
     - Links to species page. "Get alerts" link.
     - Daily-seeded shuffle for tiebreaking (deterministic random using date seed).

   - **Explore by Region** — fetch published regions with location counts. 2-col grid, capped at 4-6.

   - **Species ID Tool promo** — keep the layout (phone mockup + copy). Update CTA link.

   - **Premium upsell** — **update from subscription pricing to one-off A$9.99 purchase.** The existing prototype shows monthly/yearly pricing — fix this.

   - **Footer** — use the new `Footer` component from Session 7.

3. **SEO**
   - The existing metadata in `layout.tsx` is good. Verify OG tags.

**Guidance:**
- The existing homepage has good bones. Don't throw it away. The gradient hero, card layouts, and overall structure are solid.
- The main work is replacing `PLACEHOLDER DATA` arrays with Supabase queries.
- Use Server Components for data fetching. The hero animations and In Season cards can be client components for interactivity.
- The "In Season Now" section is the most complex — the priority fill logic and daily-seeded shuffle need careful implementation.

---

### Session 16: Browse All Species + Credits + SEO

**Goal:** Build remaining content pages, SEO infrastructure.

**Steps:**

1. **Browse all species** — `src/app/species/page.tsx`
   - Header: "All Species", total count, search bar.
   - Filter bar: size category, colour, habitat, alphabetical/taxonomic sort.
   - `ResponsiveGrid` of `SpeciesCard` components. Paginated (50 per page) or infinite scroll.

2. **Credits page** — `src/app/credits/page.tsx`
   - Table: photographer name, source, license, number of photos used.
   - Data from `photos` table, grouped by photographer.

3. **XML Sitemap** — `src/app/sitemap.ts`
   - Next.js built-in sitemap generation.
   - Include: all published location pages, species pages, region pages, static pages (home, /id, /species, /credits).

4. **Robots.txt** — `src/app/robots.ts`

5. **Structured data**
   - Add JSON-LD structured data to location pages (`TouristAttraction`), species pages, homepage.
   - Use `generateMetadata` and `<script type="application/ld+json">` in each page.

6. **Canonical URLs**
   - Ensure all pages have canonical URL meta tags.

**Guidance:**
- The sitemap should be dynamic — it queries the database for all published content.
- Keep structured data simple. `TouristAttraction` for locations, basic `WebPage` for species.
- The credits page is a legal requirement. Don't skip it.

---

### Session 17: Deploy to Vercel

**Goal:** Production deployment. Site live at saltsafari.app.

**Steps:**

1. **Vercel project setup**
   - Connect the GitHub repo to Vercel (the user does this via the Vercel dashboard).
   - Set all environment variables in Vercel project settings.

2. **Verify production build**
   - `npm run build` must pass cleanly.
   - Fix any build errors.

3. **Vercel configuration** — `vercel.json`
   - Add cron job for monthly alerts:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron/alerts",
           "schedule": "0 0 1 * *"
         }
       ]
     }
     ```

4. **DNS configuration**
   - The user manages DNS via Cloudflare, domain via Name.com.
   - Add Vercel's DNS records to Cloudflare (the user does this manually).
   - Verify `saltsafari.app` resolves to Vercel.

5. **Post-deploy checks**
   - All pages render correctly.
   - Auth flow works (sign up, sign in, sign out).
   - Supabase queries return data.
   - Images load from Supabase Storage.
   - Mapbox maps load.
   - OG images generate correctly (test with [opengraph.xyz](https://opengraph.xyz) or similar).

6. **Google Analytics**
   - The user mentioned GA is already active. Verify it's tracking the new site. If not, add the GA tag to `src/app/layout.tsx`.

**Guidance:**
- Vercel free tier (Hobby) is sufficient for launch.
- Make sure `SUPABASE_SECRET_KEY` is set as a non-public env var (no `NEXT_PUBLIC_` prefix).
- The cron job on Vercel free tier may have limitations — check Vercel docs. If crons aren't available on free tier, fall back to manual monthly script execution.
- Don't forget to set `CRON_SECRET` in Vercel env vars.

---

## Phase 2: Expand Locations + Enrich

Goal: All Sydney + Central Coast locations, search, admin dashboard, FishBase enrichment.

---

### Session 18: Bulk Seed Locations

**Goal:** Add all Sydney and Central Coast dive/snorkel locations to the database.

**Steps:**

1. **Create seed scripts**
   - `scripts/seed-sydney.sql` — all Sydney locations (use the data from `data/csv/locations.csv` and `data/locations/*.md` as **reference only** for names, coords, and basic info). Cross-reference with the plan doc's location list.
   - `scripts/seed-central-coast.sql` — Central Coast locations.
   - Each location needs: name, slug, lat, lng, radius_km, activities, skill_level, region_id, data_quality='stub'.

2. **Coordinate sourcing**
   - The reference CSVs may have coordinates. If not, use Google Maps to find accurate lat/lng for each location.
   - Set `coords_source = 'google_maps'` or `'manual'`.

3. **Run seeds**
   - Execute against the database.
   - Verify all locations appear with correct region associations.

4. **Ensure Central Coast region exists**
   - Check if the Central Coast region was seeded. If not, add it.

**Guidance:**
- The `data/csv/locations.csv` is reference material from the old Notion site. Use it for names and basic info, but verify coordinates independently.
- Location slugs must be unique within a region.
- Set `published = FALSE` initially — locations get published after pipeline runs and validation.
- Expect ~22 Sydney locations and ~5 Central Coast locations based on the reference data.

---

### Session 19: Run Pipeline Across All Locations

**Goal:** Run the species + photo pipeline for every seeded location. Spot-check results.

**Steps:**

1. **Add bulk pipeline support**
   - Update `scripts/run-pipeline.ts` to accept `--all` flag: runs pipeline for every location in the database.
   - Add progress logging: "Processing location 3/27: Bare Island..."
   - Add error handling: if one location fails, log the error and continue to the next.

2. **Run the pipeline**
   - `npm run pipeline -- --all`
   - This will take a while (27 locations × 6+ API calls each + seasonality + photos = likely 30-60 minutes).
   - Run photos separately if needed: `npm run pipeline -- --all --photos`

3. **Spot-check results**
   - Query database: how many species total? How many per location? Any locations with suspiciously few or many species?
   - Check a few locations you know well — do the species lists match reality?
   - Check for deduplication issues — same species appearing twice under different names?

4. **Publish validated locations**
   - Set `published = TRUE` for locations that look correct.
   - Mark questionable ones for review.

**Guidance:**
- This is a long-running process. Monitor it. If it crashes partway through, the pipeline should be idempotent (upserts, not inserts) so you can re-run safely.
- Some locations may have very few species (if they're remote or the search radius is too small). That's okay — adjust radius and re-run if needed.

---

### Session 20: FishBase Enrichment

**Goal:** Import depth, habitat, and size data from FishBase to enrich species records.

**Read first:** `docs/18-plan-app-website-build.md` mentions FishBase parquet files via DuckDB.

**Steps:**

1. **Download FishBase data**
   - FishBase distributes data as parquet files. Download the relevant tables: `species` (for max_length, habitat), `ecology` (for depth ranges).
   - Store in `data/fishbase/` directory.

2. **Install DuckDB** — `npm install duckdb` (or use a CLI tool).

3. **Create enrichment script** — `scripts/enrich-fishbase.ts`
   - Load parquet files with DuckDB.
   - For each species in the database with a scientific name:
     - Look up in FishBase by scientific name.
     - Extract: `max_length_cm`, `depth_min_m`, `depth_max_m`, `depth_common_min_m`, `depth_common_max_m`, `habitat_type`.
     - Map `habitat_type` to the `size_category` buckets: tiny (<5cm), small (5-15cm), medium (15-40cm), large (40-100cm), very_large (>100cm).
   - Update species records in the database.

4. **Run enrichment**
   - `npx tsx scripts/enrich-fishbase.ts`
   - Check coverage: what percentage of species got enriched?

**Guidance:**
- FishBase is CC-BY-NC licensed. Using it for enrichment (not displaying raw FishBase content) should be acceptable, but the plan notes "consult lawyer." Flag this to the user.
- Not all species will be in FishBase (invertebrates, marine mammals may be in SeaLifeBase instead). Accept partial coverage.
- The `size_category` mapping from `max_length_cm` is: tiny (<5cm), small (5-15cm), medium (15-40cm), large (40-100cm), very_large (>100cm). This is defined in the plan doc.

---

### Session 21: Search & Filtering

**Goal:** Full-text search across species and locations.

**Steps:**

1. **Database setup**
   - Create a new migration adding full-text search indexes:
     ```sql
     -- Enable pg_trgm for fuzzy matching
     CREATE EXTENSION IF NOT EXISTS pg_trgm;

     -- Full-text search on species
     ALTER TABLE species ADD COLUMN IF NOT EXISTS fts tsvector
       GENERATED ALWAYS AS (
         setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
         setweight(to_tsvector('english', coalesce(scientific_name, '')), 'B') ||
         setweight(to_tsvector('english', coalesce(summary, '')), 'C')
       ) STORED;
     CREATE INDEX idx_species_fts ON species USING GIN(fts);

     -- Full-text search on locations
     ALTER TABLE locations ADD COLUMN IF NOT EXISTS fts tsvector
       GENERATED ALWAYS AS (
         setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
         setweight(to_tsvector('english', coalesce(description, '')), 'C')
       ) STORED;
     CREATE INDEX idx_locations_fts ON locations USING GIN(fts);

     -- Trigram indexes for fuzzy matching
     CREATE INDEX idx_species_name_trgm ON species USING GIN(name gin_trgm_ops);
     CREATE INDEX idx_locations_name_trgm ON locations USING GIN(name gin_trgm_ops);
     ```

2. **API routes**
   - `GET /api/species/search?q=...` — full-text search on species (name, scientific name, summary). Return top 20 matches with relevance score.
   - `GET /api/locations/search?q=...` — full-text search on locations (name, description). Return top 20 matches.

3. **Search UI**
   - Create `src/components/SearchBar.tsx` — a search input that queries both endpoints and shows combined results in a dropdown.
   - Add to the Header component.
   - Results grouped: "Locations" and "Species" sections in the dropdown.
   - Debounce input (300ms).

4. **Filter improvements**
   - Update the location page species tab filters to use client-side filtering (already partially done in Session 8).
   - Update the browse all species page (`/species`) filters to work with real data.

**Guidance:**
- Supabase supports Postgres full-text search natively. Use `textSearch` in the JS client.
- The trigram index (`pg_trgm`) enables fuzzy matching for typos. Use `similarity()` or `%` operator.
- Search should work on aliases too — species might be searched by alternate common names. Consider adding aliases to the FTS vector.
- Keep the search fast — <200ms response time.

---

### Session 22: Mapbox Maps on All Pages

**Goal:** Ensure all location and region pages have working Mapbox maps.

**Steps:**

1. **Shared map component** — `src/components/MapView.tsx`
   - Wrapper around `react-map-gl` Map component.
   - Props: `center`, `zoom`, `markers`, `onMarkerClick`.
   - Styled to match the design system (rounded corners, contained within content area).

2. **Location page map tab**
   - Single pin for the location.
   - Nearby locations from same region shown as smaller pins.
   - "Open in Maps" button.

3. **Region page map tab**
   - All location pins in the region.
   - Tooltip on click: location name, species count, link to page.
   - Use Supercluster if many pins overlap: `npm install supercluster`.

4. **Verify**
   - Maps load on all pages without errors.
   - Map tiles load correctly (Mapbox token working).
   - Mobile responsive.

**Guidance:**
- `react-map-gl` wraps `mapbox-gl`. Both need to be installed.
- Mapbox components must be client components (`"use client"`).
- Consider lazy loading the map (it's behind a tab, so it doesn't need to load immediately).
- Free tier: 50K map loads/month. Track usage.

---

### Session 23: Admin Dashboard

**Goal:** Protected admin interface for managing content and triggering pipeline runs.

**Read first:** `docs/18-plan-app-website-build.md` section "Admin Dashboard".

**Steps:**

1. **Admin layout** — `src/app/admin/layout.tsx`
   - Server Component. Check if current user has `is_admin = TRUE`. Redirect to home if not.
   - Simple sidebar navigation: Overview, Locations, Species, Photos, Pipeline.

2. **Admin pages:**
   - `/admin` — overview stats: content counts by `data_quality` and status. "Needs attention" list (species with `worms_aphia_id = NULL`, locations with `data_quality = 'stub'`).
   - `/admin/locations` — table of all locations (including unpublished). Columns: name, region, data_quality, description_status, published, species count, last_synced_at. Bulk actions: publish/unpublish.
   - `/admin/species` — table of all species. Columns: name, scientific_name, deep_dive_status, data_quality, worms_aphia_id, photo count. Actions: edit, publish/unpublish.
   - `/admin/photos` — grid view of all photos. Filter by location, species, license, is_hero. Actions: edit attribution, set/unset hero.
   - `/admin/pipeline` — per-location pipeline status. Last sync date, species count, error status. "Run pipeline" button per location. "Run all" button.

3. **Pipeline API routes**
   - `POST /api/pipeline/run` — body: `{ locationSlug }`. Admin only. Triggers pipeline for one location.
   - `POST /api/pipeline/run-all` — Admin only. Triggers pipeline for all locations.
   - These should run async (return immediately, process in background). Use a simple status tracking mechanism.

4. **Admin middleware**
   - Check `users.is_admin` on every admin route. Reject with 403 if not admin.

**Guidance:**
- The admin dashboard doesn't need to be beautiful. Functional tables with sort/filter/actions are sufficient.
- Use the `/design` skill for basic layout but don't over-invest — this is internal tooling.
- The pipeline run buttons should show progress (at minimum: "Running...", "Complete", "Error").
- To make yourself an admin: directly update your user row in the database: `UPDATE users SET is_admin = TRUE WHERE id = '{your-user-id}'`.

---

### Session 24: Legal Pages + Google Search Console

**Goal:** Privacy policy, terms of service, cookie consent, DMCA page.

**Steps:**

1. **Privacy policy** — `src/app/privacy/page.tsx`
   - Cover: data collected (email, sightings, usage analytics), Supabase as data processor, Google Analytics, no sale of data.
   - Mention Australian Privacy Act compliance.

2. **Terms of service** — `src/app/terms/page.tsx`
   - Cover: user-generated content (sightings), data attribution (iNaturalist, ALA, OBIS), license for user content, limitation of liability (species sighting data is informational, not guaranteed).

3. **Cookie consent** — simple banner component
   - Salt Safari uses: essential cookies (auth session), analytics (Google Analytics).
   - Banner on first visit with Accept/Decline.

4. **DMCA/takedown page** — `src/app/dmca/page.tsx`
   - Process for copyright holders to request photo removal.
   - Contact email. Commitment to respond within 48 hours.

5. **Google Search Console**
   - The user sets this up manually (verify domain ownership).
   - Submit the sitemap URL.

**Guidance:**
- These pages can be mostly static content. Use AI to draft the legal text but flag to the user that it should be reviewed by a lawyer before going live.
- Keep cookie consent simple. Don't use a complex cookie management platform.
- Link privacy/terms from the Footer component.

---

## Phase 3: Monetise + Launch

Goal: Stripe payment, premium content gating, affiliate tracking.

---

### Session 25: Stripe Integration

**Goal:** One-off A$9.99 purchase that unlocks Species ID tool + species deep dives.

**Steps:**

1. **Stripe setup**
   - The user creates a Stripe account and gets API keys.
   - Create a Product + Price in Stripe Dashboard: "Salt Safari Premium", A$9.99, one-time payment.
   - Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_ID`.
   - Install Stripe: `npm install stripe`.

2. **Checkout API route** — `POST /api/stripe/checkout`
   - Authenticated only.
   - Creates a Stripe Checkout Session (one-time payment, not subscription).
   - Pass `client_reference_id = userId` for tracking.
   - Redirect URL: back to the page they were on.
   - Returns the checkout URL.

3. **Webhook handler** — `POST /api/stripe/webhook`
   - Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`.
   - On `checkout.session.completed`:
     - Extract `client_reference_id` (userId).
     - Update `users` table: set `has_purchased_id = TRUE`, store `stripe_customer_id` and `stripe_payment_id`.
   - Return 200.

4. **Purchase button component** — `src/components/PurchaseButton.tsx`
   - Shows "Unlock for A$9.99" (coral button).
   - On click: calls checkout API, redirects to Stripe.
   - If already purchased: shows "Purchased" badge or nothing.

5. **Verify**
   - Use Stripe test mode.
   - Complete a test purchase. Check that `has_purchased_id` flips to TRUE in the database.

**Guidance:**
- Use Stripe Checkout (hosted page), not custom payment form. Much simpler and handles compliance.
- The webhook must verify the Stripe signature. Never trust unverified webhook payloads.
- GST handling: Stripe can handle tax collection for Australian customers. Enable Stripe Tax or set the price as GST-inclusive.
- The `has_purchased()` Postgres function already exists in the schema — it checks this boolean.

---

### Session 26: Premium Content Gating

**Goal:** Gate Species ID tool and species deep dives behind the one-off purchase.

**Steps:**

1. **Species ID tool gating**
   - Update `src/app/id/page.tsx`:
     - Check if user has purchased (via Supabase: `users.has_purchased_id`).
     - If yes: full access.
     - If no: show the first 2 steps (Where + When) for free as a teaser. At step 3, show a paywall: "Unlock the Species ID tool — A$9.99" with the `PurchaseButton`.
     - If not logged in: show sign-in CTA, then purchase CTA.

2. **Species deep dive gating**
   - Update `src/app/species/[slug]/page.tsx` About tab:
     - Summary: always visible (free).
     - Deep dive: check purchase status.
     - If purchased: show full deep dive content.
     - If not: show teaser (first paragraph faded with gradient overlay) + "Unlock the full story — A$9.99" CTA.
   - Use the `get_species_deep_dive()` Postgres function for server-side gating, or check `has_purchased_id` client-side.

3. **Update homepage premium section**
   - Show the correct A$9.99 one-off pricing.
   - "Pay once, use forever" messaging.
   - Feature list: Species ID tool + species deep dives.

4. **CTA placement throughout**
   - Location page species tab: "Can't find what you saw? Try the Species ID tool" → if not purchased, mention the price.
   - Species page: deep dive teaser → purchase CTA.
   - Trip detail: "Learn more about what you saw" → species deep dives CTA.

**Guidance:**
- The purchase check should be fast. Cache the `has_purchased_id` boolean in the user's session/cookie to avoid database calls on every page.
- Don't block page rendering on purchase status. Load the page, then check status and show/hide premium content.
- The free experience must still be genuinely useful — the purchase is an upgrade, not a tollbooth.

---

### Session 27: Affiliate Tracking + Launch Prep

**Goal:** Photographer affiliate links, final launch preparations.

**Steps:**

1. **Affiliate tracking**
   - **Decision: defer Rewardful for now.** Implement simple referral tracking:
     - Photographers get a referral code (stored in `photographers.referral_code`).
     - Referral links: `saltsafari.app?ref={code}`.
     - When a user visits with `?ref=`, store the code in a cookie + in `users.referred_by` on signup.
     - Pass referral code to Stripe as metadata on checkout.
     - Track conversions manually for now (query: users who purchased with `referred_by IS NOT NULL`).
   - This is enough for early photographer partnerships. Upgrade to Rewardful when volume justifies the $49/month cost.

2. **Photographer profiles** — `src/app/photographers/[slug]/page.tsx`
   - Public page. Shows: name, bio, links (website, Instagram, YouTube), photos they've contributed.
   - Photo grid of their work on the site, each linked to the species/location it appears on.
   - Referral link displayed (if they have one).

3. **Final QA**
   - Test all user flows: browse → species page → ID tool → purchase → deep dive.
   - Test auth flows: sign up → sign in → log sighting → share trip → manage alerts.
   - Test on mobile (responsive design).
   - Test OG images (share a trip link in iMessage/WhatsApp).
   - Run `npm run build` — must pass cleanly.

4. **Launch prep**
   - Verify production environment variables in Vercel.
   - Switch Stripe from test mode to live mode. Update keys.
   - Verify Stripe webhook is registered for production URL.
   - Test a real purchase (refund yourself after).

**Guidance:**
- Simple referral tracking is better than no tracking. Don't over-engineer this.
- The photographer profile page is important for the affiliate relationship — it's what you show them when pitching the partnership.
- Launch checklist: auth works, payments work, emails send, maps load, images render, OG images generate, sitemap accessible.

---

## Phase 4+ (Not Detailed — Future Sessions)

These are listed for awareness. Plan them when Phase 3 is complete.

- Community sighting counts (aggregate sightings per species per location, show on location page)
- Community sightings feed ("spotted this week" on location pages)
- Dive shop directory
- Gear affiliate links
- Trip planning tools
- Push notifications (requires native app or web push)
- React Native mobile app
- Expand to new regions (South Coast → Byron/Gold Coast → Brisbane → GBR → international)

---

## Cross-Cutting Guidance (applies to every session)

### Design
- Use the `/design` frontend design skill for all page and component builds.
- Follow the page structure and layout specs from `docs/18-plan-app-website-build.md` section "7b. Page Designs" precisely.
- The Pelagic design system (Fraunces + Outfit, navy/sand/coral/teal) is a starting point. The existing `tailwind.config.ts` and `globals.css` define the tokens. If `/design` proposes something better, go with it — but maintain visual consistency across pages.
- Mobile-first. Every page must work well on a phone screen.

### Code conventions
- TypeScript everywhere. No `any` types.
- Server Components by default. Only use `"use client"` when needed (interactivity, hooks, browser APIs).
- Supabase queries in Server Components use the server client (`src/lib/supabase/server.ts`).
- Supabase queries in Client Components use the browser client (`src/lib/supabase/client.ts`).
- API routes for server-only operations (pipeline, webhooks, things needing secret key).
- File structure follows `docs/18-plan-app-website-build.md` section "File & folder conventions".

### Data
- `data/csv/` and `data/locations/*.md` and `data/species/*.md` are **reference only**. Do not import them directly. The pipeline is the source of truth.
- Content writing (location descriptions, species summaries, deep dives) is a **separate manual process**. Build the UI to display this content when it exists, but don't generate it during implementation sessions.

### Testing
- No formal test suite for Phase 1 (per plan). Validate pipeline output by spot-checking.
- `npm run build` must pass after every session.
- `npm run lint` should pass (fix warnings, don't suppress them).

### Commits
- Commit after each session with a descriptive message.
- Don't push to main without the user's approval.
