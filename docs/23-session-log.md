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
