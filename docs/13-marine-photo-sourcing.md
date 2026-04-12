# Salt Safari: sourcing commercially-usable marine species photos

**Wikimedia Commons is your best first move.** Every image on Commons is commercially usable by policy — non-commercial licenses are explicitly rejected from the platform — giving you immediate, API-accessible, zero-cost access to underwater species photography that works on a paid site. Combined with Flickr CC-licensed photos and direct photographer outreach through Australian dive communities, you can realistically source commercially-licensed images for **60–75% of ~100 Australian marine species** at launch, with a clear path to full coverage within months.

The core insight from this research: the problem is not that commercially-usable marine species photos don't exist — it's that they're scattered across platforms that require different search strategies. Your iNaturalist-centric view of the problem dramatically overstates the difficulty. Below is a ranked, actionable plan.

---

## 1. Ranked source strategy: where to invest your time

### Tier 1 — Pursue immediately (highest ROI)

**Wikimedia Commons (Priority #1)**

This is your single most valuable source. Unlike iNaturalist, **Wikimedia Commons does not accept CC BY-NC images at all** — every properly-licensed image is commercially usable under CC BY, CC BY-SA, CC0, or public domain. The MediaWiki API at `commons.wikimedia.org/w/api.php` supports searching by scientific name in the File namespace (`srnamespace=6`), retrieving license metadata via `iiprop=extmetadata`, and bulk pagination. Rate limits are generous: **50,000 requests/hour** unauthenticated, 15/second per IP.

Species coverage tested against your target list:

| Species | Files on Commons | Quality | Usability |
|---------|-----------------|---------|-----------|
| Weedy Seadragon (*Phyllopteryx taeniolatus*) | ~64 | High-res underwater + aquarium shots | ★★★★ |
| Port Jackson Shark (*Heterodontus portusjacksoni*) | ~10–20 | High-res (3737×2492px+) | ★★★ |
| Blue-ringed Octopus (*Hapalochlaena* spp.) | ~10–20 across genus | Variable | ★★★ |
| Wobbegong (*Orectolobus maculatus*) | ~5–10 | Limited selection | ★★ |
| Eastern Blue Groper (*Achoerodus viridis*) | ~2–5 | Sparse | ★ |

Your build workflow: query by scientific name → filter to `LicenseShortName` containing "CC BY" or "CC0" or "Public domain" → rank by resolution → manually curate for quality. The `incategory:Quality_images` search modifier surfaces Wikimedia's community-vetted best photos. Download and self-host rather than hotlinking (Wikimedia discourages direct embedding).

**Flickr Creative Commons (Priority #2)**

Flickr remains the world's largest CC-licensed photo collection. The API is fully operational but now **requires a Flickr Pro account** (~A$10/month) plus a commercial API key application. For your paid site, you must apply for a commercial key — describe your application honestly.

Commercially usable license IDs for the `flickr.photos.search` endpoint: **`license=4,5,6,7,8,9,10,11,12,13`**. As of June 2025, Flickr added CC 4.0 licenses (IDs 11–16), and all new uploads use 4.0 by default. The safest subset (no ShareAlike or NoDerivatives restrictions) is `license=4,9,10,11` — CC BY 2.0, CC0, Public Domain Mark, and CC BY 4.0.

Three powerful search features for your use case:

- **Machine tags**: `taxonomy:binomial="Phyllopteryx taeniolatus"` returns precisely tagged species photos (used by Encyclopedia of Life contributors)
- **Geographic bounding box**: `bbox=110,-45,155,-10` restricts to Australian waters
- **CC photos are exempt** from Flickr's May 2025 download restrictions — original sizes remain fully downloadable

Critical legal protection: **CC licenses are irrevocable** (explicitly stated in CC 4.0 §2(a)(1)), and Flickr now displays license history (since October 2022). Record the license at time of download as your audit trail. Rate limit is **3,600 queries/hour**.

**Direct photographer outreach (Priority #3)**

This is your highest-quality, most targeted source — and the only reliable path to 100% species coverage long-term. The Australian underwater photography community is accessible and generally receptive to credit-for-use arrangements.

Start here:

- **Underwater Australasia** (underwater.com.au) — Australia's largest dive portal with extensive user-submitted galleries organized by location, monthly photo competitions (Novice and Open categories), and direct access to hundreds of Australian underwater photographers
- **Western Australia Underwater Photographic Society (WAUPS)** — waups.org.au, established 1984, regular competitions and photo dives
- **The Underwater Club** (theunderwaterclub.com) — online community founded by Sydney-based Nicolas Remy, members in 18 countries
- **Facebook groups**: "Buy & Sell Underwater Photography Australia", "Marine Pixels – Underwater Photography", "Viz – Sydney Diving Visibility Reports"
- **Competition entrants**: Underwater Awards Australasia (underwatercompetition.com, AU$70K+ prizes, categories include Sydney and Australian waters), Northern Beaches Council Underwater Photography Competition (225+ entries in 2024)

Amateur and semi-professional photographers will typically accept a **non-exclusive, royalty-free license in exchange for prominent credit + link to their portfolio**. Frame your outreach around conservation value and audience relevance — these photographers care deeply about marine life and want their work seen by divers.

### Tier 2 — Pursue after Tier 1 is underway

**CSIRO Science Image** — csiro.au/en/news/all/news/2023/july/scienceimage-online

CSIRO released its entire **12,000+ image and video archive under CC BY**, explicitly permitting commercial use with the attribution "© Copyright CSIRO Australia." The collection spans 60+ years of research including marine science. Coverage is broad rather than deep for specific marine species, but any hits are immediately usable. The Marine Invertebrates Image Collection exists as a separate dataset on OBIS. No robust public API — manual search and download, or explore CSIRO's Data Access Portal (research.csiro.au/dap/).

**GBRMPA Image Library** — gbrmpa.imagelibrary.me

The Great Barrier Reef Marine Park Authority maintains an organized image library covering fish, sharks, rays, molluscs, corals, and more. Free registration required. GBRMPA's own material is **CC BY 4.0**, but the library also contains third-party photographer images that retain separate copyright. Register, read the Terms and Conditions carefully, and verify each image's ownership before use. Excellent for GBR species specifically.

### Tier 3 — Low priority or not viable

**GBIF and Atlas of Living Australia** are biodiversity data infrastructures, not photo libraries. The critical finding: when you exclude iNaturalist from ALA (`fq=-data_resource_uid:"dr1411"`), the remaining **~2.38 million images** are overwhelmingly preserved museum specimens — dead things in jars, not vibrant underwater photography. GBIF caps proxy images at 1200×1200px. One exception worth checking: **Reef Life Survey** data on ALA consists of standardized underwater survey photos that may include CC BY-licensed fish imagery, though quality is utilitarian rather than editorial.

**Unsplash, Pexels, and Pixabay** are not viable for species-specific content. All three allow commercial use (Unsplash License, Pexels License, Pixabay Content License), but they contain essentially zero photos of weedy seadragons, eastern blue gropers, wobbegong sharks, or most niche Australian marine species. Useful only for generic ocean/reef ambiance shots for location hero images.

**Australian Museum and Museums Victoria** charge commercial licensing fees determined case-by-case. Not suitable for a zero-budget launch. The museum specimen photos are also largely unsuitable for a consumer diving site.

**AI-generated illustrations** are not viable as primary species imagery. Current models (DALL-E 3, Midjourney v6) cannot reliably distinguish between closely related species — a critical failing for species identification. A bioRxiv study confirmed AI "recognizes the reference to oak, but not the specific morphology of the variety," and this limitation applies equally to marine species. Additionally, AI-generated images **cannot be copyrighted** (U.S. Copyright Office, January 2025; Supreme Court declined Thaler appeal March 2026), meaning competitors could freely copy your illustrations. Divers expect photographs, not illustrations. Use AI only as clearly-labeled temporary placeholders if absolutely necessary.

---

## 2. Realistic coverage estimate for ~100 Australian marine species

Combining Wikimedia Commons + Flickr CC + CSIRO + GBRMPA, here is a realistic breakdown:

**60–75% immediate coverage** (within first 2–4 weeks of active searching):

- **Well-covered species** (~40–50 species): Iconic, commonly photographed species like weedy seadragons, Port Jackson sharks, blue-ringed octopus, great white sharks, clownfish, giant cuttlefish, sea turtles (all species), manta rays, whale sharks, humpback whales, reef sharks, lionfish, moray eels, wobbegong (at least some photos), nudibranchs (popular genera), seahorses, and common reef fish. These appear frequently on Wikimedia Commons and Flickr.

- **Moderately covered** (~15–25 species): Less photogenic but still photographed species like various wrasse, trevally, flathead, grouper/cod species, sea stars, urchins, and common invertebrates. Expect 2–5 usable commercially-licensed photos per species across all sources combined.

**Hardest species to find** (likely requiring photographer outreach):

- **Eastern Blue Groper** (*Achoerodus viridis*) — only 2–5 images on Wikimedia Commons, surprisingly underphotographed under open licenses despite being NSW's state fish
- **Specific wrasse and damselfish species** — common underwater but rarely tagged with scientific names under commercial CC licenses
- **Endemic temperate species** — Southern Australia's unique marine fauna (e.g., handfish, specific temperate reef species) is far less photographed than tropical GBR species
- **Small cryptic species** — pipefish, gobies, blennies, and other macro subjects require specialist photography and are underrepresented in open-license collections
- **Specific invertebrates** — particular sea cucumber, sea star, and crab species beyond the most iconic ones

**Path to 90–100% coverage** (3–6 months): Photographer outreach fills the gaps. Target photographers who dive the specific locations your site covers — they likely have exactly the species photos you need in their personal archives.

---

## 3. Fallback strategy for missing species

When no commercially-usable photo exists for a species, use this waterfall:

**Option A: Aquarium/captive photos from Wikimedia Commons.** Many Australian marine species have high-quality aquarium photos on Commons under CC BY-SA. These aren't ideal for a diving site, but they're accurate and commercially usable. Label as "Photographed at [Aquarium Name]" for transparency.

**Option B: Closely related species photo as a temporary stand-in.** For species within the same genus where visual differences are minimal (e.g., using *Orectolobus ornatus* if you can't find *O. maculatus*), display with a note: "Shown: [related species]. Appearance is similar." This is what many field guide apps do.

**Option C: Scientific illustration.** Commission a freelance scientific illustrator (Fiverr/Upwork, A$20–50 per species) or use AI-generated illustrations with extensive human review and editing. Label clearly as "Illustration" and replace with photographs when available. Note: hand-drawn scientific illustrations carry more credibility than AI-generated ones and are copyrightable.

**Option D: Silhouette + description.** A stylized species silhouette (easily generated or sourced from public domain resources like PhyloPic at phylopic.org, which provides CC0 organism silhouettes) paired with a detailed text description. Many nature apps launch this way. This approach is honest and sets clear expectations.

**What other sites do:** iNaturalist uses community photos. FishBase uses a mix of photos and line drawings. Reef Life Survey uses standardized survey photos. The Australian Museum uses a combination of specimen photos, field photos, and commissioned illustrations. Most successful nature apps launch with incomplete photo coverage and fill gaps over time through community contribution.

---

## 4. Unified attribution implementation

### Standard attribution format across all sources

Build a single `photo_credits` database table:

```
photo_id | source | author | author_url | license | license_url | 
source_url | title | date_accessed | modifications
```

### Display format by license type

**For CC BY and CC BY-SA (Wikimedia, Flickr, CSIRO, GBRMPA):**
> 📷 "Weedy Seadragon at Kurnell" by Jane Smith · [CC BY 4.0](url) · via [Wikimedia Commons](url)

**For CC0 / Public Domain:**
> 📷 Photo by Jane Smith · Public Domain · via Wikimedia Commons

**For photographer partnerships (custom license):**
> 📷 Jane Smith · [janesmith.com](url) · Used with permission

**For Unsplash/Pexels (if used for location ambiance):**
> 📷 Photo by Jane Smith on Unsplash

### UI display recommendations

- **Primary approach**: Small attribution line directly below each hero image, using 12–13px muted text. This is the most legally robust approach and matches user expectations from Wikipedia/Flickr.
- **Secondary approach**: Clickable info icon (ⓘ) on the image that expands to show full attribution. Saves space but must be easily discoverable.
- **Credits page**: Maintain a `/credits` page listing all photos with full TASL attribution. Link from footer. This serves as your legal compliance backup.
- **Never**: Hide attribution behind multiple clicks, bury it in terms of service, or omit it entirely. CC licenses require "reasonable" attribution — under the image or one click away is standard practice.
- **Store license snapshots**: For every image used, save a screenshot or JSON dump of the license metadata at the time of download. Store the date accessed. This is your evidence of good-faith reliance if a license dispute ever arises.

---

## 5. Photo quality selection checklist

When multiple commercially-licensed photos exist for a species, rank candidates using these criteria in priority order:

**Must-haves (eliminate if not met):**

1. **Species identifiability** — The animal's key identifying features must be clearly visible. For the target audience (snorkelers and divers), the photo should match what a person would actually see underwater. Reject photos where the species could be confused with a similar one.
2. **Minimum resolution** — At least **1200px on the longest edge** for web hero images; **1920px+** preferred for responsive display on modern screens. Reject anything under 800px.
3. **Correct species** — Verify the identification independently. Wikimedia and Flickr photos are sometimes mislabeled. Cross-reference against FishBase, Reef Life Survey, or Australian Museum species pages.

**Ranking criteria (score 1–5 for each):**

4. **Natural habitat setting** — In-situ underwater photos strongly preferred over aquarium shots. Wild > captive > preserved specimen. A weedy seadragon against kelp is worth 10× more than one against aquarium glass.
5. **Lighting and color accuracy** — Well-lit with natural or strobe lighting that shows true colors. Reject green/murky shots, extreme blue casts, or blown-out flash. Good white balance matters for species ID.
6. **Composition and orientation** — Lateral (side-on) view preferred for fish as the primary identification angle. For species pages, a clean profile shot beats an artistic angle. For hero images, more dynamic compositions work.
7. **Background cleanliness** — Uncluttered backgrounds that don't distract from the subject. Dark water or natural reef backgrounds preferred over busy coral clutter.
8. **Focus and sharpness** — The animal's eye and key features must be tack-sharp. Reject motion blur or missed focus.
9. **License simplicity** — CC BY or CC0 preferred over CC BY-SA (avoids ShareAlike complexity) or CC BY-ND (avoids derivative restrictions if you need to crop).
10. **Behavioral context** — Photos showing the animal doing something characteristic (feeding, swimming, resting in typical habitat) add editorial value over static portraits.

---

## 6. Legal risk assessment by source

| Source | Risk Level | Primary Risk | Mitigation |
|--------|-----------|--------------|------------|
| **Wikimedia Commons** | **Low** | Incorrectly licensed uploads (uploader didn't own copyright). Wikimedia disclaims warranty. | Prefer "Source: Own work" uploads. Look for VRT verification tags. Avoid Flickr-sourced uploads unless VRT-verified. Save license metadata at download. |
| **Flickr CC** | **Low–Medium** | "Flickr washing" (users upload others' photos under CC). License changes (though CC is legally irrevocable). Platform risk (API restrictions tightening). | Record license + date at download. Flickr shows license history since Oct 2022. Verify uploader's photostream looks authentic. Don't rely solely on Flickr — diversify sources. |
| **CSIRO Science Image** | **Very Low** | Institutional source with clear CC BY policy. Minimal risk. | Follow attribution requirement: "© Copyright CSIRO Australia." Keep records. |
| **GBRMPA Image Library** | **Low–Medium** | Third-party photographer images mixed with GBRMPA-owned material. Must distinguish between the two. | Check each image's ownership in the library metadata. Only use images clearly marked as GBRMPA/Commonwealth of Australia. Contact GBRMPA for clarification on specific images. |
| **Unsplash/Pexels/Pixabay** | **Low** | License terms technically allow platform to change terms (Unsplash is owned by Getty Images). No model/property releases guaranteed. | Low risk for marine species photos (no people). Save license terms at time of use. Minimal exposure since these will be used for generic shots only. |
| **Photographer partnerships** | **Very Low** (with agreement) | Photographer disputes terms later. No written agreement. | Always get written permission (email exchange is legally sufficient in Australia, signed PDF is better). Use the simple license agreement structure: non-exclusive, royalty-free, for credit + link, with 30-day termination clause. |
| **AI-generated images** | **Medium–High** | No copyright protection (competitors can copy). Potential IP claims from training data. Scientifically inaccurate. Reputational risk with dive community. | Avoid as primary species imagery. If used as placeholders, label clearly as "AI illustration" and replace ASAP. |

### Overarching legal protection measures

**Record everything.** For every image used on the site, maintain a database record containing: source URL, license name and version, license URL, author/creator name, date accessed, and a screenshot or archived copy of the license page. This creates a defensible good-faith reliance record.

**Add a DMCA/takedown process.** Include a simple takedown request page on your site. If a photographer disputes a license, respond promptly and remove the image. Good-faith compliance dramatically reduces legal exposure.

**Consider the Creative Commons FAQ position**: "Anyone who has received a copy of material under a CC license can rely on and use the license, even if the licensor later revokes or stops distributing." This is your legal foundation for using CC-licensed images.

---

## Implementation roadmap: first 30 days

**Week 1**: Build the photo pipeline infrastructure. Create the `photo_credits` database table. Write a Python script using the MediaWiki API to search Wikimedia Commons by scientific name, retrieve license metadata, filter for CC BY/CC0, and rank by resolution. Run this against your full species list. Estimated yield: **40–60 species with at least one usable photo**.

**Week 2**: Apply for a Flickr Pro account and commercial API key. While waiting for approval, manually search Flickr CC for your highest-priority species, especially those missing from Wikimedia. Register for the GBRMPA Image Library. Search CSIRO Science Image. Estimated additional yield: **10–20 additional species**.

**Week 3**: Begin photographer outreach. Join Underwater Australasia, relevant Facebook groups, and post a clear, honest request. Start with the species you're missing — share your specific needs list. Contact 2–3 photographers whose work you've found on Flickr or competition galleries. Estimated yield: **5–15 species** from early responses.

**Week 4**: For remaining gaps, implement fallback strategy (aquarium photos, related species stand-ins, or silhouettes from PhyloPic). Launch with honest "photo wanted" markers for any species still missing — this can also serve as a community engagement tool, inviting divers to contribute.

**Target at launch**: Commercially-licensed photos for **70–85 of ~100 species**, with a clear contributor pipeline to reach 95%+ within 3 months. The hardest 5–10 species (endemic temperate fauna, specific small invertebrates) will require targeted photographer relationships — but these are exactly the species where a dedicated outreach request to the right dive community will get enthusiastic responses.