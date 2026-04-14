# Performance Audit — 2026-04-14

> **Purpose:** Actionable performance fixes for implementation sessions. Each task is scoped, has file + line references, describes the problem, and outlines the fix. Run `npm run build` after each task.
>
> **Already done:** See "Completed Fixes" at the bottom. Don't redo these.
>
> **Session guide:** See `docs/25-performance-audit-sessions.md` for how to group these into parallel implementation sessions.

---

## P0 — Critical

These are the fixes that will make the biggest difference to perceived speed.

---

### Task 1: Add `loading.tsx` skeleton files to all dynamic routes

**Problem:** Zero `loading.tsx` files exist. Every server-rendered page shows a blank white screen while data fetches (1–3 seconds on location/region pages).

**Where to add:**
- `src/app/locations/[region]/loading.tsx`
- `src/app/locations/[region]/[site]/loading.tsx`
- `src/app/species/[slug]/loading.tsx`
- `src/app/u/[username]/loading.tsx`
- `src/app/credits/loading.tsx`

**What to do:** Each loading.tsx should export a skeleton UI that matches the page layout — dark hero placeholder, content area with pulsing bars. Keep them simple. Reference the existing skeleton patterns in `src/app/id/page.tsx:711-720` (dark hero with pulsing bar) and `src/app/log/page.tsx:268-281` (card skeletons with title/subtitle/thumbnail placeholders) for the style already in use.

**Why it matters:** This is the single biggest perceived speed improvement. The page shell appears instantly while data loads in the background.

---

### Task 2: Move home page auth client-side, then add ISR

**File:** `src/app/page.tsx`

**Problem:** `export const dynamic = "force-dynamic"` (line 4) forces the home page to hit the DB on every request. The comment says "needs auth check per request" — and this is currently true: **the server component calls `supabase.auth.getUser()` at line 258** and uses it to conditionally fetch user sightings (lines 265-297), then passes `isLoggedIn`, `userSpottedCount`, `userSpottedSpeciesIds`, and `userLatestLog` as props to `HomePageClient`.

Simply removing `force-dynamic` would cache an auth-dependent page — users would see stale or wrong auth state.

**Fix (two parts):**

**Part A — Move auth logic to client side:**

**Complication:** `userSpottedSpeciesIds` isn't just passed as a prop — it's used server-side (lines 320-340) to build `collectionPreviewSpecies`. It determines: (a) the sort order (spotted species first), and (b) which species have `revealed: true` in the collection grid. So moving auth client-side also requires moving or adjusting the collection preview logic.

**Approach:**
1. Remove the server-side `getUser()` call (line 258) and the conditional sightings fetch (lines 265-297) from `page.tsx`.
2. For the collection preview (lines 319-350): always use the logged-out path — random shuffle, first 4 revealed. The server produces a static `collectionPreviewSpecies` array.
3. Stop passing `isLoggedIn`, `userSpottedCount`, and `userLatestLog` as props to `HomePageClient`. Keep all other props unchanged.
4. In `HomePageClient.tsx`, add a `useEffect` that calls `getUser()` via the browser Supabase client (`src/lib/supabase/client.ts`), then fetches the user's CTB sightings if logged in. Store in state: `isLoggedIn`, `userSpottedCount`, `userLatestLog`, and `userSpottedSpeciesIds`.
5. When auth resolves and user is logged in, **recompute `collectionPreviewSpecies` client-side**: mark species the user has spotted as `revealed: true`, and re-sort to put spotted species first. The server-provided array has all the species data needed — the client just updates the `revealed` flags and order.
6. The auth-dependent UI that needs to work client-side:
   - **Collection grid**: Starts with server default (first 4 revealed), updates when auth resolves to show user's actual spotted species as revealed.
   - **Progress bar** (line ~72): Show 0 while loading, animate in when auth resolves.
   - **Latest swim card** (line ~328): Shows "Shareable swim report" with placeholder data initially, updates to "Your latest swim" with real data when auth resolves.
   - **CTA button** (line ~410): Links to `/signup?redirectTo=%2Flog` initially, updates to `/log` when logged in.
   - Don't flash wrong content — use a brief loading/skeleton state or fade-in transition for auth-dependent sections.
7. The server component now only fetches public data (species, seasonality, location info) — no auth dependency.

**Part B — Switch to ISR:**
1. Remove `export const dynamic = "force-dynamic";`
2. Add `export const revalidate = 3600;` (1 hour cache)

**Depends on:** Task 3 (middleware scoping) is safe to do in parallel because once auth is client-side, the home page no longer needs a server-side auth cookie refresh.

---

### Task 3: Scope middleware to protected routes only

**Files:** `src/middleware.ts`, `src/lib/supabase/middleware.ts`

**Problem:** Middleware runs `supabase.auth.getUser()` on every single request (line 33 of `src/lib/supabase/middleware.ts`). This is a round trip to Supabase Auth (50–200ms) that blocks page rendering. Public pages (`/`, `/locations/*`, `/species/*`, `/id`) don't need it.

**Current matcher** (in `src/middleware.ts`) is a catch-all that matches everything except static files:
```typescript
matcher: [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
],
```

**Fix:** Replace with an explicit allowlist of routes that need server-side auth:

```typescript
export const config = {
  matcher: [
    "/log/:path*",
    "/alerts/:path*",
    "/u/:path*",
    "/api/alerts/:path*",
    "/api/sightings/:path*",
    "/auth/:path*",
  ],
};
```

**Verified safe:** Only `src/app/page.tsx` calls `getUser()` server-side among public pages, and Task 2 moves that client-side. The region, site, and species pages have no server-side auth calls.

**Test:** Login/signup flows still work (the `/auth/callback` route is included in the matcher). Public pages load without auth errors.

---

### Task 4: Fix region page N+1 query disaster

**File:** `src/app/locations/[region]/page.tsx:58-136`

**Problem:** A `for (const loc of locationsRaw)` loop at line 58 runs sequential queries per location:
1. One count query for species (lines 60-64)
2. A paginated fetch of all location_species IDs (lines 77-91, while loop)
3. Batched seasonality queries (lines 96-106)
4. JS aggregation for in-season count (lines 108-128)

A region with 5 locations = ~25+ sequential DB round trips. With 20 locations = 60-100+ queries.

**Fix approach:**
1. Fetch ALL location_species rows for all locations in the region in one query (`.in("location_id", locationIds)`), paginated if needed.
2. Fetch ALL seasonality for those location_species IDs in parallel batches using `Promise.all`.
3. Aggregate species counts and in-season counts per location in JS using a Map.

This collapses ~25+ queries into ~3.

**Outline:**
```typescript
const locationIds = locationsRaw.map(l => l.id);

// 1. Batch fetch all location_species for the region
const allRegionLS = []; // paginate with .in("location_id", locationIds)

// 2. Batch fetch all seasonality in parallel
const allLsIds = allRegionLS.map(ls => ls.id);
const seasonality = await Promise.all(batches of .in("location_species_id", batch));

// 3. Aggregate per location
const countsByLocation = new Map(); // location_id -> { speciesCount, inSeasonCount }
```

**Required output shape:** The refactored code must produce the same data the UI expects. Each location needs:
- `speciesCount` — total spottable species at that location
- `inSeasonCount` — species with 1-8 active months (common/occasional likelihood) AND active in the current month

These are passed to `RegionPageClient` as `locations: RegionLocation[]` (rendered at line ~333). The `RegionLocation` type extends the base location fields (id, name, slug, hero_image_url, skill_level, etc.) with these two computed counts. Make sure the aggregation logic preserves the "1-8 active months AND current month is active" filter for in-season (lines 117-128 of the current code).

---

### Task 5: Fix home page sequential data fetching + scope seasonality query

**File:** `src/app/page.tsx:109-211`

**Problem:** Three sequential operations:
1. Paginated fetch of location_species for CTB (lines 116-141) — sequential while loop
2. Fetch seasonality for current month (lines 145-161) — this query is **unscoped** (fetches ALL seasonality rows site-wide for the month, then filters to CTB in JS at line 180)
3. Another paginated fetch for active month counts (lines 196-210) — sequential batch loop

The unscoped seasonality query is the worst part: it fetches every location's seasonality data then throws most of it away.

**Fix:**
1. **Scope the seasonality query:** After fetching CTB's location_species IDs in step 1, add `.in("location_species_id", ctbLocationSpeciesIds)` to the seasonality query so it only fetches CTB data:
   ```typescript
   .in("location_species_id", ctbLocationSpeciesIds)
   .eq("month", currentMonth)
   .in("likelihood", ["common", "occasional"])
   ```
2. **Parallelize steps 2 and 3:** After step 1 completes (we need the IDs), run the scoped seasonality fetch and the active month counts fetch in parallel with `Promise.all`.
3. **Parallelize batch loops:** The batch loop in step 3 (lines 196-210) should use `Promise.all` instead of sequential awaits (same pattern as the identify API fix in the completed fixes section).

**Note:** The old Task 12 (scope seasonality query) is now part of this task — they're the same work on the same file.

---

## P1 — Significant

---

### Task 6: Replace `<img>` tags with `next/image`

**Problem:** Raw `<img>` tags used across the site with `eslint-disable-next-line @next/next/no-img-element` comments. No WebP/AVIF conversion, no responsive srcsets, no blur placeholders, no CLS prevention.

**Complete file list (18 files with `no-img-element`):**
- `src/app/HomePageClient.tsx` (5 instances)
- `src/app/id/page.tsx`
- `src/app/log/page.tsx`
- `src/app/alerts/page.tsx`
- `src/app/locations/page.tsx`
- `src/app/locations/[region]/RegionPageClient.tsx`
- `src/app/locations/[region]/[site]/LocationPageClient.tsx`
- `src/app/locations/[region]/[site]/community/CommunityCalendarClient.tsx`
- `src/app/locations/[region]/[site]/community/[date]/CommunityDayClient.tsx` (2 instances)
- `src/app/species/[slug]/SpeciesPageClient.tsx`
- `src/app/species/[slug]/AboutTab.tsx`
- `src/app/species/[slug]/PhotosTab.tsx`
- `src/app/swims/[id]/TripPageClient.tsx` (2 instances)
- `src/app/swims/[id]/opengraph-image.tsx`
- `src/app/u/[username]/ProfilePageClient.tsx`
- `src/components/SpeciesCard.tsx`
- `src/components/LocationCard.tsx`
- `src/components/PhotoLightbox.tsx`

**Fix:**
1. Replace each `<img>` with `<Image>` from `next/image`. Use `fill` + `sizes` for responsive containers (e.g. hero images, cards), explicit `width`/`height` for fixed-size thumbnails.
2. Remove all `eslint-disable-next-line @next/next/no-img-element` comments.
3. Add missing remote patterns to `next.config.ts`. Current config already has:
   - `*.supabase.co`
   - `inaturalist-open-data.s3.amazonaws.com`
   - `static.inaturalist.org`

   **Add this:**
   - `pub-679ea585b55d48a78970795a14563299.r2.dev` (Cloudflare R2 — primary photo storage)

   Flickr (`live.staticflickr.com`) is not yet integrated — don't add until the pipeline uses it. Wikimedia (`upload.wikimedia.org`) is used for sourcing but photos are self-hosted on R2, so it's not needed unless direct Wikimedia URLs appear in the DB.

**Exclusions — do NOT convert these to `next/image`:**
- `src/app/swims/[id]/opengraph-image.tsx` — uses `ImageResponse` from `next/og`. The `<img>` tag is required; `next/image` cannot be used inside `ImageResponse` JSX. Leave as-is.
- `src/emails/season-alert.tsx` (if it has `<img>` tags) — React Email templates render to HTML for email clients, which don't support Next.js image optimization. Leave as-is.

---

### Task 7: Share auth state between Header and BottomNav

**Files:** `src/components/Header.tsx:27-57`, `src/components/BottomNav.tsx:19-49`

**Problem:** Both components independently call `supabase.auth.getUser()` + query the users table on every page mount. That's 4 client-side DB queries on every navigation, fetching the same data.

**Fix:** Create an `AuthProvider` context component (e.g. `src/components/AuthProvider.tsx`):
- `"use client"` component
- Single `useEffect` that calls `getUser()` once via the browser Supabase client and queries the `users` table for `username`
- Subscribes to `onAuthStateChange` to handle login/logout
- Provides `{ user, username, loading }` via React context
- Header and BottomNav consume the context instead of fetching independently

**Integration:**
1. Wrap children in the root layout (`src/app/layout.tsx`) with `<AuthProvider>`.
2. Refactor Header to use `useAuth()` context hook instead of its own `useEffect` (lines 27-57).
3. Refactor BottomNav to use `useAuth()` context hook instead of its own `useEffect` (lines 19-49).
4. Preserve the `authLoaded` behaviour in BottomNav (profile link is `#` until auth resolves) — this was a fix from the current session.

---

### Task 8: Fetch ID tool locations server-side

**File:** `src/app/id/page.tsx`

**Problem:** Locations (static, rarely-changing data) are fetched client-side via `useEffect` (lines 126-159) on every mount — 2 queries (locations + regions). This delays the first step of the wizard.

**Current structure:** The entire file is `"use client"` (line 1). The page export at line 708 is a simple function that wraps `<SpeciesIdWizard />` in `<Suspense>`. Both the page export and the wizard are in the same client file.

**Fix — file split required:**
1. Create a new file `src/app/id/SpeciesIdWizard.tsx` — move the `SpeciesIdWizard` component (lines 94-702) and its types (`LocationOption`, `SpeciesResult`, `StepId`) and static data (`MONTHS`, `SIZES`, `COLOURS`, `HABITATS`, `DEPTH_ZONES`, `STEPS`) into this file. Keep `"use client"` at the top. Add a `locations` prop typed as `LocationOption[]` (where `LocationOption = { slug: string; name: string; regionName: string }`).
2. Rewrite `src/app/id/page.tsx` as a **server component** (remove `"use client"`):
   ```typescript
   import { Suspense } from "react";
   import { createClient } from "@/lib/supabase/server";
   import Header from "@/components/Header";
   import SpeciesIdWizard from "./SpeciesIdWizard";

   export const revalidate = 3600; // locations rarely change

   async function fetchLocations() {
     const supabase = await createClient();
     // Replicate the logic from the old useEffect (lines 126-159):
     // 1. Fetch all published locations with their region_id
     // 2. Fetch all published regions
     // 3. Map each location to { slug, name, regionName }
     // Return LocationOption[]
   }

   export default async function SpeciesIdPage() {
     const locations = await fetchLocations();
     return (
       <Suspense fallback={
         <main className="min-h-screen bg-slate-50">
           <Header />
           <div className="bg-deep pt-20 pb-8 px-6">
             <div className="max-w-2xl mx-auto">
               <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
             </div>
           </div>
         </main>
       }>
         <SpeciesIdWizard locations={locations} />
       </Suspense>
     );
   }
   ```
3. In the wizard, remove the `useEffect` location fetch (lines 126-159), the `locationsLoading` state, and the loading skeleton for locations (lines 343-350) — locations are now available immediately as a prop.
4. The wizard also uses `locationsByRegion` (computed at lines 176-184 from `locations` state). Keep this computation but derive it from the prop instead of state.

---

## P2 — Moderate

---

### Task 9: Remove debug console.logs from identify API

**File:** `src/app/api/species/identify/route.ts:283-289`

Six `console.log` calls that run on every API request, including a `.find()` loop and `JSON.stringify` on the results array.

**Fix:** Delete lines 283-289 (the entire debug block starting with `"--- Species ID Debug ---"`).

---

### Task 10: Add Cache-Control headers to API routes + remove unnecessary `force-dynamic`

**Files:**
- `src/app/api/search/route.ts`
- `src/app/api/alerts/route.ts`
- `src/app/api/species/identify/route.ts`

**Problem:** No caching on any API response. Additionally, `src/app/api/search/route.ts` has `export const dynamic = "force-dynamic"` (line 4) which is redundant for a route handler that takes `NextRequest` (Next.js already treats these as dynamic) and conflicts with cache headers.

**Fix:**
1. **Search route** (`route.ts` has 1 success return at line 98): Remove `export const dynamic = "force-dynamic"` (line 4 — redundant since the handler takes `NextRequest`). Add `Cache-Control` header to the success response:
   ```typescript
   return NextResponse.json({ results }, {
     headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" }
   });
   ```
2. **Identify route** (1 success return at line 291): Add `Cache-Control` header:
   ```typescript
   return NextResponse.json({ results, total: scored.length }, {
     headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
   });
   ```
3. **Alerts route** (auth-dependent — both GET and POST check `getUser()` and return 401 if unauthenticated): Do **not** add public caching. Add `Cache-Control: private, no-store` to the two **success** responses only (GET success at line 27, POST success at line 72). Error responses (401, 400, 500) don't need cache headers.

---

### Task 11: Add `revalidate` to remaining dynamic pages

**Check these pages** and add `export const revalidate = 3600` where appropriate:
- `src/app/species/[slug]/page.tsx` — species detail (changes rarely)
- `src/app/locations/[region]/page.tsx` — region page
- `src/app/locations/[region]/[site]/page.tsx` — location page
- `src/app/credits/page.tsx` — credits page

For location/region pages, 1 hour revalidation is fine since species data updates via pipeline, not in real-time.

**Note:** If these pages have `export const dynamic = "force-dynamic"`, remove it — `revalidate` and `force-dynamic` conflict.

---

## Completed Fixes (this session — 2026-04-14)

These are already done and verified with `npm run build`. Don't redo them.

### Location site page — `src/app/locations/[region]/[site]/page.tsx`
- **`React.cache()`** wrapping `getLocationData` — deduplicates the double call from `generateMetadata` + page render
- **Parallel seasonality batches** — `Promise.all` instead of sequential for loop
- **Parallel nearby location counts** — `Promise.all` instead of sequential for loop

### Species browse page — `src/app/species/page.tsx`
- **Added `revalidate = 3600`** — ISR caching instead of dynamic on every request

### Species identify API — `src/app/api/species/identify/route.ts`
- **Single location lookup** — was looked up 3 times, now once
- **Single `location_species` fetch** — was fetched 3 times, now once (with `id, species_id, confidence`)
- **Parallel batch queries** — seasonality and species fetches use `Promise.all`
- **Confidence from existing data** — uses Map from already-fetched rows instead of extra queries

### Bottom nav — `src/components/BottomNav.tsx`
- **Profile race condition fix** — added `authLoaded` state; profile link is `#` until auth resolves, preventing false redirects to `/login`
