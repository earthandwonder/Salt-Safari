# Research Brief: One-Off Pricing & Affiliate Commission Rates

## What I need
Research and recommend the optimal one-off purchase price and photographer affiliate commission structure for Salt Safari. We've moved away from subscriptions — this is a single payment that unlocks premium features forever.

## About Salt Safari
A website (launching as a PWA) where everyday swimmers, snorkellers and divers discover what marine species appear at each dive/snorkel location in Australia — without needing to know what iNaturalist is.

**Target audience:** Casual snorkellers and swimmers, not just certified divers. Think families, tourists, weekend beachgoers who want to know "what can I see here?" Australian market first (Sydney, Central Coast), expanding nationally then internationally.

**Free tier includes:**
- Location pages with species lists and summaries (fully indexable for SEO)
- Dive/sighting log with species checklist (track which species you've seen per location, "12 of 47 at Cabbage Tree Bay")
- Shareable trip reports (social cards for Instagram/group chats)
- "In Season Now" alerts — opt-in notifications when specific charismatic species come into season at locations you care about

**One-off purchase unlocks:**
1. **Species ID tool** — a Merlin Bird ID-style stepped wizard that narrows down what you saw based on location, time, size, colour, and habitat. Pure database filtering, works offline, instant results. This solves a real friction: scrolling through 50+ species on a location page to find what you just saw.
2. **Species deep dives** — extended stories behind each species: behaviour, fun facts, ID tips, cultural/Indigenous significance, conservation status. Free users see a 1-2 sentence summary; purchasers get the full story. The curiosity gap drives conversion.

**Why we moved away from subscriptions:**
- Subscription fatigue — casual snorkellers go in the water a few times a year, they don't want another monthly charge
- The value proposition is better as "pay once, use forever" for an audience that uses the tool sporadically
- Simpler to build, no churn management, no failed payment emails
- Simpler affiliate attribution — one conversion event per user

## Pricing research needed

### Questions to answer
1. **What do comparable one-off purchase apps/tools charge?** Look at:
   - Marine/nature ID apps with one-off purchases (Reef Life Pro sells species packs — what do they charge?)
   - Outdoor apps that offer lifetime purchases alongside subscriptions (AllTrails, PeakVisor, Gaia GPS — what's their lifetime/one-off price?)
   - Field guide apps sold as one-off purchases
   - Bird ID, plant ID, fish ID apps with one-off pricing
   - Any "tool" features in freemium apps sold as one-off unlocks (not the full app, just a specific tool)
   - Fishing apps (FishBrain) — do they offer any one-off options?
2. **What's the willingness to pay for a one-off nature/outdoor tool?** Consider:
   - The audience is casual (not hardcore divers spending $$$)
   - Many will be at the beach, phone in hand, wanting an answer NOW (impulse context)
   - The purchase unlocks two things: a tool (ID wizard) and content (deep dives)
   - There's no ongoing cost — "pay once, yours forever" changes the value calculation
3. **Price psychology for one-off purchases vs subscriptions:**
   - What's the impulse-buy ceiling for a mobile tool in Australia? (A$2.99? A$4.99? A$9.99?)
   - How does "pay once" change the acceptable price point compared to monthly?
   - Does bundling a tool + content justify a higher one-off price than either alone?
   - What are the common one-off price tiers in the App Store / Google Play for utility/nature apps?
4. **Australian market considerations:**
   - AUD pricing, local spending habits for one-off app purchases
   - Tourist pricing sensitivity (international visitors at Australian beaches)
   - How does the A$ price compare to what the same audience pays for a coffee, parking at the beach, snorkel hire, etc? (anchoring to the outing)
5. **Should there be a free trial or free uses?**
   - E.g. "first ID free, then pay to unlock" — does this convert better than a hard paywall?
   - Or does giving one free use satisfy the immediate need and kill the conversion?
   - What do comparable apps do?
6. **Price anchoring and framing:**
   - "Less than a coffee" — does this work for one-off as well as it does for monthly?
   - "Less than snorkel hire" — better anchor for the beach context?
   - Should the price be round (A$5) or psychological (A$4.99)?

### Constraints
- Must feel like an impulse buy at the beach — someone just saw something cool and wants to know what it was RIGHT NOW
- Must be high enough that affiliate commission (percentage of one-off) is worth a photographer's time
- We're a new, unknown brand — can't charge like an established platform
- PWA, not in App Store — no 30% platform commission, but also no App Store discovery or "Buy" button UX
- The free tier is already genuinely useful (species lists, dive log, checklist, alerts) — the purchase needs to feel like a clear upgrade, not access to basic functionality

## Affiliate commission research needed

### Questions to answer
1. **What commission rates do one-off purchase affiliate programs offer?** Look at:
   - App affiliate programs that pay on one-off purchases (not recurring)
   - Digital product affiliate programs (ebooks, courses, tools in the A$3-15 range)
   - Outdoor/adventure brand affiliate programs with one-off attribution
   - How do one-off commission rates compare to subscription commission rates? (typically higher % since there's no recurring)
2. **What percentage makes a one-off commission worth promoting?**
   - At A$4.99 purchase price, 30% = A$1.50 per conversion. Is that enough?
   - At A$9.99, 30% = A$3.00 per conversion. Does that change the calculus?
   - What's the minimum per-conversion payout that motivates an influencer?
   - Should the rate be higher than subscription affiliate rates to compensate for no recurring?
3. **Volume vs rate tradeoff:**
   - One-off purchases should convert at a higher rate than subscriptions (lower friction) — model this out
   - If 2-3x more people buy a one-off than would subscribe, does a lower per-conversion commission still produce better total earnings for the photographer?
4. **Photographer earnings modelling:**
   - At various price points (A$2.99, A$4.99, A$7.99, A$9.99) and commission rates (30%, 40%, 50%), what does a photographer with 1K / 5K / 10K / 50K / 100K followers earn?
   - Assume higher conversion rates than subscription model (2-5% vs 0.5-2%) since one-off has lower friction
   - Compare total earnings to the previous subscription model (A$4.99/mo, 30% recurring for 12 months) — at what price point does one-off match or beat subscription earnings for the photographer?
5. **Founding partner incentive:**
   - Should founding partners get a higher commission % or a higher effective rate?
   - Without recurring income, what replaces the "compounding passive income" pitch?
   - Alternative: founding partners get commission on ALL purchases from users who entered via their link (not just first purchase) — relevant if we add more paid features later
6. **Cookie duration for one-off:**
   - Longer or shorter than subscription? Someone might see a photographer's post, bookmark it, and not buy until their next beach trip (could be weeks/months)
   - What cookie durations do one-off digital product affiliates typically use?

## Context from previous research
Our previous subscription pricing research (see pricing-affiliate-strategy.md) found:
- A$4.99/month was the impulse-buy sweet spot for subscriptions
- Marine-specific apps are nearly all free (PADI, SSI, Diveboard, Diviac)
- Seabook charges A$3/week; Reef Life Pro sells individual species packs as one-off purchases
- 30% recurring commission for 12 months was recommended for subscriptions
- At 1% conversion, a photographer with 10K followers would earn A$150/mo recurring
- The impulse-buy ceiling in Australia is roughly under A$5/month for subscriptions
- 2.3 million Australians snorkel/dive recreationally, plus 700K international tourists/year

**Key question:** The subscription model gave photographers recurring income which was a strong pitch. With one-off, we lose that. What combination of price point + commission rate + expected higher conversion rate makes the one-off model equally or more attractive to photographers?

### Deliverable
Recommend a specific one-off price point and a specific affiliate commission structure with reasoning. Include:
1. The recommended price with justification
2. Commission rates (standard + founding partner)
3. Photographer earnings model at different audience sizes, compared to the old subscription model
4. Whether to offer a free trial/free use or go straight to paywall
5. Cookie duration recommendation
6. Framing/anchoring copy suggestions for the purchase CTA
