# Salt Safari

A website and PWA where swimmers, snorkellers, and divers discover which marine species appear at each dive/snorkel location in Australia. Species-first browsing, seasonal alerts, and a free Species ID tool.

## Tech Stack
- **Frontend:** Next.js 15 (App Router, React 19, TypeScript)
- **Database + Auth:** Supabase (Postgres + Supabase Auth)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS 3 + custom design system ("Pelagic" — Fraunces display font, Outfit body font)
- **Maps:** Mapbox (react-map-gl)
- **Payments:** Stripe (one-off purchase A$9.99 — unlocks Species ID tool + species deep dives)
- **Photo Storage:** Cloudflare R2 (S3-compatible, 10 GB free, no egress fees)
- **Email:** Resend (React Email templates)
- **Animations:** Motion (framer-motion successor)

## Project Structure
```
src/app/           — Next.js App Router pages
src/components/    — React components (Header, etc.)
data/              — Seed data (Notion CSV exports, markdown files)
docs/              — Project documentation and research
supabase/          — Database migrations
scripts/           — Data pipeline scripts (planned)
public/            — Static assets
```

## URL Hierarchy
```
/locations                          → Regions index (browse all regions)
/locations/[region]                 → Region page (e.g. /locations/sydney)
/locations/[region]/[site]          → Dive site page (e.g. /locations/sydney/bare-island)
```
"Regions" are geographic groupings (Sydney, Central Coast). "Locations" are individual dive/snorkel sites. The `/locations` root serves as the regions index — the App Router file structure (`locations/page.tsx`, `locations/[region]/page.tsx`, `locations/[region]/[site]/page.tsx`) makes each level explicit.

## Key Documentation
- `docs/18-plan-app-website-build.md` — Master plan (schema, features, build sequence, strategy)
- `docs/15-inaturalist-report.md` — iNaturalist API technical spec
- `docs/17-supplementary-api-sources.md` — ALA, OBIS, GBIF, FishBase integration specs
- `docs/13-marine-photo-sourcing.md` — Photo sourcing strategy (Wikimedia, Flickr, CSIRO, etc.)
- `docs/11-research-tech-stack-decisions.md` — Tech stack rationale
- `docs/10-pricing-affiliate-strategy.md` — Pricing and affiliate model

## Database
- Schema defined in `supabase/migrations/20260411000000_initial_schema.sql`
- 11 tables: regions, locations, species, location_species, source_records, species_seasonality, photographers, photos, users, species_alerts, sightings
- RLS policies, auto-triggers, premium content gating function included in migration
- Multi-source species pipeline: iNaturalist (primary) + ALA + OBIS + GBIF (bootstrap)
- Taxonomy deduplication via WoRMS AphiaID

## Data Pipeline
Species data comes from multiple sources, queried at ingest time (not request time):
1. **iNaturalist** — `/species_counts` + `/histogram` for shore dives. 4 calls/location.
2. **ALA** — Faceted search excluding iNat (`fq=-data_resource_uid:"dr1411"`). AIMS/CSIRO/museum data.
3. **OBIS** — `/checklist` endpoint. WoRMS-validated. WKT bounding box (no point+radius).
4. **WoRMS** — Taxonomy normalization. Canonical AphiaIDs for cross-source dedup.

Photos: Wikimedia Commons (primary, all commercial) → Flickr CC → iNaturalist (cc-by/cc0 only, ~10-20%).

## Design System
- Display font: Fraunces (variable serif)
- Body font: Outfit (geometric sans)
- Colors: deep navy (#062133), sand (#FFFBF5), coral (#F4845F) for CTAs, teal for accents, emerald for "in season"
- Dark hero sections, light content pages
- Animated gradient hero, wave SVG dividers, pulsing "in season" dots

## Key Patterns
- Supabase Auth manages all authentication — no password storage in app schema
- Users table extends `auth.users` via FK + auto-creation trigger
- Premium content (species deep_dive) gated via `get_species_deep_dive()` Postgres function
- `has_purchased()` helper for RLS policies
- All photos self-hosted (never hotlink) with license audit trail
- `data_quality` (stub/partial/complete) and `*_status` (draft/reviewed/published) fields enable incremental publishing

## Implementation Guidelines (applies to every session)

### Design
- Use the `/design` frontend design skill for all page and component builds.
- Follow the page structure and layout specs from `docs/18-plan-app-website-build.md` section "7b. Page Designs" precisely.
- The Pelagic design system (Fraunces + Outfit, navy/sand/coral/teal) is a starting point. The existing `tailwind.config.ts` and `globals.css` define the tokens. If `/design` proposes something better, go with it — but maintain visual consistency across pages.
- Mobile-first. Every page must work well on a phone screen.

### Code Conventions
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

## Session Workflow
Implementation is broken into numbered sessions. Before starting any session:
1. Read `docs/21-implementation-prompt.md` for that session's instructions
2. Read `docs/23-session-log.md` for what previous sessions built
3. Read `docs/22-implementation-questions.md` for user answers to open questions
4. At session end, append a completion entry to `docs/23-session-log.md`

## Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
```
