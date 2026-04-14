# Performance Audit — Implementation Sessions

> **5 sessions total.** Round 1 has 4 sessions that can run in parallel (zero file overlap). Round 2 has 1 session that runs after Round 1 merges.
>
> Each session is self-contained. Read the full session before starting. Run `npm run build` at the end to verify.
>
> **Do not redo completed fixes.** The following are already done:
> - `src/app/locations/[region]/[site]/page.tsx` — `React.cache()`, parallel seasonality batches, parallel nearby location counts
> - `src/app/species/page.tsx` — `revalidate = 3600`
> - `src/app/api/species/identify/route.ts` — deduplicated lookups, parallel batch queries
> - `src/components/BottomNav.tsx` — `authLoaded` race condition fix

---

## Round 1 — Run these 4 sessions in parallel

---

### Session A: Home Page Performance + Middleware Scoping

**Audit tasks:** 2, 3, 5

**Files you will modify:**
- `src/app/page.tsx`
- `src/app/HomePageClient.tsx`
- `src/middleware.ts`

**Do these steps in order:**

#### Step 1: Move home page auth to client side

The server component (`src/app/page.tsx`) calls `supabase.auth.getUser()` at line 258 and uses the result to:
- Fetch user's CTB sightings (lines 265-297)
- Build `collectionPreviewSpecies` with user-specific "revealed" flags (lines 319-340)
- Pass `isLoggedIn`, `userSpottedCount`, `userLatestLog` as props to `HomePageClient`

This forces `export const dynamic = "force-dynamic"` (line 4), which means every request hits the DB.

**In `src/app/page.tsx`:**
1. Delete the `getUser()` call (line 258), the `isLoggedIn` variable (line 259), the `userSpottedSpeciesIds` / `userSpottedCount` / `userLatestLog` variables and the entire `if (user)` block (lines 261-297).
2. For the collection preview (lines 319-350): remove the `if (isLoggedIn && userSpottedSpeciesIds.size > 0)` branch. Always use the logged-out path: random shuffle, `revealed: index < 4`. The server now produces a static array.
3. Remove `isLoggedIn`, `userSpottedCount`, and `userLatestLog` from the props passed to `HomePageClient` (around line 353-366). Keep all other props.
4. Add a new prop: `ctbLocationId={ctbLocation.id}`. The client needs this to query the user's sightings. (`ctbLocation` is fetched at lines 87-93 using the hardcoded slug `"cabbage-tree-bay"`.)

**In `src/app/HomePageClient.tsx`:**
1. Remove `isLoggedIn`, `userSpottedCount`, and `userLatestLog` from the props interface (lines 43-56). Add `ctbLocationId: string` to the props interface. Keep `collectionPreviewSpecies` as a prop (it's already there). Also add a `collectionPreview` state variable initialized from the prop — this state copy will be updated client-side when auth resolves:
   ```typescript
   const [collectionPreview, setCollectionPreview] = useState(collectionPreviewSpecies);
   ```
   Use `collectionPreview` (state) instead of `collectionPreviewSpecies` (prop) everywhere the collection grid is rendered.
2. Add a `useEffect` that:
   - Calls `getUser()` via the browser Supabase client (`src/lib/supabase/client.ts`)
   - If logged in, fetches the user's CTB sightings using `ctbLocationId` prop (replicate the query from the deleted server code — `sightings` table filtered by `user_id` and `location_id`):
     ```typescript
     const { data: userSightings } = await supabase
       .from("sightings")
       .select("species_id, sighted_at, location_id, species:species_id (hero_image_url), locations:location_id (name)")
       .eq("user_id", user.id)
       .eq("location_id", ctbLocationId)
       .order("sighted_at", { ascending: false });
     ```
   - Stores `isLoggedIn`, `userSpottedCount`, `userLatestLog`, and `userSpottedSpeciesIds` in component state
3. When auth resolves and user is logged in, recompute `collectionPreview` (the state variable, not the prop) client-side: mark species the user has spotted as `revealed: true`, and re-sort to put spotted species first. The server-provided `collectionPreviewSpecies` prop has all the species data needed — just update the `revealed` flags and order via `setCollectionPreview(...)`.
4. The auth-dependent UI sections need to handle the loading-then-resolved transition:
   - **Collection grid**: Starts with server default (first 4 revealed), updates when auth resolves to show user's spotted species as revealed.
   - **Progress bar** (line ~72 in HomePageClient): Show 0% while loading, animate to real percentage when auth resolves.
   - **Latest swim card** (line ~328): Show "Shareable swim report" with placeholder data by default. Update to "Your latest swim" with real data when auth resolves.
   - **CTA button** (line ~410): Default to `/signup?redirectTo=%2Flog`. Switch to `/log` when logged in.
   - Use a fade-in or brief skeleton state — don't flash wrong content then replace it.

#### Step 2: Switch home page to ISR

**In `src/app/page.tsx`:**
1. Remove `export const dynamic = "force-dynamic";` (line 4).
2. Add `export const revalidate = 3600;` (1 hour ISR cache).

The server component now only fetches public data, so ISR is safe.

#### Step 3: Fix home page sequential data fetching

**In `src/app/page.tsx` (lines 109-211):**

The data fetching has three sequential operations that should be optimized:

1. **Scope the seasonality query** (lines 145-161): Currently fetches ALL seasonality rows site-wide for the current month, then filters to CTB in JS at line 180. After the location_species paginated fetch (lines 116-141), scope it:
   ```typescript
   .in("location_species_id", ctbLocationSpeciesIds)
   .eq("month", currentMonth)
   .in("likelihood", ["common", "occasional"])
   ```
2. **Parallelize steps 2 and 3:** After step 1 (paginated location_species fetch) completes — we need the IDs — run the scoped seasonality fetch and the active month counts fetch (lines 196-210) in parallel with `Promise.all`.
3. **Parallelize the batch loop** in the active month counts fetch (lines 196-210): Use `Promise.all` on all batches instead of sequential `for` loop with `await`.

#### Step 4: Scope middleware to protected routes only

**In `src/middleware.ts`:**

Replace the current catch-all matcher:
```typescript
matcher: [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
],
```

With an explicit allowlist:
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

This is safe because: the home page's server-side `getUser()` was removed in Step 1. The region, site, species, and credits pages have no server-side auth calls (verified). All auth on public pages is client-side via Header/BottomNav.

#### Verify

- `npm run build` passes
- Home page loads correctly for logged-out users (ISR cached)
- Home page shows personalized data after client-side auth resolves for logged-in users
- Login/signup flows work (`/auth/callback` is in the middleware matcher)
- Public pages (`/locations/*`, `/species/*`, `/id`) load without auth errors

---

### Session B: Region Page Query Fix + ISR for Dynamic Pages

**Audit tasks:** 4, 11

**Files you will modify:**
- `src/app/locations/[region]/page.tsx`
- `src/app/locations/[region]/[site]/page.tsx`
- `src/app/species/[slug]/page.tsx`
- `src/app/credits/page.tsx`

#### Step 1: Fix the N+1 query in the region page

**In `src/app/locations/[region]/page.tsx` (lines 58-136):**

A `for (const loc of locationsRaw)` loop runs sequential queries per location: count query, paginated location_species fetch, batched seasonality fetch, JS aggregation. A region with 20 locations = 60-100+ queries.

Replace the per-location loop (lines 58-136) with a batched approach:

1. **Batch fetch all location_species** for the entire region in one paginated query:
   ```typescript
   const locationIds = locationsRaw.map(l => l.id);
   const allRegionLS: { id: string; location_id: string; species_id: string }[] = [];
   let from = 0;
   const pageSize = 500;
   let hasMore = true;
   while (hasMore) {
     const { data: batch } = await supabase
       .from("location_species")
       .select("id, location_id, species_id")
       .in("location_id", locationIds)
       .eq("is_spottable", true)
       .range(from, from + pageSize - 1);
     if (!batch || batch.length === 0) { hasMore = false; }
     else {
       allRegionLS.push(...batch);
       from += pageSize;
       if (batch.length < pageSize) hasMore = false;
     }
   }
   ```

2. **Batch fetch all seasonality** in parallel:
   ```typescript
   const allLsIds = allRegionLS.map(ls => ls.id);
   const batchSize = 200;
   const seasonalityBatches = [];
   for (let i = 0; i < allLsIds.length; i += batchSize) {
     seasonalityBatches.push(
       supabase
         .from("species_seasonality")
         .select("location_species_id, month, likelihood")
         .in("location_species_id", allLsIds.slice(i, i + batchSize))
         .in("likelihood", ["common", "occasional"])
     );
   }
   const seasonalityResults = await Promise.all(seasonalityBatches);
   const allSeasonality = seasonalityResults.flatMap(r => r.data ?? []);
   ```

3. **Aggregate per location** in JS:
   ```typescript
   const currentMonth = new Date().getMonth() + 1;
   // Build map: location_species_id -> { locationId, activeMonths: Set<number> }
   // Then group by location_id to get:
   //   speciesCount = count of location_species rows for that location
   //   inSeasonCount = count where activeMonths.size >= 1 && activeMonths.size <= 8 && activeMonths.has(currentMonth)
   ```

**Required output shape:** Each location in the result array must have:
- `speciesCount` — total spottable species at that location
- `inSeasonCount` — species with 1-8 active months AND active in the current month

These are passed to `RegionPageClient` as `locations: RegionLocation[]`. The `RegionLocation` type extends the base location fields (id, name, slug, hero_image_url, skill_level, depth_min, depth_max, activities, lat, lng) with these two computed counts.

Preserve the in-season filter logic from the current code (lines 117-128): a species is "in season" if it has between 1 and 8 active months (common/occasional) AND the current month is one of those active months. Species active year-round (all 12 months) or never are excluded from the in-season count.

#### Step 2: Add ISR to remaining dynamic pages

Add `export const revalidate = 3600;` to each of these pages (near the top, alongside other exports). If any page has `export const dynamic = "force-dynamic"`, remove it — `revalidate` and `force-dynamic` conflict.

- `src/app/locations/[region]/page.tsx` — add after the refactored query code
- `src/app/locations/[region]/[site]/page.tsx` — check if it already has revalidate (it may from completed fixes)
- `src/app/species/[slug]/page.tsx`
- `src/app/credits/page.tsx`

#### Verify

- `npm run build` passes
- Region pages load with correct species counts and in-season counts per location
- Species, location, and credits pages still render correctly

---

### Session C: Loading Skeletons + Auth Provider

**Audit tasks:** 1, 7

**Files you will create:**
- `src/app/locations/[region]/loading.tsx`
- `src/app/locations/[region]/[site]/loading.tsx`
- `src/app/species/[slug]/loading.tsx`
- `src/app/u/[username]/loading.tsx`
- `src/app/credits/loading.tsx`
- `src/components/AuthProvider.tsx`

**Files you will modify:**
- `src/components/Header.tsx`
- `src/components/BottomNav.tsx`
- `src/app/layout.tsx`

#### Step 1: Create loading skeletons

Create a `loading.tsx` file in each of these directories. Each should export a default React component that renders a skeleton matching that page's layout.

**Style reference:** Look at:
- `src/app/id/page.tsx:711-720` — dark hero with single pulsing bar
- `src/app/log/page.tsx:268-281` — card skeletons with title/subtitle/thumbnail placeholders

**Use `animate-pulse` on `bg-slate-100` (light sections) or `bg-white/10` (dark sections). Use the Pelagic design tokens: `bg-deep` for dark hero areas, `bg-sand` or `bg-slate-50` for content areas.**

For each page:

1. **`src/app/locations/[region]/loading.tsx`** — Region page: dark hero placeholder (region name bar, subtitle bar), then a grid of 3-4 location card skeletons (image placeholder + title + subtitle).

2. **`src/app/locations/[region]/[site]/loading.tsx`** — Site page: dark hero placeholder (location name bar, breadcrumb bar), then tab bar skeleton, then content area with species card grid placeholders.

3. **`src/app/species/[slug]/loading.tsx`** — Species page: dark hero placeholder (species name bar, scientific name bar), then content area with text line placeholders and image placeholder.

4. **`src/app/u/[username]/loading.tsx`** — Profile page: dark hero placeholder (username bar), then stats row skeleton, then card grid placeholders.

5. **`src/app/credits/loading.tsx`** — Credits page: dark hero placeholder (title bar), then text block with line placeholders.

Keep them simple — 15-30 lines each. They just need to prevent the blank white screen flash.

#### Step 2: Create AuthProvider context

**Create `src/components/AuthProvider.tsx`:**

```typescript
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  username: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();
        setUsername(data?.username ?? null);
      }
      setLoading(false);
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);
        if (newUser) {
          const { data } = await supabase
            .from("users")
            .select("username")
            .eq("id", newUser.id)
            .single();
          setUsername(data?.username ?? null);
        } else {
          setUsername(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### Step 3: Integrate AuthProvider into layout

**In `src/app/layout.tsx`:**

The current layout body renders three siblings: `{children}`, `<BottomNav />`, and `<CookieConsent />`. The AuthProvider must wrap **all three** so that both BottomNav and any Header rendered inside page content can access the auth context.

```typescript
import { AuthProvider } from "@/components/AuthProvider";

// Replace the body contents:
<body className="font-body antialiased pb-20 md:pb-0">
  <AuthProvider>
    {children}
    <BottomNav />
    <CookieConsent />
  </AuthProvider>
</body>
```

Note: Header is not rendered in the layout — it's rendered inside individual pages (as part of `{children}`), so it's automatically inside the AuthProvider.

#### Step 4: Refactor Header to use auth context

**In `src/components/Header.tsx`:**

1. Import `useAuth` from `@/components/AuthProvider`.
2. Replace the entire auth `useEffect` (lines 27-57) and the `user`, `username`, `loading` state variables with:
   ```typescript
   const { user, username, loading } = useAuth();
   ```
3. Keep the `scrolled` and `menuOpen` state variables — they are unrelated to auth.
4. Keep the `createClient` import — it's still needed for `handleSignOut()` (line 75 calls `supabase.auth.signOut()`).
5. All existing UI logic that uses `user`, `username`, `loading` stays the same — it's now reading from context instead of local state. The component uses `user` in JSX (line ~148, ~261) to conditionally render authenticated vs unauthenticated UI.

#### Step 5: Refactor BottomNav to use auth context

**In `src/components/BottomNav.tsx`:**

1. Import `useAuth` from `@/components/AuthProvider`.
2. Replace the auth `useEffect` (lines 20-49) and the `username`, `authLoaded` state variables with:
   ```typescript
   const { username, loading } = useAuth();
   const authLoaded = !loading;
   ```
   Note: only destructure `username` and `loading` — BottomNav doesn't use the `user` object.
3. The `authLoaded` alias preserves the existing profile link behaviour (link is `#` until auth resolves, preventing false redirects to `/login`).
4. Remove the `createClient` import — BottomNav has no other Supabase usage.

#### Verify

- `npm run build` passes
- Navigate to each route with loading skeletons — skeleton flashes briefly before content loads
- Login/logout updates both Header and BottomNav simultaneously (shared state)
- Profile link in BottomNav doesn't flash `/login` redirect before auth resolves

---

### Session D: ID Tool Server-Side + API Route Cleanup

**Audit tasks:** 8, 9, 10

**Files you will create:**
- `src/app/id/SpeciesIdWizard.tsx`

**Files you will modify:**
- `src/app/id/page.tsx`
- `src/app/api/species/identify/route.ts`
- `src/app/api/search/route.ts`
- `src/app/api/alerts/route.ts`

#### Step 1: Split ID tool into server + client components

The entire `src/app/id/page.tsx` is currently `"use client"` (line 1, 726 lines). Locations are fetched client-side via `useEffect` (lines 126-159) on every mount. Split it:

**Create `src/app/id/SpeciesIdWizard.tsx`:**
1. Add `"use client";` at the top.
2. Move these from `page.tsx`:
   - Types: `LocationOption` (lines 63-67: `{ slug: string; name: string; regionName: string }`), `SpeciesResult` (lines 69-77), `StepId` (line 79)
   - Static data: `MONTHS`, `SIZES`, `COLOURS`, `HABITATS`, `DEPTH_ZONES`, `STEPS` (lines 14-88)
   - The `SpeciesIdWizard` component (lines 94-702)
3. Add a `locations` prop to the wizard: `{ locations: LocationOption[] }`.
4. Remove the `useEffect` that fetches locations (lines 126-159) and the `locationsLoading` state.
5. Remove the loading skeleton for locations (lines 343-350) — locations are now available immediately.
6. The wizard uses `locationsByRegion` (computed at lines 176-184 from `locations` state). Keep this computation but derive from the `locations` prop instead:
   ```typescript
   const locationsByRegion = useMemo(() => {
     const grouped: Record<string, LocationOption[]> = {};
     for (const loc of locations) {
       if (!grouped[loc.regionName]) grouped[loc.regionName] = [];
       grouped[loc.regionName].push(loc);
     }
     return grouped;
   }, [locations]);
   ```
7. Move all necessary imports with the component.

**Rewrite `src/app/id/page.tsx` as a server component:**
```typescript
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import SpeciesIdWizard from "./SpeciesIdWizard";

export const revalidate = 3600;

async function fetchLocations() {
  const supabase = await createClient();

  // Replicate the logic from the deleted useEffect:
  const { data: locationsData } = await supabase
    .from("locations")
    .select("slug, name, region_id")
    .eq("published", true)
    .order("name");

  const { data: regionsData } = await supabase
    .from("regions")
    .select("id, name")
    .eq("published", true);

  const regionMap = new Map(
    (regionsData ?? []).map((r) => [r.id, r.name])
  );

  return (locationsData ?? []).map((loc) => ({
    slug: loc.slug,
    name: loc.name,
    regionName: regionMap.get(loc.region_id) ?? "Unknown",
  }));
}

export default async function SpeciesIdPage() {
  const locations = await fetchLocations();
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <Header />
          <div className="bg-deep pt-20 pb-8 px-6">
            <div className="max-w-2xl mx-auto">
              <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </main>
      }
    >
      <SpeciesIdWizard locations={locations} />
    </Suspense>
  );
}
```

#### Step 2: Remove debug console.logs from identify API

**In `src/app/api/species/identify/route.ts`:**

Delete lines 283-289 — the entire debug block starting with `console.log("--- Species ID Debug ---")`. This includes the `.find()` loop and `JSON.stringify` calls that run on every request.

#### Step 3: Add Cache-Control headers to API routes

**In `src/app/api/search/route.ts`:**
1. Remove `export const dynamic = "force-dynamic";` (line 4 — redundant since the handler takes `NextRequest`).
2. Add `Cache-Control` header to the success response (line 98):
   ```typescript
   return NextResponse.json({ results }, {
     headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" }
   });
   ```

**In `src/app/api/species/identify/route.ts`:**
Add `Cache-Control` header to the success response (line 291, or wherever it is after Step 2's deletion):
```typescript
return NextResponse.json({ results, total: scored.length }, {
  headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
});
```

**In `src/app/api/alerts/route.ts`:**
This route is auth-dependent — both GET and POST check `getUser()`. Add `Cache-Control: private, no-store` to the two success responses only:
- GET success (line 27): `return NextResponse.json({ alerts: data }, { headers: { "Cache-Control": "private, no-store" } });`
- POST success (line 72): `return NextResponse.json({ alert: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });`

Do not add cache headers to error responses (401, 400, 500).

#### Verify

- `npm run build` passes
- Species ID tool loads and the location step shows locations immediately (no client-side loading spinner)
- Search API returns `Cache-Control` header
- Identify API returns `Cache-Control` header and no console.log output

---

## Round 2 — Run after Round 1 merges

---

### Session E: Replace `<img>` with `next/image`

**Audit task:** 6

**Why Round 2:** This session touches files that Round 1 sessions also modified. Specifically, `HomePageClient.tsx` (Session A), `id/page.tsx` (Session D, now split — img tags will be in `SpeciesIdWizard.tsx`).

**Files you will modify:**
- `src/app/HomePageClient.tsx` (5 instances)
- `src/app/id/SpeciesIdWizard.tsx` (was `id/page.tsx` before Session D split it)
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
- `src/app/u/[username]/ProfilePageClient.tsx`
- `src/components/SpeciesCard.tsx`
- `src/components/LocationCard.tsx`
- `src/components/PhotoLightbox.tsx`
- `next.config.ts`

#### Step 1: Add missing remote pattern to `next.config.ts`

The current `images.remotePatterns` config has `*.supabase.co`, `inaturalist-open-data.s3.amazonaws.com`, and `static.inaturalist.org`.

Add:
```typescript
{
  protocol: "https",
  hostname: "pub-679ea585b55d48a78970795a14563299.r2.dev",
},
```

This is the Cloudflare R2 bucket where photos are self-hosted.

#### Step 2: Replace `<img>` tags with `next/image`

For each file listed above, search for `eslint-disable-next-line @next/next/no-img-element` and the `<img>` tag below it. Replace with `<Image>` from `next/image`.

**Conversion patterns:**
- **Card thumbnails / avatars** (small, fixed size): Use explicit `width` and `height` props.
  ```tsx
  // Before
  <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover" />
  // After
  <Image src={url} alt={name} width={48} height={48} className="rounded-full object-cover" />
  ```
- **Hero images / responsive containers** (fill parent): Use `fill` + `sizes` + `className="object-cover"`. The parent must have `position: relative` and defined dimensions.
  ```tsx
  // Before
  <img src={url} alt={name} className="w-full h-48 object-cover" />
  // After
  <div className="relative w-full h-48">
    <Image src={url} alt={name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
  </div>
  ```
- **Conditional images** (src may be null): `next/image` requires a valid `src`. Guard with a conditional or provide a fallback.
- **Lightbox / modal images** (`src/components/PhotoLightbox.tsx`): The current `<img>` uses `max-h-[75vh] object-contain` inside a fixed-position modal overlay. To convert, wrap in a relative container with constrained dimensions and use `fill` + `object-contain`:
  ```tsx
  // Before
  <img src={photo.url} alt={alt} className="w-full max-h-[75vh] object-contain rounded-lg" />
  // After
  <div className="relative w-full" style={{ height: "75vh" }}>
    <Image src={photo.url} alt={alt} fill className="object-contain rounded-lg" sizes="100vw" />
  </div>
  ```

Remove the `eslint-disable-next-line @next/next/no-img-element` comment for each replacement.

#### Exclusions — do NOT convert

- **`src/app/swims/[id]/opengraph-image.tsx`** — Uses `ImageResponse` from `next/og`. The `<img>` tag is required inside `ImageResponse` JSX; `next/image` does not work there. Leave as-is.
- **`src/emails/season-alert.tsx`** — React Email templates render to HTML for email clients. `next/image` does not work in email contexts. Leave as-is if it has `<img>` tags.

#### Verify

- `npm run build` passes with zero `@next/next/no-img-element` warnings
- `npm run lint` passes
- Images render correctly at mobile and desktop widths
- No broken images (check that all image URLs match the configured remote patterns)
