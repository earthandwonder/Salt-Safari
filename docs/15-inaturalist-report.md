# iNaturalist API v1 integration spec for Salt Safari

**The iNaturalist API v1 provides three key endpoints that together can bootstrap a marine species database for Australian dive sites: `/observations/species_counts` for species lists, `/observations/histogram` for seasonality, and `/observations` for detailed records including photos.** This spec covers every endpoint, parameter, response field, rate limit, licensing constraint, and architectural decision needed to build a batch data pipeline. The most critical finding for a commercial product: the default license on most iNaturalist content is CC BY-NC (non-commercial), so photos and observation data must be filtered by license to avoid copyright violations. There is no native "marine" filter — you must use a curated list of taxon IDs.

---

## 1. Observations endpoint — the core data source

### Endpoint

```
GET https://api.inaturalist.org/v1/observations
```

### Geographic filtering by coordinates + radius

| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | float | Latitude in decimal degrees. Must combine with `lng` and `radius` |
| `lng` | float | Longitude in decimal degrees |
| `radius` | float | Search radius in **kilometers** |

**Recommended radius for a dive/snorkel site: 1–2 km.** Most dive sites cluster within a few hundred meters, but iNaturalist coordinate accuracy varies (GPS error, boat drift, observers logging from shore). A 1 km radius captures the site precisely; 2 km adds a safety margin. For sites near shore, use 1 km to avoid pulling in terrestrial observations. For offshore reef systems (e.g., the outer Great Barrier Reef), 2–5 km is appropriate since positioning is less precise.

### Complete parameter reference for the pipeline

```
GET /v1/observations?
  lat=-33.856          # dive site latitude
  &lng=151.215         # dive site longitude
  &radius=1.5          # km radius
  &taxon_id=47178      # Actinopterygii (or comma-separated list)
  &quality_grade=research  # research-grade only
  &photos=true         # must have photos
  &geo=true            # must be georeferenced
  &d1=2015-01-01       # observed on or after (YYYY-MM-DD)
  &d2=2026-04-10       # observed on or before
  &per_page=200        # max allowed
  &order_by=id         # required for cursor pagination
  &order=asc           # required for cursor pagination
  &locale=en           # English common names
  &preferred_place_id=6744  # Australia (for regional common names)
```

**Key filtering parameters:**

| Parameter | Values / Notes |
|-----------|---------------|
| `quality_grade` | `research` (2+ agreeing IDs), `needs_id`, `casual` |
| `taxon_id` | Single integer — includes all descendant taxa automatically |
| `taxon_ids` | Comma-separated list for multiple taxa in one query |
| `without_taxon_id` | Exclude taxa and descendants (useful for removing freshwater groups) |
| `iconic_taxa` | Broad filter: `Actinopterygii`, `Mollusca`, `Mammalia`, `Reptilia`, `Animalia` (see caveat below) |
| `photos` | `true` — only observations with photos |
| `photo_license` | Filter by license: `cc0,cc-by,cc-by-sa` for commercial use |
| `license` | Filter observation metadata license |
| `month` | Comma-separated month numbers: `1,2,3` for Jan–Mar |
| `place_id` | iNaturalist place ID (Australia = **6744**) |
| `geoprivacy` | `open` — exclude obscured/private coordinates |

**`iconic_taxa` caveat:** The value `Animalia` does *not* return all animals. It returns only animals that don't belong to any of the other iconic taxa (Mollusca, Reptilia, Aves, Amphibia, Actinopterygii, Mammalia, Insecta, Arachnida). This effectively means "other invertebrates" — cnidarians, echinoderms, sponges, crustaceans, etc. Use `taxon_id` instead for precise filtering.

### Response object structure

```json
{
  "total_results": 847,
  "page": 1,
  "per_page": 200,
  "results": [
    {
      "id": 198765432,
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "quality_grade": "research",
      "species_guess": "Eastern Blue Groper",
      "license_code": "cc-by-nc",
      "uri": "https://www.inaturalist.org/observations/198765432",

      "location": "-33.856,151.215",
      "place_guess": "Gordons Bay, Sydney, NSW, AU",
      "geojson": {
        "type": "Point",
        "coordinates": [151.215, -33.856]
      },
      "positional_accuracy": 15,
      "geoprivacy": null,
      "taxon_geoprivacy": null,
      "obscured": false,

      "observed_on": "2024-03-15",
      "observed_on_details": {
        "date": "2024-03-15",
        "day": 15,
        "month": 3,
        "year": 2024,
        "hour": 10
      },
      "time_observed_at": "2024-03-15T10:30:00+11:00",

      "taxon": {
        "id": 82639,
        "name": "Achoerodus viridis",
        "rank": "species",
        "rank_level": 10,
        "preferred_common_name": "Eastern Blue Groper",
        "iconic_taxon_name": "Actinopterygii",
        "iconic_taxon_id": 47178,
        "is_active": true,
        "observations_count": 1250,
        "ancestry": "48460/1/2/355675/47178/...",
        "ancestor_ids": [48460, 1, 2, 355675, 47178],
        "wikipedia_url": "https://en.wikipedia.org/wiki/...",
        "default_photo": {
          "id": 12345678,
          "license_code": "cc-by",
          "attribution": "(c) John Smith, some rights reserved (CC BY)",
          "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/12345678/square.jpeg",
          "medium_url": "https://inaturalist-open-data.s3.amazonaws.com/photos/12345678/medium.jpeg",
          "original_dimensions": { "width": 2048, "height": 1536 }
        },
        "threatened": false,
        "endemic": false,
        "native": true,
        "introduced": false,
        "conservation_status": null
      },

      "user": {
        "id": 54321,
        "login": "sydneydiver",
        "name": "Alex Johnson",
        "icon_url": "https://static.inaturalist.org/attachments/users/icons/54321/medium.jpeg"
      },

      "photos": [
        {
          "id": 987654321,
          "license_code": "cc-by",
          "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/987654321/square.jpeg",
          "attribution": "(c) Alex Johnson, some rights reserved (CC BY)",
          "original_dimensions": { "width": 4032, "height": 3024 }
        }
      ],

      "observation_photos": [
        {
          "id": 111222333,
          "position": 0,
          "photo": {
            "id": 987654321,
            "license_code": "cc-by",
            "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/987654321/square.jpeg",
            "attribution": "(c) Alex Johnson, some rights reserved (CC BY)"
          }
        }
      ],

      "place_ids": [6744, 97394],
      "captive": false,
      "num_identification_agreements": 3,
      "num_identification_disagreements": 0
    }
  ]
}
```

### Pagination

**Standard pagination** uses `page` and `per_page`. The **maximum `per_page` is 200** for the observations endpoint. The hard limit is that **`page × per_page` cannot exceed 10,000**. Requesting beyond this returns an error.

**Cursor-based pagination** using `id_above` is the only way to get more than 10,000 results. This is the officially recommended method:

```
# First request
GET /v1/observations?order_by=id&order=asc&per_page=200&[filters]

# Get last observation ID from results, e.g. 198765500
# Next request
GET /v1/observations?order_by=id&order=asc&per_page=200&id_above=198765500&[filters]

# Repeat until results array is empty
```

You **must** set `order_by=id` and `order=asc` when using `id_above`. Do not use the `page` parameter simultaneously.

---

## 2. Species counts endpoint — the primary workhorse

### Endpoint

```
GET https://api.inaturalist.org/v1/observations/species_counts
```

This is **the most important endpoint for Salt Safari**. Instead of returning individual observations, it returns a deduplicated list of species with observation counts — exactly what you need for a "species at this dive site" feature.

### Parameters

Accepts **all the same parameters** as the observations endpoint (lat/lng/radius, taxon_id, quality_grade, date filters, etc.), plus pagination up to **max 500 results per page** (higher than the 200 limit on `/observations`).

**⚠️ Hard limit: species_counts returns a maximum of 500 species total.** There is no cursor-based pagination for this endpoint. If a location has more than 500 species matching your filters, you must split queries by taxon group.

### Example request

```
GET /v1/observations/species_counts?
  lat=-33.856&lng=151.215&radius=1.5
  &taxon_id=1           # Animalia
  &quality_grade=research
  &per_page=500
  &locale=en
  &preferred_place_id=6744
```

### Response format

```json
{
  "total_results": 127,
  "page": 1,
  "per_page": 500,
  "results": [
    {
      "count": 47,
      "taxon": {
        "id": 82639,
        "name": "Achoerodus viridis",
        "rank": "species",
        "rank_level": 10,
        "preferred_common_name": "Eastern Blue Groper",
        "iconic_taxon_name": "Actinopterygii",
        "iconic_taxon_id": 47178,
        "is_active": true,
        "observations_count": 1250,
        "default_photo": {
          "id": 12345678,
          "license_code": "cc-by",
          "attribution": "(c) John Smith, some rights reserved (CC BY)",
          "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/12345678/square.jpeg",
          "medium_url": "...",
          "square_url": "..."
        },
        "wikipedia_url": "https://en.wikipedia.org/wiki/Eastern_blue_groper",
        "threatened": false,
        "native": true,
        "endemic": true,
        "introduced": false,
        "ancestor_ids": [48460, 1, 2, 355675, 47178]
      }
    }
  ]
}
```

**Key difference from `/observations`:** The `count` field represents the number of matching observations for that species within your query scope — not a global count. The `taxon.observations_count` field is the global total across all of iNaturalist. Use the local `count` for your "how common is this species here" logic.

---

## 3. Seasonality data via the histogram endpoint

### Endpoint

```
GET https://api.inaturalist.org/v1/observations/histogram
```

This endpoint returns observation counts grouped by time interval. Using `interval=month_of_year` gives you exactly the data needed for a "commonly spotted in [months]" feature — **no need to pull all observations and aggregate yourself**.

### Parameters

All observation search parameters plus:

| Parameter | Type | Description |
|-----------|------|-------------|
| `date_field` | string | `observed` (default) or `created` — always use `observed` |
| `interval` | string | `month_of_year`, `week_of_year`, `month`, `week`, `day`, `year` |

### Example: monthly seasonality for fish at a dive site

```
GET /v1/observations/histogram?
  lat=-33.856&lng=151.215&radius=1.5
  &taxon_id=82639        # specific species (Eastern Blue Groper)
  &quality_grade=research
  &date_field=observed
  &interval=month_of_year
```

### Response

```json
{
  "total_results": 12,
  "page": 1,
  "per_page": 12,
  "results": {
    "month_of_year": {
      "1": 12,
      "2": 8,
      "3": 15,
      "4": 6,
      "5": 3,
      "6": 2,
      "7": 1,
      "8": 2,
      "9": 4,
      "10": 7,
      "11": 9,
      "12": 14
    }
  }
}
```

No pagination needed — this is a single aggregated response.

### Handling observer effort bias

More divers in summer means more observations in summer, which doesn't necessarily mean more species. This is a well-documented problem in citizen science data.

**Launch approach: raw counts, no effort normalisation.** Effort normalisation (dividing species counts by total observer activity per month) doubles the API calls, produces noisy results at low observation counts (dividing small numbers by small numbers), and requires arbitrary thresholds. For the charismatic species users care about, the species' own seasonal presence/absence pattern is a much stronger signal than observer effort bias.

**Practical approach for "commonly spotted in [months]":**

```
For each species at each location:
  raw_histogram = GET histogram for this species at this location
  monthly_avg = sum(raw_histogram) / 12

  For each month 1–12:
    if raw_histogram[month] == 0: "rare"
    elif raw_histogram[month] >= monthly_avg: "common"
    else: "occasional"

  Skip months where total site observations < 3 (mark as "no data")

  Display: "Commonly spotted: Jun, Jul, Aug, Sep, Oct, Nov"
```

This is half the API calls (no baseline query needed) and produces the same user-facing result. Effort normalisation can be added later if raw data proves misleading at specific locations — the `species_seasonality` table has `normalized_frequency` and `total_effort_that_month` columns reserved for this.

**Rate limit note:** Forum reports indicate the histogram endpoint may return 429 errors at 60 req/min even though that's the documented recommendation. **Use 30 requests/minute for histogram calls specifically.**

---

## 4. Photo data, licensing, and attribution

### Photo fields in API responses

Each observation includes a `photos` array. Each photo object contains:

```json
{
  "id": 987654321,
  "license_code": "cc-by",
  "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/987654321/square.jpeg",
  "attribution": "(c) Alex Johnson, some rights reserved (CC BY)",
  "original_dimensions": { "width": 4032, "height": 3024 },
  "flags": []
}
```

### Available photo sizes

Replace the size segment in the URL path to get different resolutions:

| Size | Max dimension | URL pattern |
|------|--------------|-------------|
| `square` | 75×75 px (cropped) | `/photos/{id}/square.jpeg` |
| `thumb` | 100 px | `/photos/{id}/thumb.jpeg` |
| `small` | 240 px | `/photos/{id}/small.jpeg` |
| `medium` | 500 px | `/photos/{id}/medium.jpeg` |
| `large` | 1024 px | `/photos/{id}/large.jpeg` |
| `original` | 2048 px | `/photos/{id}/original.jpeg` |

The API returns the `square` URL by default. To construct other sizes:
```
Given:  https://inaturalist-open-data.s3.amazonaws.com/photos/987654/square.jpeg
Large:  https://inaturalist-open-data.s3.amazonaws.com/photos/987654/large.jpeg
```

Two hosting domains exist: `inaturalist-open-data.s3.amazonaws.com` for CC-licensed photos, and `static.inaturalist.org` for all-rights-reserved photos.

### License values and commercial use

| `license_code` value | License | Commercial use? |
|---------------------|---------|----------------|
| `cc0` | CC0 Public Domain Dedication | ✅ Yes |
| `cc-by` | CC Attribution 4.0 | ✅ Yes |
| `cc-by-sa` | CC Attribution-ShareAlike 4.0 | ✅ Yes (derivative works must use same license) |
| `cc-by-nd` | CC Attribution-NoDerivatives 4.0 | ✅ Yes (but no modifications allowed) |
| `cc-by-nc` | CC Attribution-NonCommercial 4.0 | ❌ **No** |
| `cc-by-nc-sa` | CC Attribution-NonCommercial-ShareAlike 4.0 | ❌ **No** |
| `cc-by-nc-nd` | CC Attribution-NonCommercial-NoDerivatives 4.0 | ❌ **No** |
| `null` | All Rights Reserved | ❌ **No** |

**⚠️ Critical for Salt Safari:** The default license for iNaturalist content is **CC BY-NC**, which prohibits commercial use. Since this is a paid subscription site, **you must filter for commercially-compatible licenses**. Use the `photo_license` parameter:

```
&photo_license=cc0,cc-by,cc-by-sa
```

This significantly reduces the available photo pool. Expect roughly **10–20% of photos** to have commercially-compatible licenses. Plan to supplement with your own photography or other licensed sources.

### Required attribution format

iNaturalist generates an `attribution` string in each photo object. Use it as provided:

- **CC-BY / CC-BY-SA / CC-BY-ND:** `"© [Observer Name], some rights reserved (CC BY)"`
- **CC0:** `"[Observer Name], no rights reserved (CC0)"`

You can append `"via iNaturalist"` for clarity. Example display:

> 📷 © Alex Johnson, some rights reserved (CC BY) via iNaturalist

### Hotlinking vs. self-hosting

**Self-host your photos.** While iNaturalist doesn't explicitly prohibit hotlinking, there are three practical reasons to download and host images yourself:

1. **Media bandwidth limits:** Exceeding **5 GB/hour or 24 GB/day** can trigger a **permanent block**.
2. **URL instability:** iNaturalist has migrated photos between hosting domains in the past, breaking hotlinked URLs.
3. **Performance:** Your page load times shouldn't depend on iNaturalist's S3 availability.

The AWS Open Data bucket (`s3://inaturalist-open-data`) provides direct access to all CC-licensed photos for bulk download.

---

## 5. Rate limits, bulk data, and commercial terms

### Rate limits

| Limit | Value |
|-------|-------|
| Hard cap | **100 requests/minute** (HTTP 429 returned) |
| Recommended | **60 requests/minute** (~1 request/second) |
| Histogram endpoint (practical) | **30 requests/minute** (429s reported at 60/min) |
| Daily soft cap | **~10,000 requests/day** |
| Media download | **5 GB/hour, 24 GB/day** (permanent block if exceeded) |
| Pagination offset limit | **10,000 results** (use `id_above` beyond this) |

Authentication **does not increase rate limits**. There are no paid or premium API tiers. iNaturalist is a nonprofit and provides the same access to everyone.

### Authentication (not needed for read-only)

For the batch pipeline, **authentication is not required** for read-only access to public data. All the endpoints described here work without authentication. If you do need to authenticate (e.g., to access private data for testing):

- **JWT token:** Get from `https://www.inaturalist.org/users/api_token` (expires 24 hours)
- **OAuth 2.0 app:** Register at `https://www.inaturalist.org/oauth/applications/new` (requires account ≥2 months old + 10 identifications in past month)
- Header: `Authorization: Bearer {token}`

**Always set a custom User-Agent header:**
```
User-Agent: SaltSafari/1.0 (contact@saltsafari.app)
```

### Bulk data strategy for initial bootstrapping

For ~50 locations × potentially thousands of observations each, **use the API for species counts and seasonality, but consider GBIF for full observation records**.

**Recommended hybrid approach:**

| Data need | Source | Reason |
|-----------|--------|--------|
| Species lists per location | API (`/species_counts`) | 1 request per location per taxon group — ~200 total API calls |
| Monthly seasonality | API (`/histogram`) | 1 request per species per location — could be 2,000–5,000 calls total |
| Full observation records with photos | GBIF export or iNat export tool | Avoids pagination hell and rate limits |
| Photo files | AWS Open Data S3 bucket | Direct download, no rate limits |

**GBIF dataset:**
- URL: `https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7`
- DOI: `https://doi.org/10.15468/ab3s5x`
- Format: Darwin Core Archive (DwC-A)
- Updated weekly from iNaturalist
- Filter on GBIF: Country = Australia, taxon keys for marine groups
- Only includes research-grade observations with CC0, CC-BY, or CC-BY-NC licenses

**AWS Open Data (for photos and metadata):**
- Bucket: `s3://inaturalist-open-data` (us-east-1, public access, no AWS account needed)
- Download metadata: `aws s3 cp s3://inaturalist-open-data/observations.csv.gz . --no-sign-request`
- Files available: `observations.csv.gz`, `photos.csv.gz`, `taxa.csv.gz`, `observers.csv.gz`
- Tab-separated CSVs, gzipped
- Updated monthly

**iNaturalist Export Tool:**
- URL: `https://www.inaturalist.org/observations/export`
- Requires login, allows CSV export with filters
- Good for medium-scale exports of specific locations

### Terms of service for commercial use

**The most important legal considerations for Salt Safari:**

1. **Default content license is CC BY-NC** (non-commercial). The majority of iNaturalist content **cannot legally be used on a paid subscription site** without filtering.

2. **For photos:** Filter strictly for `cc0`, `cc-by`, or `cc-by-sa` licenses. The `cc-by-nd` license also allows commercial use but prohibits modifications (cropping, resizing beyond the original aspect ratio could be considered a derivative).

3. **For observation metadata** (species, location, date): The copyrightability of factual data is legally unclear. iNaturalist allows users to license observation metadata, but factual data points (a species was observed at GPS coordinates on a date) may not be copyrightable in many jurisdictions. The conservative approach is to respect the license field on each observation.

4. **Commercial AI training is explicitly banned:** Section 7 of the ToS states: *"Users may not use any iNaturalist data for training artificial intelligence, machine learning models, large language models, or similar networks, algorithms, or systems for commercial purposes."* This applies regardless of individual content licenses.

5. **No blanket commercial license** is available from iNaturalist.

**Practical recommendation:** For observation metadata (species lists, counts, seasonality patterns), you are aggregating and transforming factual data, which is generally permissible. For photos, strictly filter by license and always provide attribution. Consult a lawyer on the specific commercial use question.

---

## 6. Taxon filtering for marine species

### No native marine filter exists

There is **no `marine=true` parameter, habitat filter, or marine flag** in the iNaturalist API. This is a well-known limitation. Filtering for marine species requires using specific taxon IDs.

### Taxon IDs for marine groups

Using `taxon_id` automatically includes all descendant taxa.

| Group | Taxon ID | Rank | Notes |
|-------|---------|------|-------|
| **Animalia** | 1 | Kingdom | Too broad — includes all terrestrial animals |
| **Actinopterygii** (ray-finned fishes) | 47178 | Class | Includes freshwater fish — use with geographic filter |
| **Elasmobranchii** (sharks & rays) | 47273 | Subclass | Almost entirely marine |
| **Cephalopoda** (octopus, squid, cuttlefish) | 47459 | Class | Almost entirely marine |
| **Nudibranchia** (nudibranchs) | 47113 | Order | Almost entirely marine |
| **Crustacea** (crustaceans) | 85493 | Subphylum | Includes freshwater/terrestrial |
| **Mammalia** (mammals) | 40151 | Class | Too broad — use sub-groups below |
| **Cetacea** (whales & dolphins) | 152871 | Order | Exclusively marine |
| **Pinnipedia** (seals & sea lions) | 372843 | Clade | Marine |
| **Sirenia** (dugongs & manatees) | 46306 | Order | Marine |
| **Chelonioidea** (all sea turtles) | 372234 | Superfamily | Marine. Alternative: Cheloniidae (39657) + Dermochelyidae (39675) |
| **Syngnathidae** (seahorses, pipefish, seadragons) | 49106 | Family | Mostly marine (some freshwater pipefish) |
| **Cnidaria** (corals, anemones, jellyfish) | 47534 | Phylum | Predominantly marine |
| **Echinodermata** (sea stars, urchins, sea cucumbers) | 47549 | Phylum | Almost exclusively marine |
| **Porifera** (sponges) | 48824 | Phylum | Predominantly marine |
| **Mollusca** (all molluscs) | 47115 | Phylum | Includes terrestrial — too broad alone |
| **Tunicata** (sea squirts) | 130868 | Subphylum | Marine |
| **Hydrophiinae** (sea snakes) | 492346 | Subfamily | Marine |
| **Polychaeta** (polychaete worms) | 47490 | Class | Predominantly marine |
| **Ctenophora** (comb jellies) | 51508 | Phylum | Marine |
| **Bryozoa** (moss animals) | 68104 | Phylum | Mostly marine |

### Recommended query strategy

**You cannot get all marine species in one query.** Use multiple queries per taxon group. This is actually preferable for the data model — it lets you categorize species into display groups on the site.

**Tier 1 — exclusively/predominantly marine (safe to include all results):**
```
taxon_ids=47273,47459,47113,47534,47549,48824,130868,51508,68104,47490,372234,152871,372843,46306,492346
```

**Tier 2 — mixed marine/freshwater (rely on geographic proximity to coast):**
```
taxon_ids=47178,85493,49106
```
Since your dive sites are *in the ocean*, a 1–2 km radius around a coastal/offshore location naturally excludes most freshwater species. This is the practical solution to the mixed-habitat problem.

**Tier 3 — subsets of broad groups (targeted queries):**
For Mollusca, you could query the full phylum (`47115`) at a marine location and accept that a few terrestrial snails might appear near shore. Or query specific marine mollusc orders.

**Example: complete species list for one dive site (4 API calls):**
```
# Call 1: Fish (ray-finned + sharks/rays)
GET /v1/observations/species_counts?lat=X&lng=Y&radius=1.5&taxon_ids=47178,47273&quality_grade=research&per_page=500

# Call 2: Invertebrates (cephalopods, nudibranchs, cnidaria, echinoderms, sponges, tunicates, crustaceans)
GET /v1/observations/species_counts?lat=X&lng=Y&radius=1.5&taxon_ids=47459,47113,47534,47549,48824,130868,85493,51508,68104,47490&quality_grade=research&per_page=500

# Call 3: Marine reptiles + mammals
GET /v1/observations/species_counts?lat=X&lng=Y&radius=1.5&taxon_ids=372234,152871,372843,46306,492346&quality_grade=research&per_page=500

# Call 4: Seahorses/pipefish (special interest group)
GET /v1/observations/species_counts?lat=X&lng=Y&radius=1.5&taxon_id=49106&quality_grade=research&per_page=500
```

This totals **4 API calls per location**. For 50 locations: **200 calls** — well within daily limits.

---

## 7. Recommended data pipeline architecture

### Database schema

```sql
-- Core tables
locations (
  id, name, slug, lat, lng, radius_km, region,
  last_synced_at, total_species_count
)

species (
  id,                          -- iNaturalist taxon_id as primary key
  scientific_name,             -- taxon.name
  common_name,                 -- taxon.preferred_common_name
  iconic_taxon,                -- taxon.iconic_taxon_name
  taxon_rank,                  -- taxon.rank
  wikipedia_url,
  default_photo_url,
  default_photo_license,
  default_photo_attribution,
  inat_observations_count,     -- global count from taxon.observations_count
  threatened, endemic, native
)

location_species (
  location_id,
  species_id,
  observation_count,           -- from species_counts.count
  observer_count,              -- number of unique observers (optional, requires extra query)
  first_observed_on,
  last_observed_on,
  likelihood,                  -- 'common', 'occasional', 'rare'
  last_synced_at
)

species_seasonality (
  species_id,
  location_id,
  month,                       -- 1–12
  raw_observation_count,       -- from histogram
  normalized_frequency,        -- after effort correction
  total_observations_that_month, -- baseline effort
  last_synced_at
)

species_photos (
  id,
  species_id,
  location_id,
  inat_photo_id,
  photo_url,                   -- self-hosted URL
  original_inat_url,
  license_code,
  attribution,
  width, height,
  observation_id               -- source iNaturalist observation
)
```

### Pipeline phases

```
┌─────────────────────────────────────────────────────┐
│  PHASE 1: Species Discovery (weekly)                │
│  For each location:                                 │
│    → GET /observations/species_counts (4 calls)     │
│    → Upsert into species + location_species tables  │
│    → Calculate likelihood classification            │
├─────────────────────────────────────────────────────┤
│  PHASE 2: Seasonality (monthly)                     │
│  For each species at each location:                 │
│    → GET /observations/histogram (1 call)           │
│    → GET total effort histogram (1 call/location)   │
│    → Calculate normalized frequencies               │
│    → Upsert into species_seasonality table          │
├─────────────────────────────────────────────────────┤
│  PHASE 3: Photos (monthly)                          │
│  For each species at each location (top N species): │
│    → GET /observations?photo_license=cc0,cc-by...   │
│    → Download photos to S3/CDN                      │
│    → Store metadata in species_photos table         │
├─────────────────────────────────────────────────────┤
│  PHASE 4: Incremental Updates (weekly)              │
│  For each location:                                 │
│    → Re-run Phase 1 with updated_since filter       │
│    → Detect new species, update counts              │
│    → Re-run Phase 2 for changed species only        │
└─────────────────────────────────────────────────────┘
```

### API call budget estimate

| Phase | Calls per location | Total (50 locations) | Frequency |
|-------|-------------------|---------------------|-----------|
| Phase 1: Species counts | 4 | 200 | Weekly |
| Phase 2: Effort baseline | 1 | 50 | Monthly |
| Phase 2: Species seasonality | ~50 species avg | ~2,500 | Monthly |
| Phase 3: Photo fetch | ~20 species × 1 page | ~1,000 | Monthly |
| **Total** | | **~3,750/month** | |

This is comfortably within the 10,000/day limit even if run all at once.

### Likelihood classification algorithm

```typescript
function classifyLikelihood(
  speciesCount: number,
  allSpeciesCounts: number[]
): 'common' | 'occasional' | 'rare' {
  // Sort all species counts at this location descending
  const sorted = [...allSpeciesCounts].sort((a, b) => b - a);
  const total = sorted.reduce((s, c) => s + c, 0);
  
  // Calculate this species' percentile rank
  const rank = sorted.indexOf(speciesCount);
  const percentile = rank / sorted.length;
  
  // Also consider absolute thresholds
  if (speciesCount >= 20 && percentile <= 0.2) return 'common';
  if (speciesCount <= 3) return 'rare';
  if (percentile <= 0.4) return 'common';
  if (percentile >= 0.75) return 'rare';
  return 'occasional';
}
```

An alternative approach uses the **number of unique observers** as a proxy. A species seen by 15 different people is more reliably "common" than one seen 15 times by one person. This requires querying individual observations and counting distinct `user.id` values, or using the `/observations/observers` endpoint filtered by taxon.

### Error handling and idempotency

- **Retry with exponential backoff** on 429 (rate limit) and 5xx errors. Start at 2 seconds, max 60 seconds, 5 retries.
- **Save cursor state** (`id_above` value) after each successful batch so the pipeline can resume after crashes.
- **Use upserts** (INSERT ... ON CONFLICT UPDATE) so re-running is safe.
- **Log every API response status** and `total_results` to detect data drift.
- **Timestamp everything** with `last_synced_at` so you know which data is stale.
- **Idempotency key:** The combination of `(location_id, species_id)` is the natural key for `location_species`; `(species_id, location_id, month)` for `species_seasonality`.

---

## 8. TypeScript/Node.js code examples

### Shared utilities

```typescript
import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://api.inaturalist.org/v1';

// Rate-limited client: 1 request per 2 seconds (30/min for safety)
function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'User-Agent': 'SaltSafari/1.0 (contact@saltsafari.app)',
      'Accept': 'application/json',
    },
    timeout: 30000,
  });

  let lastRequestTime = 0;
  client.interceptors.request.use(async (config) => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 2000) {
      await new Promise((r) => setTimeout(r, 2000 - elapsed));
    }
    lastRequestTime = Date.now();
    return config;
  });

  // Retry on 429 with exponential backoff
  client.interceptors.response.use(undefined, async (error) => {
    const { config, response } = error;
    if (!config || !response) throw error;
    config.__retryCount = config.__retryCount || 0;
    if (response.status === 429 && config.__retryCount < 5) {
      config.__retryCount++;
      const delay = Math.min(2000 * Math.pow(2, config.__retryCount), 60000);
      console.warn(`Rate limited. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return client(config);
    }
    throw error;
  });

  return client;
}

const api = createClient();
```

### Querying observations within a radius

```typescript
interface ObservationResult {
  id: number;
  observed_on: string;
  quality_grade: string;
  taxon: {
    id: number;
    name: string;
    preferred_common_name: string;
    iconic_taxon_name: string;
    rank: string;
    default_photo?: {
      id: number;
      license_code: string;
      attribution: string;
      url: string;
    };
  };
  user: { id: number; login: string; name: string };
  photos: Array<{
    id: number;
    license_code: string | null;
    url: string;
    attribution: string;
    original_dimensions: { width: number; height: number };
  }>;
  location: string;
  place_guess: string;
  geoprivacy: string | null;
  obscured: boolean;
}

async function getObservationsAtLocation(
  lat: number,
  lng: number,
  radiusKm: number,
  taxonIds: number[],
  options: { maxResults?: number } = {}
): Promise<ObservationResult[]> {
  const maxResults = options.maxResults || 10000;
  const allResults: ObservationResult[] = [];
  let idAbove = 0;

  while (allResults.length < maxResults) {
    const params: Record<string, any> = {
      lat,
      lng,
      radius: radiusKm,
      taxon_id: taxonIds.join(','),
      quality_grade: 'research',
      photos: true,
      geo: true,
      per_page: 200,
      order_by: 'id',
      order: 'asc',
      locale: 'en',
      preferred_place_id: 6744, // Australia
    };

    if (idAbove > 0) params.id_above = idAbove;

    const { data } = await api.get('/observations', { params });

    if (data.results.length === 0) break;

    allResults.push(...data.results);
    idAbove = data.results[data.results.length - 1].id;

    console.log(
      `Fetched ${allResults.length}/${data.total_results} observations`
    );

    if (allResults.length >= data.total_results) break;
  }

  return allResults;
}

// Usage
const observations = await getObservationsAtLocation(
  -33.856, 151.215, 1.5,
  [47178, 47273] // fish + sharks/rays
);
```

### Getting species counts for a location

```typescript
interface SpeciesCount {
  count: number;
  taxon: {
    id: number;
    name: string;
    rank: string;
    preferred_common_name: string;
    iconic_taxon_name: string;
    observations_count: number;
    default_photo?: {
      id: number;
      license_code: string;
      attribution: string;
      url: string;
      medium_url: string;
    };
    threatened: boolean;
    endemic: boolean;
    native: boolean;
    wikipedia_url: string;
  };
}

// Taxon group definitions
const MARINE_TAXON_GROUPS = {
  fish: [47178, 47273],          // Actinopterygii + Elasmobranchii
  invertebrates: [               // Cephalopoda, Nudibranchia, Cnidaria,
    47459, 47113, 47534,         // Echinodermata, Porifera, Tunicata,
    47549, 48824, 130868,        // Crustacea, Ctenophora, Bryozoa,
    85493, 51508, 68104, 47490   // Polychaeta
  ],
  reptilesMammals: [372234, 152871, 372843, 46306, 492346],
  seahorses: [49106],
};

async function getSpeciesCountsAtLocation(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SpeciesCount[]> {
  const allSpecies: SpeciesCount[] = [];

  for (const [group, taxonIds] of Object.entries(MARINE_TAXON_GROUPS)) {
    const { data } = await api.get('/observations/species_counts', {
      params: {
        lat,
        lng,
        radius: radiusKm,
        taxon_id: taxonIds.join(','),
        quality_grade: 'research',
        per_page: 500,
        locale: 'en',
        preferred_place_id: 6744,
      },
    });

    console.log(`${group}: ${data.total_results} species found`);

    // Warn if we hit the 500 cap
    if (data.total_results > 500) {
      console.warn(
        `⚠️ ${group} has ${data.total_results} species but only 500 returned. ` +
        `Split into smaller taxon groups.`
      );
    }

    allSpecies.push(...data.results);
  }

  // Deduplicate (a species could appear in overlapping groups)
  const unique = new Map<number, SpeciesCount>();
  for (const sp of allSpecies) {
    const existing = unique.get(sp.taxon.id);
    if (!existing || sp.count > existing.count) {
      unique.set(sp.taxon.id, sp);
    }
  }

  return Array.from(unique.values()).sort((a, b) => b.count - a.count);
}

// Usage
const species = await getSpeciesCountsAtLocation(-33.856, 151.215, 1.5);
console.log(`Total marine species: ${species.length}`);
species.slice(0, 5).forEach((s) => {
  console.log(
    `${s.taxon.preferred_common_name} (${s.taxon.name}): ${s.count} obs`
  );
});
```

### Extracting seasonality with effort normalization

```typescript
interface MonthlyHistogram {
  [month: string]: number;
}

async function getHistogram(
  lat: number,
  lng: number,
  radiusKm: number,
  taxonId?: number
): Promise<MonthlyHistogram> {
  const params: Record<string, any> = {
    lat,
    lng,
    radius: radiusKm,
    quality_grade: 'research',
    date_field: 'observed',
    interval: 'month_of_year',
  };
  if (taxonId) params.taxon_id = taxonId;

  const { data } = await api.get('/observations/histogram', { params });
  return data.results.month_of_year;
}

interface SeasonalityData {
  month: number;
  rawCount: number;
  totalEffort: number;
  normalizedFrequency: number | null;
  classification: 'peak' | 'common' | 'uncommon' | 'rare' | 'no_data';
}

async function getSpeciesSeasonality(
  lat: number,
  lng: number,
  radiusKm: number,
  taxonId: number,
  effortBaseline?: MonthlyHistogram // Cache and reuse per location
): Promise<SeasonalityData[]> {
  // Get species-specific histogram
  const speciesHistogram = await getHistogram(lat, lng, radiusKm, taxonId);

  // Get total effort baseline (all Animalia at this location)
  const totalHistogram =
    effortBaseline || (await getHistogram(lat, lng, radiusKm, 1));

  const months: SeasonalityData[] = [];
  const normalized: (number | null)[] = [];

  for (let m = 1; m <= 12; m++) {
    const raw = speciesHistogram[String(m)] || 0;
    const total = totalHistogram[String(m)] || 0;
    const freq = total >= 5 ? raw / total : null;
    normalized.push(freq);
    months.push({
      month: m,
      rawCount: raw,
      totalEffort: total,
      normalizedFrequency: freq,
      classification: 'no_data', // calculated below
    });
  }

  // Calculate classification thresholds
  const validFreqs = normalized.filter((f): f is number => f !== null);
  if (validFreqs.length === 0) return months;

  const avgFreq = validFreqs.reduce((s, f) => s + f, 0) / validFreqs.length;

  for (const entry of months) {
    if (entry.normalizedFrequency === null) {
      entry.classification = 'no_data';
    } else if (entry.normalizedFrequency >= avgFreq * 1.5) {
      entry.classification = 'peak';
    } else if (entry.normalizedFrequency >= avgFreq * 0.75) {
      entry.classification = 'common';
    } else if (entry.normalizedFrequency >= avgFreq * 0.25) {
      entry.classification = 'uncommon';
    } else {
      entry.classification = 'rare';
    }
  }

  return months;
}

// Usage
const effort = await getHistogram(-33.856, 151.215, 1.5); // cache this
const seasonality = await getSpeciesSeasonality(
  -33.856, 151.215, 1.5,
  82639, // Eastern Blue Groper
  effort
);

const peakMonths = seasonality
  .filter((s) => s.classification === 'peak' || s.classification === 'common')
  .map((s) => new Date(2024, s.month - 1).toLocaleString('en', { month: 'short' }));

console.log(`Commonly spotted: ${peakMonths.join(', ')}`);
```

### Checking photo licenses and building attribution

```typescript
const COMMERCIAL_LICENSES = new Set(['cc0', 'cc-by', 'cc-by-sa']);

// cc-by-nd allows commercial use but prohibits derivatives (cropping, etc.)
// Include it only if you display photos unmodified
const COMMERCIAL_LICENSES_STRICT = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nd']);

interface PhotoInfo {
  photoId: number;
  observationId: number;
  speciesId: number;
  licenseCode: string | null;
  isCommerciallyUsable: boolean;
  attribution: string;
  urls: {
    square: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  width: number;
  height: number;
}

function getPhotoSizeUrl(baseUrl: string, size: string): string {
  // API returns square URL; replace 'square' with desired size
  return baseUrl.replace('/square.', `/${size}.`);
}

function buildAttribution(photo: {
  license_code: string | null;
  attribution: string;
}): string {
  // Use the API-provided attribution string, append source
  if (photo.attribution) {
    return `${photo.attribution} · via iNaturalist`;
  }
  // Fallback if attribution field is missing
  return photo.license_code === 'cc0'
    ? 'No rights reserved (CC0) · via iNaturalist'
    : `Some rights reserved (${photo.license_code?.toUpperCase()}) · via iNaturalist`;
}

function extractPhotos(observations: ObservationResult[]): PhotoInfo[] {
  const photos: PhotoInfo[] = [];

  for (const obs of observations) {
    for (const photo of obs.photos) {
      const licenseCode = photo.license_code;
      const isCommercial = COMMERCIAL_LICENSES.has(licenseCode ?? '');

      photos.push({
        photoId: photo.id,
        observationId: obs.id,
        speciesId: obs.taxon.id,
        licenseCode,
        isCommerciallyUsable: isCommercial,
        attribution: buildAttribution(photo),
        urls: {
          square: photo.url,
          small: getPhotoSizeUrl(photo.url, 'small'),
          medium: getPhotoSizeUrl(photo.url, 'medium'),
          large: getPhotoSizeUrl(photo.url, 'large'),
          original: getPhotoSizeUrl(photo.url, 'original'),
        },
        width: photo.original_dimensions?.width ?? 0,
        height: photo.original_dimensions?.height ?? 0,
      });
    }
  }

  return photos;
}

// Get only commercially-usable photos directly from the API
async function getCommercialPhotosForSpecies(
  lat: number,
  lng: number,
  radiusKm: number,
  taxonId: number,
  limit: number = 5
): Promise<PhotoInfo[]> {
  const { data } = await api.get('/observations', {
    params: {
      lat,
      lng,
      radius: radiusKm,
      taxon_id: taxonId,
      quality_grade: 'research',
      photo_license: 'cc0,cc-by,cc-by-sa', // ← commercial-only filter
      photos: true,
      per_page: Math.min(limit * 2, 200), // fetch extra, some may lack photos
      order_by: 'votes',
      locale: 'en',
    },
  });

  const allPhotos = extractPhotos(data.results);
  return allPhotos.filter((p) => p.isCommerciallyUsable).slice(0, limit);
}
```

### Full pipeline orchestrator

```typescript
async function runPipeline(locations: Array<{ id: string; name: string; lat: number; lng: number; radiusKm: number }>) {
  console.log(`Starting pipeline for ${locations.length} locations`);

  for (const loc of locations) {
    console.log(`\n=== Processing: ${loc.name} ===`);

    // Phase 1: Species discovery
    const species = await getSpeciesCountsAtLocation(loc.lat, loc.lng, loc.radiusKm);
    console.log(`Found ${species.length} species`);

    // Upsert species + location_species records
    for (const sp of species) {
      await upsertSpecies(sp.taxon);
      await upsertLocationSpecies(loc.id, sp.taxon.id, sp.count, species.map(s => s.count));
    }

    // Phase 2: Seasonality (top 100 species only to stay within rate limits)
    const effortBaseline = await getHistogram(loc.lat, loc.lng, loc.radiusKm);
    const topSpecies = species.slice(0, 100);

    for (const sp of topSpecies) {
      const seasonality = await getSpeciesSeasonality(
        loc.lat, loc.lng, loc.radiusKm, sp.taxon.id, effortBaseline
      );
      await upsertSeasonality(sp.taxon.id, loc.id, seasonality);
    }

    // Phase 3: Photos (top 50 species, 3 photos each)
    for (const sp of species.slice(0, 50)) {
      const photos = await getCommercialPhotosForSpecies(
        loc.lat, loc.lng, loc.radiusKm, sp.taxon.id, 3
      );
      for (const photo of photos) {
        // Download to your CDN/S3, then store metadata
        const hostedUrl = await downloadAndHostPhoto(photo.urls.large);
        await upsertPhoto(sp.taxon.id, loc.id, photo, hostedUrl);
      }
    }

    console.log(`✅ ${loc.name} complete`);
  }
}

// Stub functions — implement with your database ORM
async function upsertSpecies(taxon: SpeciesCount['taxon']) { /* ... */ }
async function upsertLocationSpecies(locId: string, speciesId: number, count: number, allCounts: number[]) { /* ... */ }
async function upsertSeasonality(speciesId: number, locId: string, data: SeasonalityData[]) { /* ... */ }
async function upsertPhoto(speciesId: number, locId: string, photo: PhotoInfo, hostedUrl: string) { /* ... */ }
async function downloadAndHostPhoto(url: string): Promise<string> { return ''; /* ... */ }
```

---

## Gotchas and surprises to watch for

**Coordinate obscuring is invisible.** Observations of threatened species have their GPS coordinates randomized within a ~22 km × 22 km box. The API returns these shifted coordinates without any visual distinction — you must check the `obscured`, `geoprivacy`, and `taxon_geoprivacy` fields. An "obscured" observation appearing in your 1.5 km radius search may actually be 10+ km away. Filter with `geoprivacy=open` and check `taxon_geoprivacy` isn't set.

**The species_counts 500-result ceiling is a hard wall.** Unlike the observations endpoint which supports cursor pagination, species_counts simply stops at 500. Prolific locations like the Great Barrier Reef could exceed this for broad taxon queries. Always split into taxon groups and monitor for truncation by comparing `total_results` to the returned count.

**Observation licenses and photo licenses are separate.** An observation can be CC0 while its photos are CC BY-NC (or vice versa). Always check `photo.license_code` independently from `observation.license_code`. For commercial use, filter using the `photo_license` API parameter.

**The histogram endpoint is more fragile under load than other endpoints.** Community reports document 429 errors at the supposedly-safe 60 req/min rate. Budget 2 seconds between histogram requests.

**`taxon_id` includes descendants automatically.** Using `taxon_id=1` (Animalia) returns every animal observation — including insects, birds, and terrestrial mammals. This is a feature, not a bug, but means you cannot simply query "all marine life" with a single parent taxon.

**The API is not designed for bulk extraction.** iNaturalist's own documentation states this explicitly. For the initial bootstrap, the API-based approach works because species_counts and histogram endpoints are highly aggregated (few calls). But if you ever need raw observation records at scale, use the GBIF dataset (DOI: `10.15468/ab3s5x`) or AWS Open Data bucket (`s3://inaturalist-open-data`).

**Australia-specific common names may differ.** Set `preferred_place_id=6744` (Australia) and `locale=en` to get locally-relevant common names. Without this, you might get American common names for species that exist in both regions.