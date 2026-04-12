# Deep Research Prompt: Photo Sourcing Strategy for Salt Safari

Use this prompt with Claude deep research to find viable ways to get high-quality marine species and dive location photos for a commercial subscription website, given that ~80-90% of iNaturalist photos are CC BY-NC (non-commercial) and unusable.

---

## Prompt

I'm building Salt Safari — a paid subscription website (A$4.99/month) that shows which marine species can be found at snorkelling and diving locations in Australia. I need photos for:

1. **Species hero images** (~100+ species, growing) — high-quality, identifiable photos of each marine species. These are the most important photos on the site.
2. **Location hero images** (~50+ locations, growing) — above-water or underwater shots of each dive/snorkel site.
3. **Species-at-location photos** — photos of specific species taken at specific locations (nice-to-have, not essential for launch).

**The problem:** iNaturalist is my primary data source, but only ~10-20% of iNaturalist photos have commercially-compatible licenses (cc0, cc-by, cc-by-sa). The default is CC BY-NC, which I cannot use on a paid site. I need alternative photo sources or strategies.

**My constraints:**
- Solo developer, bootstrapped — no budget for stock photo subscriptions or commissioned photography at scale
- The site is commercial (paid subscriptions), so I need either: commercially-licensed photos, photos I have explicit permission to use, or photos I take myself
- I need photos for Australian marine species specifically — not generic tropical reef stock photos
- Quality matters — these photos are central to the product. Blurry, poorly-lit photos hurt credibility
- I'll be building photographer partnerships (affiliate program) long-term, but I need photos for launch before those partnerships are established

**Research each of the following approaches thoroughly:**

---

### 1. Wikimedia Commons

URL: https://commons.wikimedia.org

Wikimedia Commons has millions of freely-licensed images. Many wildlife/nature photographers upload here.

- What API or tool can I use to search for marine species photos by scientific name or common name?
- What licenses are available on Wikimedia Commons, and which allow commercial use?
- What is the typical quality and quantity of Australian marine species photos? Search for a few specific species I need: Weedy Seadragon (Phyllopteryx taeniolatus), Eastern Blue Groper (Achoerodus viridis), Port Jackson Shark (Heterodontus portusjacksoni), Wobbegong (Orectolobus maculatus), Blue-ringed Octopus (Hapalochlaena). How many results? What quality?
- What attribution format is required?
- Can I bulk-download images via API? Rate limits?
- Any gotchas with Wikimedia Commons licensing? (e.g., images that claim to be CC but actually aren't, EXIF data requirements, etc.)

### 2. Flickr Creative Commons

URL: https://www.flickr.com/creativecommons

Flickr has a massive library of underwater photography, and many photos are CC-licensed.

- Does the Flickr API still work? What's the current state of API access and keys?
- Can I search by license type (commercial-compatible only) + keyword/tag?
- Is there a way to search by scientific name or species tag?
- What is the quality and quantity of Australian underwater photography on Flickr?
- Can I filter to specific geographic regions (Australia)?
- What are the API rate limits?
- What attribution format is required for each CC license type?
- Any risks? (e.g., users changing licenses after I've downloaded, Flickr API deprecation concerns)

### 3. Unsplash / Pexels / Pixabay (Free Stock)

- Do any of these have a meaningful collection of Australian marine species photos?
- What are the license terms — truly free for commercial use?
- Can I search by species name and get accurate results (not just generic "fish" photos)?
- API access and rate limits?
- Realistically, how useful are these for a niche marine biology product vs. generic stock?

### 4. GBIF / ALA Photo Records

GBIF and the Atlas of Living Australia include photos attached to occurrence records. Some of these come from sources other than iNaturalist (museum collections, scientific surveys, government monitoring).

- Do GBIF or ALA occurrence records include photos?
- What licenses do these photos carry? Are non-iNaturalist records more likely to be commercially usable?
- Can I access photos via their APIs?
- What is the photo quality like for scientific survey records vs. citizen science?
- Is there a way to get photos from ALA/GBIF that are NOT from iNaturalist (to avoid the same CC BY-NC problem)?

### 5. Government and Research Institution Image Libraries

Australian government agencies and research institutions produce marine survey photography. Examples:
- CSIRO marine image collections
- AIMS (Australian Institute of Marine Science) image library
- Australian Museum image collection
- State fisheries departments
- Parks Australia / Great Barrier Reef Marine Park Authority

For each:
- Do they have publicly accessible image libraries?
- What are the licensing terms? Can images be used commercially, and under what conditions?
- Is there API access or only manual download?
- What species/locations are covered?

### 6. AI-Generated Species Illustrations

As a fallback or supplement:
- What is the current state of AI image generation for scientifically accurate marine species illustrations?
- Could I use AI to generate species profile illustrations (not photographs) that are accurate enough for identification?
- What are the legal considerations of using AI-generated images commercially?
- Would illustrated species profiles actually work for this product, or do users expect photographs?

### 7. Direct Photographer Outreach (Pre-Partnership)

Before the formal affiliate program launches:
- What's the best approach to get permission from individual underwater photographers to use specific photos?
- Are there Australian underwater photography communities, forums, or Facebook groups where I could find willing contributors?
- What kind of license/permission agreement should I use? (e.g., royalty-free license for credit + link)
- Are there underwater photography competition galleries where winning photos might be available for licensing?
- What about reaching out to dive shops that have photo galleries from their trips?

---

## Practical Output I Need

Based on all of the above, give me:

1. **A ranked recommendation** of which sources to pursue first, second, third — optimising for: coverage of Australian marine species, commercial license availability, photo quality, and effort to integrate.

2. **A realistic coverage estimate.** If I combine the top 2-3 sources, what percentage of my ~100 species am I likely to find commercially-usable photos for? Which species will be hardest to find?

3. **A fallback strategy** for species where no commercially-usable photo exists. What do other nature/wildlife sites do? (placeholder illustration? silhouette? AI-generated? text-only?)

4. **Attribution implementation.** A unified attribution format that works across all sources (Wikimedia, Flickr, iNaturalist CC-compatible, photographer partnerships). How should I display this in the UI?

5. **A photo quality checklist.** What criteria should I use to select the best photo when multiple options exist? (resolution, lighting, species identifiability, background, orientation)

6. **Legal risk assessment.** For each source, what's the risk that a photo I use turns out to have incorrect licensing? How do I protect myself?

**Output format:** Structured as a decision document with clear recommendations, not just a list of options. I need to act on this immediately — tell me what to do first.
