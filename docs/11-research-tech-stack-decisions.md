# Research Brief: Tech Stack Vendor Decisions

> **⚠️ NOTE** — This doc contains the research *questions* that informed tech stack decisions. Some questions reference an earlier subscription pricing model. The final decisions are documented in `18-plan-app-website-build.md`. Pricing is now one-off A$9.99, and "In Season Now" alerts are free (not premium).

## What I need
Research and recommend the best option for each of these four vendor decisions for Salt Safari. Evaluate each on: cost at our scale, developer experience (solo dev using Next.js + Supabase + Vercel), features we actually need, and ease of integration.

## About Salt Safari
A PWA website built with **Next.js + Supabase + Vercel** where casual swimmers, snorkellers and divers discover what marine species appear at each dive/snorkel location. Australian market first, expanding internationally.

**Key technical context:**
- Solo developer building and maintaining this
- Starting with ~22 locations across Sydney & Central Coast, expanding to hundreds then thousands
- ~27 species now, growing to hundreds then thousands
- Each location has lat/lng coordinates stored in Supabase (Postgres)
- Species are linked to locations with observation counts and seasonality data
- Premium subscription model via Stripe (~$5-10/month)
- Users can favourite locations and receive email alerts
- Need to keep costs very low at launch (pre-revenue)
- Supabase is the database and auth provider
- Photographer affiliate program needs tracking

---

## Decision 1: Maps — Mapbox vs Google Maps

### What maps are used for
- **Location pages** — show a map of the dive/snorkel site with a pin. Users need to find the entry point.
- **Region overview pages** — show all locations in a region (e.g. Sydney) on a map with pins. Users click a pin to go to the location page.
- **Species ID tool** — user picks a location, could be from a map
- **Potentially:** satellite/aerial view so users can see the reef/coastline structure

### Questions to answer
1. **Pricing at our scale.** We're starting with dozens of locations, growing to thousands. Map loads will be modest initially (maybe 1K-10K/month), growing with traffic. What are the free tiers? When do costs kick in?
2. **Satellite/aerial imagery quality** — for coastal Australia specifically. Divers want to see the reef structure from above. Which provider has better coastal satellite imagery?
3. **Developer experience with Next.js** — which has better React components/libraries? (react-map-gl for Mapbox, @vis.gl/react-google-maps for Google Maps, react-leaflet as alternative)
4. **Marker clustering** — when showing many locations on a region map, which handles clustering better out of the box?
5. **Offline/PWA considerations** — can map tiles be cached for offline use? (Users might check a location page before heading to the beach with no signal)
6. **Customisation** — can the map style be themed to match our brand (ocean blues)?
7. **Any gotchas** with either provider? (API key restrictions, billing surprises, terms of service issues)

---

## Decision 2: Search — Algolia vs Meilisearch vs Supabase Full-Text Search

### What search is used for
- **Global search bar** — user types "sea dragon" or "Bare Island" and gets instant results across species and locations
- **Filtering** — filter locations by region, activity (snorkelling/diving), skill level. Filter species by colour, size, habitat.
- **Species ID tool results** — after the user answers the stepped form, we query for matching species. This is database filtering more than text search.
- **Autocomplete** — as-you-type suggestions in the search bar

### Questions to answer
1. **Do we even need a dedicated search service?** Supabase has Postgres full-text search built in. With hundreds (not millions) of records, is a dedicated search service overkill? What are the tradeoffs?
2. **If yes, Algolia vs Meilisearch:**
   - Pricing (Algolia can get expensive — what's the free tier? Meilisearch Cloud pricing?)
   - Self-hosted Meilisearch (on what? We're on Vercel — would need a separate server) vs Meilisearch Cloud
   - Developer experience with Next.js
   - Typo tolerance, fuzzy matching (users will misspell "nudibranch")
   - Speed of indexing when we add new species/locations
3. **Recommendation:** Given our scale (hundreds of records, solo dev, Supabase already in the stack), what's the pragmatic choice? Is Supabase full-text search + client-side filtering sufficient to start, with a migration path to Algolia/Meilisearch later if needed?

---

## Decision 3: Email Service — Resend vs SendGrid

### What email is used for
- **"In Season Now" alerts** — the core premium feature. Monthly (or more frequent) emails to premium subscribers telling them which species are currently being spotted at their favourite locations. These are templated, personalised emails sent in batches.
- **Transactional emails** — signup confirmation, password reset, subscription receipts
- **Welcome sequence** — onboarding emails after signup (free and premium)
- **Future:** weekly newsletter ("What's been spotted this week")

### Questions to answer
1. **Pricing at our scale.** Starting with maybe 100 users, growing to thousands. How many emails/month at each tier? What are the free tiers?
2. **Developer experience** — which integrates better with Next.js + Vercel? Resend was built by ex-Vercel people, so presumably good. SendGrid is more established.
3. **Email template design** — which makes it easier to build nice-looking responsive email templates? (React Email + Resend? SendGrid's template builder?)
4. **Deliverability** — which has better inbox placement out of the box? Our emails are wanted (users opted in for alerts) so spam shouldn't be a huge issue, but still matters.
5. **Batch sending** — "In Season Now" alerts go to all premium users with a given favourite location. Which handles batch/bulk sends better?
6. **Supabase integration** — Supabase has built-in email for auth (signup, password reset). Can we use Resend/SendGrid as the Supabase email provider so all email goes through one service?
7. **Any gotchas?** Rate limits, domain verification requirements, etc.

---

## Decision 4: Affiliate Tracking — Rewardful vs FirstPromoter

### What affiliate tracking is used for
- **Photographer referral program** — each photographer partner gets a unique referral link/code. When their audience visits Salt Safari via that link and subscribes to premium, the photographer earns commission.
- **Tracking:** click → signup → subscription → commission attribution
- **Payouts:** we need to pay photographers their commission (monthly? quarterly?)
- **Dashboard:** photographers need to see their clicks, conversions, and earnings

### Questions to answer
1. **Pricing** — what does each cost? We'll have maybe 5-20 affiliate partners to start, not thousands. What's the minimum viable plan?
2. **Stripe integration** — both work with Stripe. Which integrates more smoothly? We're using Stripe for subscriptions via Supabase.
3. **Ease of setup** — solo dev, want this working quickly. Which is simpler to implement?
4. **Recurring commission support** — we want to pay photographers recurring commission (e.g. 30% for 12 months). Which handles this natively?
5. **Custom referral links** — can photographers get branded links (e.g. saltsafari.app/ref/tompark)?
6. **Cookie duration** — can we configure how long the attribution window lasts?
7. **Payout management** — which makes it easier to actually pay the photographers? PayPal, bank transfer, etc.
8. **Minimum features we need** vs nice-to-haves we don't
9. **Any gotchas?** Hidden fees, minimum commitments, etc.

---

## Deliverable
For each decision, recommend one option with clear reasoning. Prioritise: low cost at launch, solo dev simplicity, good Next.js/Supabase integration, and a migration path if we outgrow the choice.
