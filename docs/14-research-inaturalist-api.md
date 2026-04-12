# Deep Research Prompt: iNaturalist API for Salt Safari

Use this prompt with Claude deep research to get a comprehensive technical spec for integrating iNaturalist data.

---

## Prompt

Research the iNaturalist API v1 (https://api.inaturalist.org/v1/) thoroughly and produce a technical integration spec for the following use case:

**Context:** I'm building a website called Salt Safari that shows which marine species can be found at specific snorkelling and diving locations in Australia. I need to pull species observation data from iNaturalist to bootstrap my database. This is NOT a real-time integration — it's a batch data pipeline that runs periodically (weekly or monthly) to update species lists and seasonality data per location.

**I need you to research and answer ALL of the following:**

### 1. Observations API — exact endpoint and parameters
- What is the correct endpoint for querying observations by geographic coordinates?
- What parameters do I use for: lat/lng center point + radius (in km), taxon filtering (I want Animalia only, marine species), quality grade (research-grade only), date range filtering, and pagination?
- What radius should I use for a typical dive/snorkel site? (these are small areas, ~500m-2km)
- What does the response object look like? Show me a real example response with the fields I care about: species/taxon info, observation count, observer name, photo URLs, photo licenses, observation date.
- How does pagination work? What's the max per_page? How do I get all results?

### 2. Species counts endpoint
- Is there an endpoint that gives me aggregated species counts per area (rather than individual observations)? Something like "these species have been observed within 1km of this point, with X observations each"?
- If so, what's the exact endpoint and parameters?
- How does this differ from the observations endpoint for my use case?

### 3. Seasonality data
- Can I query observations grouped by month for a given location + taxon? What endpoint/parameters?
- Or do I need to pull all observations and aggregate monthly counts myself?
- What's the best approach to build a "commonly spotted in [months]" feature from iNaturalist data?
- How do I handle the bias problem (more observations in summer because more people dive, not because more species are present)?

### 4. Photo data and licensing
- What photo fields come back in the API response?
- How do I determine the license for each photo? What are the possible license values?
- Which licenses allow commercial use (I'm a paid subscription site)?
- What attribution format does iNaturalist require?
- Can I hotlink their photo URLs or do I need to download and host them?
- What photo sizes/resolutions are available via the API?

### 5. Rate limits and bulk data
- What are the exact rate limits for authenticated vs unauthenticated requests?
- How do I register an application for higher rate limits?
- For initial bootstrapping (~50 locations × potentially thousands of observations each), should I use the API or the bulk data export (https://www.inaturalist.org/pages/developers)?
- If bulk export, where do I download it, what format is it, and how do I filter to just Australian marine observations?
- What are the terms of service for using iNaturalist data in a commercial product?

### 6. Taxon filtering
- How do I filter to marine species only? Is there a taxon ID for "marine" or do I need to use specific taxon IDs (e.g., Actinopterygii for fish, Mollusca for nudibranchs, etc.)?
- What are the taxon IDs for the major groups I care about: fish, sharks/rays, cephalopods (octopus, cuttlefish, squid), nudibranchs, crustaceans, marine mammals, sea turtles, seahorses/pipefish/seadragons?
- Can I use a parent taxon to get all marine animals in one query, or do I need multiple queries per taxon group?

### 7. Recommended data pipeline architecture
Based on everything above, recommend a specific pipeline:
- Script or cron job structure
- Which endpoints to call, in what order, with what parameters
- How to handle pagination and rate limits
- How to map iNaturalist data to my schema (I have: location_species join table with observation_count, species_seasonality table with month + likelihood)
- How to determine "common", "occasional", "rare" likelihood from observation counts
- How often to re-run the pipeline
- Error handling and idempotency

### 8. Code examples
Provide working TypeScript/Node.js code examples for:
- Querying observations within a radius of a lat/lng point
- Getting species counts for a location
- Extracting seasonality (monthly observation counts) for a species at a location
- Checking photo licenses and building attribution strings

**Output format:** Structure your response as a technical spec document I can hand directly to a developer. Include exact URLs, parameter names, example responses, and code. Flag any gotchas or things that surprised you.
