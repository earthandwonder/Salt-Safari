# Pricing and affiliate strategy for Salt Safari

> **⚠️ SUPERSEDED** — This doc recommended a subscription model. The final decision is **one-off purchase A$9.99** (no subscription, no recurring billing). See `18-plan-app-website-build.md` Sections 3 and 6 for the current pricing model. Kept for historical context only.

**Salt Safari should launch at A$4.99/month or A$39.99/year, with a 30% recurring affiliate commission for photographers — rising to 40% for founding partners.** This positions the app firmly in impulse-buy territory (under a single coffee) while generating meaningful recurring income for photographer affiliates. The pricing sits below comparable nature ID apps like PeakVisor (A$62/yr) and AllTrails Plus (A$56/yr), appropriate for a new brand entering a market where most marine apps are free. Combined with a 7-day free trial layered on top of the existing freemium tier, this structure balances three competing constraints: low enough for photographers to recommend without hesitation, high enough that 30% commissions compound into real money, and competitive enough for an unknown brand entering a price-sensitive Australian market.

---

## The competitive landscape reveals a clear pricing gap

The nature and outdoor app market divides into three pricing tiers. Premium fitness platforms like Strava (A$125/yr) and FishBrain (A$125/yr) command top-dollar because users engage daily. Mid-tier discovery apps — AllTrails Plus (A$56/yr), PeakVisor (A$62/yr), Gaia GPS (A$62/yr), PictureThis (A$47–62/yr) — cluster around **A$45–65/year** for species identification and location-based content. Budget nature ID apps like PlantSnap sit at A$31/yr.

Marine-specific apps represent a striking anomaly: **nearly all are free**. PADI, SSI, Diveboard, and Diviac charge nothing, monetising through certifications instead. The only paid marine ID app found — Seabook — charges just A$3/week from a solo developer with ~1,700 species. Reef Life Pro sells individual species packs as one-off purchases. This creates both an opportunity and a constraint. The opportunity: no established subscription competitor owns the "marine species discovery" space. The constraint: users accustomed to free marine apps need a compelling reason to pay, and the price must feel trivially low to overcome that inertia.

Free nonprofit apps like Merlin Bird ID, iNaturalist, and Seek set a high bar for what users expect at zero cost. Salt Safari's defensible advantage — **Australia-specific seasonal data, location-tied species alerts, and curated editorial content** — must be clearly differentiated from what free alternatives provide.

## A$4.99/month hits the impulse-buy sweet spot

Three data points converge on this price. First, Australian consumer research shows **under A$5/month registers as an impulse buy** — equivalent to "less than 17 cents a day" or "cheaper than a single coffee." Above A$10/month, purchases require active justification. Second, RevenueCat's 2026 analysis of 10,000+ subscription apps places the median monthly price at **A$5–10** across all categories, with nature and hobby apps trending toward the lower end. Third, for a new brand without ratings, reviews, or word-of-mouth, pricing below established competitors reduces the risk barrier for first-time users.

**Recommended pricing structure (all GST-inclusive):**

| Plan | Price | Effective monthly | Discount vs monthly |
|------|-------|-------------------|---------------------|
| Monthly | **A$4.99/mo** | A$4.99 | — |
| Annual | **A$39.99/yr** | A$3.33 | 33% (4 months free) |

The annual discount of 33% is slightly more aggressive than the industry median of 16.7%, deliberately so. For a new app, locking users into annual plans improves retention and lifetime value during the critical early months when content is still expanding. Frame the annual plan as **"4 months free"** and display it as A$3.33/month alongside the monthly option, with a "Best Value" badge and pre-selected toggle.

At these prices, per-subscriber revenue after GST (10%) breaks down to **A$4.54/month** on monthly plans and **A$36.36/year** on annual plans — before any payment processing fees. For a PWA sold outside app stores, there is no 15–30% platform commission, a significant margin advantage. However, Salt Safari must register for GST once turnover exceeds A$75,000 and handle collection and remittance directly.

## Why not lower or higher

Pricing at A$2.99/month (the "founding member" option some advisors suggest) creates two problems. It anchors users to an unsustainably low price, making future increases feel punitive, and it generates only A$0.90/month in affiliate commissions at 30% — too little to motivate promotion. Pricing at A$6.99 or A$7.99/month crosses into "considered purchase" territory where casual snorkellers and families evaluate whether they'll use the app enough, increasing friction at exactly the wrong moment (when a photographer is trying to convert their audience with a quick call-to-action).

**A$4.99 threads the needle**: photographers can genuinely say *"it's less than five bucks"*, which feels like a throwaway amount, while the 30% commission still compounds into meaningful recurring income at scale.

## The affiliate commission structure that actually motivates photographers

Research across 20+ affiliate programs reveals a clear hierarchy. Outdoor retail brands pay **5–8%** (REI at 5%, Patagonia at 8%). App subscription programs cluster at **10–20%** (AllTrails at 10%, Headspace at 20%, FishBrain at ~8%). Creator platforms set the high bar at **30% recurring** (Ghost's lifetime program is the gold standard for low-price subscriptions). For a product priced under A$5/month, anything below 25% produces per-referral earnings too small to motivate consistent promotion.

**Recommended commission structure:**

| Element | Standard partners | Founding partners (first 50) |
|---------|------------------|------------------------------|
| Commission rate | **30% recurring** | **40% recurring** |
| Duration | 12 months per subscriber | 12 months per subscriber |
| Monthly sub commission | A$1.50/mo per active sub | A$2.00/mo per active sub |
| Annual sub commission | A$12.00 per annual sub | A$16.00 per annual sub |
| Cookie window | 60 days | 60 days |
| Minimum payout | A$20 | A$20 |
| Payment frequency | Monthly | Monthly |

The **founding partner tier at 40%** serves a specific strategic purpose: it gives early photographers a genuine financial incentive to promote an unknown brand when there is no social proof yet. Cap this at the first 50 partners or the first 6 months, whichever comes first, then transition new partners to the standard 30% rate. Existing founding partners keep their 40% rate for the full 12-month window on each subscriber they refer, creating loyalty and reducing the temptation to switch attention to competing products.

A **12-month recurring window** (rather than lifetime or one-time) balances affiliate attractiveness with business sustainability. Ghost's lifetime recurring model works because Ghost Pro plans cost A$14–310/month; at A$4.99/month, lifetime commissions would eventually make high-performing affiliates more expensive than the revenue they generate. Twelve months gives photographers time to build compounding income while ensuring the business retains full margin on long-term subscribers.

The **60-day cookie window** is deliberately generous. Niche outdoor products have longer consideration cycles than mainstream apps — a user might see a photographer's recommendation, bookmark it, and not subscribe until their next beach trip weeks later. A 60-day window captures this delayed conversion. For comparison, REI offers just 15 days, AllTrails offers 24 hours, and Patagonia offers 60 days.

## Photographer earnings at scale make the pitch compelling

The model below assumes monthly subscribers at A$4.99/month with 30% recurring commission (A$1.50/month per active subscriber). These are cumulative active subscribers, meaning earnings compound as new referrals add to the existing base.

**Standard partner earnings (30% commission, A$1.50/mo per subscriber):**

| Followers | 0.5% convert | 1% convert | 2% convert |
|-----------|-------------|------------|------------|
| 1,000 | 5 subs → **A$7.50/mo** | 10 → A$15/mo | 20 → A$30/mo |
| 5,000 | 25 → A$37.50/mo | 50 → **A$75/mo** | 100 → A$150/mo |
| 10,000 | 50 → A$75/mo | 100 → **A$150/mo** | 200 → A$300/mo |
| 50,000 | 250 → A$375/mo | 500 → **A$750/mo** | 1,000 → A$1,500/mo |
| 100,000 | 500 → A$750/mo | 1,000 → **A$1,500/mo** | 2,000 → A$3,000/mo |

**Founding partner earnings (40% commission, A$2.00/mo per subscriber):**

| Followers | 0.5% convert | 1% convert | 2% convert |
|-----------|-------------|------------|------------|
| 1,000 | 5 subs → **A$10/mo** | 10 → A$20/mo | 20 → A$40/mo |
| 5,000 | 25 → A$50/mo | 50 → **A$100/mo** | 100 → A$200/mo |
| 10,000 | 50 → A$100/mo | 100 → **A$200/mo** | 200 → A$400/mo |
| 50,000 | 250 → A$500/mo | 500 → **A$1,000/mo** | 1,000 → A$2,000/mo |
| 100,000 | 500 → A$1,000/mo | 1,000 → **A$2,000/mo** | 2,000 → A$4,000/mo |

**Realistic scenario for a typical underwater photographer:** A Sydney-based photographer with 10,000 Instagram followers who promotes Salt Safari once in a story and includes a link in bio. At a realistic **1% conversion rate**, they gain 100 subscribers and earn **A$150–200/month in recurring passive income**. Over 12 months, that totals A$1,800–2,400 — meaningful money for a creative professional, and it requires no ongoing effort once the initial recommendation is made.

For annual subscribers (A$39.99/yr at 30% = A$12 per referral), a photographer with 10,000 followers at 1% conversion earns **A$1,200 per year** in annual commission renewals. In practice, most audiences will split between monthly and annual plans, so blended earnings fall between the two models.

A note on conversion rates: **0.5% is the conservative baseline** for niche hobby content shared via social media. This accounts for the fact that only a fraction of followers see any given post, only some of those click, and only some of those convert. A 2% rate is achievable for highly engaged audiences where the photographer actively demonstrates the app (e.g., using it during a snorkel vlog or dive photography tutorial). The sweet spot for planning purposes is 1%.

## Free trial strategy and launch considerations

**Seven-day free trial** is the clear recommendation, supported by data from both RevenueCat (10,000+ apps analysed) and Adapty (100M+ users tracked). Trials of 5–9 days achieve a **45% median conversion rate**, the highest of any trial length. Shorter trials (1–4 days) drop to 30% because users feel rushed; longer trials (17+ days) show similar conversion rates but with higher cancellation rates downstream.

For Salt Safari specifically, 7 days covers at least one weekend — critical for an outdoor app where users need to physically visit a beach or snorkel site to experience the value. The trial should activate all premium features: "In Season Now" alerts and full species deep dives. This creates **loss aversion** when the trial ends and the user loses access to content they've started exploring.

The recommended approach is a **freemium-plus-trial hybrid**: the free tier (location browsing, species summaries, ID filter tool) remains permanently available, while premium features get a 7-day trial triggered on first interaction. This avoids the aggressive feel of a hard paywall while still demonstrating premium value. Credit card should be required upfront (opt-out model), which typically achieves **~50% trial-to-paid conversion** versus ~25% for opt-in models. Yes, some of those conversions are "forgotten" subscriptions, but the first month's content should quickly validate the purchase for engaged users.

**Australian market nuances worth noting:** Australians hold an average of **5+ active subscriptions** and spend ~A$55/month on subscription services collectively. However, subscription fatigue is real — **46% of streaming users rotate services** to manage costs, and 3 in 10 Australians lose up to A$600/year on forgotten subscriptions. This means Salt Safari must deliver obvious, regular value (the monthly seasonal alerts are perfectly designed for this) and should make cancellation frictionless to build trust. The total addressable market is substantial: approximately **2.3 million Australians** snorkel or dive recreationally, plus **700,000 international tourists** annually — and the casual swimmer/beachgoer segment targeted by Salt Safari is considerably larger still.

All displayed prices must be **GST-inclusive** per Australian Consumer Law. At A$4.99/month, GST accounts for A$0.45, leaving A$4.54 in pre-tax revenue. As a PWA bypassing app stores, Salt Safari avoids the 15–30% platform commission — a significant margin advantage that makes the A$4.99 price point sustainable even with 30–40% affiliate payouts on a subset of subscribers.

## Conclusion

The pricing sweet spot for Salt Safari sits at **A$4.99/month and A$39.99/year** — low enough for impulse buying and easy photographer recommendations, positioned below established nature apps, and aligned with Australian consumer expectations for niche content. The affiliate structure of **30% recurring commission (40% for founding partners)** is deliberately generous for the category, justified by the need to compensate for low absolute dollar amounts with compounding recurring income. At a realistic 1% conversion rate, a photographer with 10,000 followers earns A$150–200/month in passive recurring income — a compelling pitch that turns every underwater photographer, dive instructor, and marine biology content creator into a potential distribution channel.

The strategic insight underpinning this entire model: Salt Safari isn't competing on price against FishBrain (A$125/yr) or Strava (A$125/yr). It's competing for attention against free alternatives like iNaturalist and PADI's app. The pricing must feel trivially cheap while the content must feel irreplaceably valuable — seasonal, local, and story-rich in ways that generic databases cannot match. The affiliate program transforms photographers from users into stakeholders, aligning their financial incentives with the app's growth during the critical early phase when brand awareness is zero and word-of-mouth is everything.