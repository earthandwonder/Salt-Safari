# Parallel Agent Prompts

> **What this is:** Prompts for parallel Claude Code instances to implement the adjustments from `docs/24-adjustments.md`. Grouped by dependency — agents in the same round can run simultaneously.

---

## Round 1 (parallel)

### Agent 1 — Homepage Content & Copy

```
You are working on Salt Safari, a Next.js 15 marine species discovery app. Read CLAUDE.md for full context.

Make these changes to the homepage (src/app/page.tsx and src/app/HomePageClient.tsx):

1. **"We'll tell you when they're in town"** → Change to "We'll alert you when they're in town"

2. **"How many can you find?" section** — Rewrite the copy to be more exciting, like collecting Pokémon. Make it feel like a game/challenge. Change the CTA from "Log a sighting" to "Start spotting". This button should link to the spotted tab on the Cabbage Tree Bay site page (the location page with spotted tab active), NOT the log page.

3. **Remove the 3 dot points** ("Works for snorkellers, not just divers. No account needed — completely free. Based on real observation data, not guesswork"). Remove this entire section.

4. **Cabbage Tree Bay blurb** — Add something like "An entry from South Manly makes it one of Sydney's most popular swim spots." Remove the "Plan a visit" link entirely.

5. **New "Discover Species" section on homepage** — Add a section with a heading and subheading about learning/discovering species (deep dives). Show 3 random species cards from the spottable set that have photos. Use the existing dailySeedShuffle function for randomisation. The species cards should link to their species detail pages. Query for this data in the server component (src/app/page.tsx) and pass it down.

6. **"Log a sighting" button** anywhere else on the homepage should also become "Start spotting" and link to the spotted tab, not the log page.

Use the /design frontend design skill for visual quality. Run `npm run build` when done to verify.
```

---

### Agent 2 — Auth, Navigation & Flow Fixes

```
You are working on Salt Safari, a Next.js 15 marine species discovery app. Read CLAUDE.md for full context.

Make these changes:

1. **iOS signup zoom bug** — In src/app/signup/page.tsx and src/app/login/page.tsx, ensure all <input> elements have font-size of at least 16px. iOS Safari auto-zooms on focus when font-size < 16px and never zooms back. Add `text-base` (16px) class to all form inputs across both pages.

2. **Signup confirmation copy** — In src/app/signup/page.tsx, change "Have a good swim" to "Had a good swim" (past tense).

3. **Post-login redirect preservation** — When a user clicks any gated link while logged out (e.g. "Start spotting", anything requiring auth), they get redirected to login. After login, they should be returned to the page they originally wanted, NOT the homepage. Check that:
   - The login page reads a `redirectTo` query param and redirects there after auth
   - The signup page does the same
   - All auth-gated links pass their intended destination as `redirectTo`
   - The log page (src/app/log/page.tsx) already has `redirectTo=%2Flog` — verify this pattern works and is used everywhere

4. **Sticky footer navigation** — Create a new component `src/components/BottomNav.tsx`. This is a mobile app-style sticky footer nav bar with 5 icon-based tabs:
   - **Home** (house icon) → /
   - **Species** (fish icon) → /species
   - **Log** (plus-circle icon) → links to the spotted/log sighting flow
   - **Swims** (waves icon) → /log (the sightings log page)
   - **Profile** (user icon) → /u/[username] (needs to know current user's username)

   Design: fixed to bottom, blurred glass background, active tab highlighted with coral color. Icons should be simple SVG or use a lightweight icon approach. The nav should appear on all pages — add it to the layout or include it in pages that use Header. Hide it on desktop (md: breakpoint and above) since desktop has the header nav.

   The current Header component's mobile nav may need adjusting since the bottom nav now handles mobile navigation.

Use the /design frontend design skill for the bottom nav visual design. Run `npm run build` when done.
```

---

### Agent 3 — Trips/Swims Page Overhaul

```
You are working on Salt Safari, a Next.js 15 marine species discovery app. Read CLAUDE.md for full context.

Make these changes to the sighting log and trip pages:

1. **Rename "Trips" → "Swims" everywhere in the UI** — This includes:
   - Page titles, headings, breadcrumbs
   - src/app/log/page.tsx (the sightings log that groups by "trip")
   - src/app/trips/[id]/page.tsx and its client component
   - src/app/u/[username]/page.tsx (profile page references to trips)
   - Any other references in components
   - ALSO rename the route: move src/app/trips/ → src/app/swims/ and update all internal links from /trips/... to /swims/...

2. **Swims list layout** — In src/app/log/page.tsx, change from 2-column grid to **1-column layout**. Users will typically have 2-6 entries, and 1 column is more visually impactful.

3. **Show user notes on trip/swim species cards** — In the trip detail page (src/app/trips/[id]/), each species card should display the user's note for that sighting. The `notes` field is already in TripSighting type — make sure it renders on the card.

4. **Trip detail page button fixes**:
   - "View trip report" text → "Review shareable report"
   - The share button next to it should look more like a proper button or link (not just an icon)
   - Right-align the share button

5. **Add "See what everyone saw" link** on the trip detail page. This links to `/locations/[region]/[site]/community/[date]` using the trip's location and date. The destination page doesn't exist yet — just add the link/button.

Use the /design frontend design skill for visual quality. Run `npm run build` when done.
```

---

### Agent 4 — Species Cards & Spotter Tiers

```
You are working on Salt Safari, a Next.js 15 marine species discovery app. Read CLAUDE.md for full context.

Make these changes:

1. **Remove "Common" likelihood pill** — In src/components/LikelihoodPill.tsx, keep "occasional" and "rare" but do not render anything for "common". Update the component so that when likelihood is "common", it returns null (renders nothing). Check all usages of LikelihoodPill across the codebase to ensure they handle the null/empty case gracefully (no layout shifts).

2. **Species card tap reliability** — In src/components/SpeciesCard.tsx and anywhere species cards are rendered in a grid/list (species page, trip page), investigate if CSS animations or transitions (card-lift, hover effects, Motion animations) are interfering with tap targets on mobile. The issue is: tapping a species card sometimes shifts it instead of navigating. Fix by ensuring:
   - The Link wrapper is the outermost clickable element
   - Any transform/translate animations don't intercept touch events
   - Add `touch-action: manipulation` to prevent double-tap-to-zoom delays
   - If Motion (framer-motion) is wrapping cards, ensure the animation doesn't eat click events

3. **Spotter range tiers** — Create a utility at src/lib/spotter-tiers.ts that exports a function `getSpotterTier(speciesCount: number)` returning `{ name: string, minSpecies: number, maxSpecies: number | null }`. The tiers are:

   | Species spotted | Tier name |
   |---|---|
   | 0 | Dry Feet |
   | 1–5 | Wader |
   | 6–15 | Snorkeller |
   | 16–30 | Free Diver |
   | 31–50 | Reef Keeper |
   | 51–75 | Deep Diver |
   | 76–100 | Ocean Sage |
   | 100+ | Sea Legend |

   Then display the tier:
   - On the profile page (src/app/u/[username]/page.tsx) — show the tier badge prominently near the user's name/stats
   - On the swims/log page (src/app/log/page.tsx) — show near the "X of Y species" progress stat

   Design the tier badge to look good — use a pill/badge style, maybe with a subtle color that intensifies with higher tiers.

Use the /design frontend design skill for visual design. Run `npm run build` when done.
```

---

## Round 2 (after Agent 1 finishes)

### Agent 5 — Community Day Page

```
You are working on Salt Safari, a Next.js 15 marine species discovery app. Read CLAUDE.md for full context.

Build a new "Community Day" feature — a page showing what EVERYONE spotted at a location on a given day.

1. **New page: `/locations/[region]/[site]/community/[date]`**
   - Create src/app/locations/[region]/[site]/community/[date]/page.tsx
   - Query the sightings table for all sightings at this location on this date (all users)
   - Display: the date, location name, total species seen that day, total sighters
   - Show a grid of species cards for everything spotted, with observation count per species
   - Show which users contributed (display names, link to profiles)
   - If no sightings exist for that date, show a friendly empty state

2. **Calendar browser: `/locations/[region]/[site]/community`**
   - Create src/app/locations/[region]/[site]/community/page.tsx
   - Show a calendar view where days with sightings are highlighted
   - Clicking a day navigates to the date-specific page above
   - Show a summary: total unique species seen this month, total community sightings
   - Default to the current month, with prev/next month navigation

3. **Homepage section** — Add a section to the homepage (src/app/HomePageClient.tsx) promoting the community day feature. Include:
   - A heading like "See what others are finding"
   - A subheading about community sightings
   - A visual card/image linking to the community calendar for Cabbage Tree Bay
   - Add this BELOW the existing "Discover Species" section (which may have been added by another agent — if it doesn't exist yet, add it below the collection/gamification section)

4. **Data requirements** — The sightings table already has user_id, species_id, location_id, sighted_at. Query this data server-side. Join with species table for names/images and users table for display names.

Use the /design frontend design skill for all page designs. This should feel exciting — like a community leaderboard/feed. Run `npm run build` when done.
```

---

## Dependency Map

```
Agent 1 (Homepage)          ─── independent
Agent 2 (Auth & Nav)        ─── independent
Agent 3 (Trips/Swims)       ─── independent (adds link to Agent 5's page, just needs agreed URL)
Agent 4 (Cards & Pills)     ─── independent
Agent 5 (Community Day)     ─── runs AFTER Agent 1 (both edit homepage)
```

Agents 3 and 5 share a URL convention: `/locations/[region]/[site]/community/[date]` — agreed upfront so both can work without coordination.

## Decisions Made

- **Trips → Swims** rename (UI text only, not routes)
- **Footer nav tabs:** Home, Species, Log, Swims, Profile
- **Community day URL:** `/locations/[region]/[site]/community/[date]`
- **Homepage CTA:** "Start spotting" (links to spotted tab)
- **Remove "Common" pill** — only show Occasional and Rare
- **Remove 3 dot points** from homepage
- **Spotter tiers:** Dry Feet → Wader → Snorkeller → Free Diver → Reef Keeper → Deep Diver → Ocean Sage → Sea Legend
- **Discover species section:** 3 random spottable species with photos, daily shuffle
