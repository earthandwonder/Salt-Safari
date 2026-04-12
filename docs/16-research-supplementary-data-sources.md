# Deep Research Prompt: Supplementary Marine Data Sources for Salt Safari

Use this prompt with Claude deep research to get integration specs for data sources that complement iNaturalist, particularly for offshore and remote dive sites.

---

## Prompt

Research the following marine biodiversity data APIs and produce a technical integration spec for each. The goal is to supplement iNaturalist data for an Australian dive/snorkel site species guide. iNaturalist covers popular shore dives well but has significant gaps for boat dives, offshore reefs, and remote sites due to observer access bias.

**Context:** I'm building Salt Safari — a website showing which marine species can be found at specific snorkelling and diving locations in Australia. I already have an iNaturalist pipeline that queries species by lat/lng radius. I need supplementary sources that cover:
- Offshore boat dive sites (10–50 km from shore)
- Remote reefs (outer Great Barrier Reef, Coral Sea, Ningaloo, Rowley Shoals)
- Species that are "known to occur in this region" even without a specific site-level observation
- Higher confidence data from scientific surveys rather than citizen science alone

**For EACH source below, research and answer ALL of the following:**

1. What is the API base URL and authentication method?
2. Can I query by geographic coordinates + radius (like iNaturalist)? What parameters?
3. What does the response look like? Show example responses with the fields I care about: species/taxon info, location, date, data source/provider.
4. How do I filter to marine species only? Is there a habitat filter?
5. What is the data coverage like for Australian waters specifically? How many records? Are offshore/remote sites covered?
6. Rate limits and terms of service — can I use this data commercially?
7. What attribution is required?
8. How does the data format map to my existing schema (species table with common_name, scientific_name; location_species table with observation_count, likelihood)?
9. Pagination — how do I get all results?
10. Any gotchas, surprises, or things that differ from iNaturalist?

---

### Source 1: Atlas of Living Australia (ALA)

URL: https://api.ala.org.au

ALA aggregates Australian biodiversity data from 900+ data providers including CSIRO marine surveys, state government monitoring programs, museum collections, and citizen science (including iNaturalist's Australian data). It should have significantly better offshore coverage than iNaturalist alone.

**Specific questions:**
- Which ALA API endpoint is best for "species at this location"? The occurrence search? The species search?
- Does ALA have a spatial search (lat/lng + radius)?
- ALA ingests iNaturalist data — how do I avoid double-counting species that appear in both my iNaturalist pipeline and ALA results?
- Does ALA have data quality filters equivalent to iNaturalist's "research grade"?
- What data providers within ALA are most valuable for marine/offshore data? (e.g., AIMS, CSIRO, state fisheries)
- Does ALA provide seasonality data or observation timestamps I can aggregate by month?
- What license does ALA data carry? Can I use it commercially?

### Source 2: OBIS (Ocean Biodiversity Information System)

URL: https://api.obis.org

OBIS is specifically marine and includes scientific survey data, trawl records, and research expeditions — exactly the kind of data missing from iNaturalist for offshore sites.

**Specific questions:**
- Which OBIS endpoint gives me species lists for a geographic area?
- Does OBIS support point + radius queries or only bounding boxes?
- What is OBIS's coverage of Australian waters? Does it include GBR scientific monitoring data?
- OBIS records come from many datasets — how do I assess data quality/reliability?
- Does OBIS have seasonality data?
- Can I get observation counts per species per area (like iNaturalist's species_counts endpoint)?
- What's the overlap between OBIS and ALA for Australian marine data?

### Source 3: FishBase / SeaLifeBase

URLs: https://fishbase.org, https://www.sealifebase.org

These are species reference databases rather than observation databases. They provide species range/distribution data, habitat information, and biological details.

**Specific questions:**
- Is there a working REST API? (I've heard the rfishbase R package exists, and there's a legacy API — what's the current state?)
- Can I query "which species are known to occur in a geographic area"?
- What biological data fields are available that I could use for my species enrichment? (size, habitat, depth range, behaviour, conservation status, common names)
- Would this be useful as a "species range" layer — confirming that a species *could* be at a location even if nobody has photographed it there?
- What license/terms govern FishBase data?

### Source 4: GBIF (Global Biodiversity Information Facility)

URL: https://api.gbif.org

GBIF aggregates data from iNaturalist, ALA, OBIS, museum collections, and many other sources. It may be the single most comprehensive source.

**Specific questions:**
- Can I query GBIF occurrence records by lat/lng + radius, filtered to marine taxa in Australia?
- What is the GBIF dataset ID for iNaturalist records, so I can exclude them (since I already have a separate iNaturalist pipeline)?
- How do I filter to only non-iNaturalist records in GBIF to avoid duplication?
- Does GBIF provide species counts per area (aggregated), or only individual occurrence records?
- What's the best way to use GBIF for initial bootstrapping vs. ongoing updates?
- GBIF has a download API for bulk data — is this better than paginating through the occurrence API for my scale (~50-200 locations)?

---

## Multi-Source Pipeline Architecture

Based on all the above, recommend:

1. **A unified multi-source pipeline** that queries iNaturalist, ALA, OBIS, and optionally GBIF/FishBase for each location, deduplicates species across sources, and stores results with source attribution.

2. **A source priority/confidence model.** If iNaturalist says a species has been observed 50 times at a shore dive, and ALA has 3 scientific survey records confirming it, how should I weight these? If OBIS shows a species in a broad region but nobody has specifically seen it at my dive site, what confidence level should that get?

3. **A practical recommendation on which sources to implement first** for the most coverage gain with the least integration effort. I'm a solo dev — I can't integrate everything at once.

4. **Deduplication strategy.** Multiple sources will report the same species. How do I match species across sources? By scientific name? By a shared taxonomy ID? What's the most reliable key?

5. **Data freshness strategy.** How often should I re-query each source? Which sources update frequently vs. annually?

**Output format:** Structure your response as a technical spec I can hand to a developer. Include exact API URLs, parameter names, example responses, and working code examples (TypeScript/Node.js) where possible. For each source, give me a clear "is this worth integrating?" verdict based on coverage, API quality, and effort.
