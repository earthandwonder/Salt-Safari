# Marine biodiversity API integration spec for Salt Safari

**Four supplementary data sources can dramatically expand species coverage beyond iNaturalist, especially for offshore and remote Australian dive sites.** The highest-value integration is ALA, which aggregates CSIRO and AIMS scientific survey data with a mature, well-documented API that supports point-radius queries and iNaturalist deduplication out of the box. OBIS adds a dedicated marine checklist endpoint backed by 38 million Australian records. GBIF is best used as a one-time bulk bootstrapping source via its download API. FishBase provides excellent species enrichment data but has no REST API and carries a non-commercial license that may be a dealbreaker.

This spec covers exact API endpoints, parameters, response formats, deduplication strategies, and a recommended implementation order for a solo developer building a multi-source pipeline.

---

## Source 1: Atlas of Living Australia (ALA)

**Verdict: INTEGRATE FIRST — highest value, best API, lowest effort.**

ALA aggregates 130–150 million records from 900+ providers including AIMS reef monitoring, CSIRO marine surveys, state fisheries, and museum collections. It has the richest coverage of Australian offshore waters from scientific sources that iNaturalist cannot match.

### API basics

| Detail | Value |
|---|---|
| Base URL | `https://biocache-ws.ala.org.au/ws/` |
| Auth | **None required** for occurrence/species search |
| Protected endpoints | JWT via `https://tokens.ala.org.au/` (sensitive data only) |
| Documentation | `https://docs.ala.org.au` → OpenAPI specs |
| Response format | JSON |

### Spatial query — point + radius

ALA natively supports lat/lng/radius queries on the occurrence search endpoint:

```
GET https://biocache-ws.ala.org.au/ws/occurrences/search
  ?q=*:*
  &lat=-16.5
  &lon=145.78
  &radius=10          # km
  &pageSize=20
  &startIndex=0
```

**WKT geometry** is also supported via the `wkt` parameter (longitude first): `wkt=POLYGON((113.5 -22.5,114.5 -22.5,114.5 -21.5,113.5 -21.5,113.5 -22.5))`. There is no documented maximum radius, though very large queries may time out.

### Species-level aggregation (the key endpoint)

Rather than downloading all occurrences and counting, use **faceted search** to get species lists with counts — directly analogous to iNaturalist's `species_counts`:

```
GET https://biocache-ws.ala.org.au/ws/occurrences/search
  ?q=*:*
  &lat=-16.5
  &lon=145.78
  &radius=10
  &fq=-data_resource_uid:"dr1411"   # exclude iNaturalist
  &facets=species
  &pageSize=0                        # no individual records
  &flimit=500                        # max species in facet
```

This returns a `facetResults` array with species names and occurrence counts. Setting `pageSize=0` returns only aggregated facet data.

For a downloadable CSV of species with counts:

```
GET https://biocache-ws.ala.org.au/ws/occurrences/facets/download
  ?q=*:*&lat=-16.5&lon=145.78&radius=10&facets=species
```

### Excluding iNaturalist to avoid duplication

ALA ingests iNaturalist Australia as data resource **`dr1411`** (refreshed weekly, research-grade only). Exclude it with a negative filter query:

```
fq=-data_resource_uid:"dr1411"
```

In the response, check `dataResourceUid === "dr1411"` and `dataResourceName === "iNaturalist Australia"` to identify any iNaturalist-sourced records.

### Marine species filtering

ALA has **no single "marine" flag**. Use a combination approach:

```
# By taxonomic class (repeat fq for multiple):
fq=class:Actinopterygii        # bony fish
fq=class:Chondrichthyes        # sharks and rays
fq=phylum:Cnidaria             # corals, anemones
fq=phylum:Echinodermata        # sea stars, urchins
fq=phylum:Mollusca             # nudibranchs, cephalopods

# By species group:
fq=species_group:Fish
fq=species_group:Sharks

# By IMCRA marine bioregion (records with any IMCRA region = marine location):
fq=cl966:*
```

**Recommended strategy**: Query by lat/lng/radius around dive sites (inherently marine locations) and filter by relevant marine phyla/classes.

### Response structure

Key fields in each occurrence record:

```json
{
  "scientificName": "Cheilinus undulatus",
  "vernacularName": "Humphead Wrasse",
  "taxonRank": "species",
  "kingdom": "Animalia",
  "phylum": "Chordata",
  "classs": "Actinopterygii",
  "order": "Perciformes",
  "family": "Labridae",
  "genus": "Cheilinus",
  "species": "Cheilinus undulatus",
  "speciesGuid": "https://id.biodiversity.org.au/...",
  "taxonConceptID": "https://id.biodiversity.org.au/...",
  "eventDate": 1552608000000,
  "year": 2019,
  "month": "04",
  "basisOfRecord": "HUMAN_OBSERVATION",
  "dataResourceUid": "dr349",
  "dataResourceName": "CSIRO National Fish Collection",
  "institutionName": "CSIRO",
  "assertions": ["COORDINATE_ROUNDED"],
  "spatiallyValid": true,
  "license": "CC-BY 3.0 (Au)",
  "decimalLatitude": -16.5,
  "decimalLongitude": 145.78,
  "speciesGroups": ["Animals", "Fish", "Fishes"]
}
```

### Data quality filters

ALA applies a **default quality profile** that silently filters out spatially suspect, duplicate, and environmentally outlier records. Control this with:

```
qualityProfile=ALA              # apply ALA General profile (default)
disableAllQualityFilters=true   # disable all filters
disableQualityFilter=spatial-suspect   # disable specific filter
```

**Critical gotcha for marine data**: The `spatial-suspect` filter can incorrectly flag legitimate coastal and marine records because ALA's coastline spatial layers don't perfectly align with actual coastlines. For marine queries, consider adding `disableQualityFilter=spatial-suspect`.

### Seasonality via month facets

```
GET https://biocache-ws.ala.org.au/ws/occurrences/search
  ?q=taxon_name:"Manta alfredi"
  &lat=-23.15&lon=113.77&radius=50
  &facets=month
  &pageSize=0
```

Returns monthly occurrence counts in the `facetResults` array — perfect for building a "best months to see this species" feature.

### Key marine data providers within ALA

| Provider | Resource ID | Coverage |
|---|---|---|
| AIMS (reef monitoring, LTMP) | Multiple `dr` IDs | GBR, Coral Sea — excellent |
| CSIRO National Fish Collection | `dr349` | Deep-water surveys, 4,000+ species |
| CSIRO NCMI | Various | Marine invertebrates, CAAB |
| Museums (AM, QM, MV, WAM, SAM) | Various | Specimen records, good offshore coverage |
| IMOS/AODN | Various | Ocean observing biological data |
| State fisheries | Various | Fisheries survey data |
| iNaturalist Australia | `dr1411` | Citizen science (exclude to avoid duplication) |

### Pagination

Uses `pageSize` (default 10) and `startIndex` (0-based offset). The `totalRecords` field gives total count. For large datasets, use the **async download endpoint**: `POST https://biocache-ws.ala.org.au/ws/occurrences/offline/download`.

### Licensing and attribution

Individual records carry their own license in the `license` field (CC0, CC-BY, or CC-BY-NC). **Commercial use depends on per-record license.** Filter CC-BY-NC records if commercial use is required. Attribution format: *"Data sourced from Atlas of Living Australia (ala.org.au), accessed [date]. [Data provider name]."*

### Schema mapping

```typescript
// ALA → species table
const species = {
  scientific_name: record.scientificName,   // or record.species
  common_name: record.vernacularName,
  kingdom: record.kingdom,
  phylum: record.phylum,
  class: record.classs,                     // NOTE: three s's!
  order: record.order,
  family: record.family,
  genus: record.genus,
  taxon_id_ala: record.speciesGuid
};

// ALA faceted species count → location_species table
const locationSpecies = {
  observation_count: facetResult.count,
  source: 'ala',
  source_resource: record.dataResourceName,
  likelihood: deriveLikelihood(facetResult.count, record.basisOfRecord)
};
```

### ALA gotchas

- **`classs` has three s's** — Java reserved word workaround. This will cause bugs.
- **`eventDate` is Unix milliseconds**, not seconds.
- **`month` is a string** ("09"), not an integer.
- **WKT uses lon/lat order** (X Y), opposite to the `lat`/`lon` parameters.
- **Default quality profile silently filters records** — you may get fewer results than expected.
- **Marine spatial validity issues** — disable `spatial-suspect` filter for marine queries.
- **No published rate limits** — be reasonable, add delays, cache aggressively.

---

## Source 2: OBIS (Ocean Biodiversity Information System)

**Verdict: INTEGRATE SECOND — purpose-built for marine data, excellent checklist endpoint, strong scientific survey coverage.**

OBIS is the world's largest open marine biodiversity database, with **38.3 million occurrence records and 40,590 species** in Australian waters alone. It includes AIMS Long-Term Monitoring Program data, CSIRO surveys, and museum collections. Every record is taxonomically matched against WoRMS (World Register of Marine Species) and enriched with environmental data.

### API basics

| Detail | Value |
|---|---|
| Base URL | `https://api.obis.org/v3/` |
| Auth | **None required** |
| Documentation | Swagger at `https://api.obis.org/`, manual at `https://manual.obis.org` |
| Client libraries | `robis` (R), `pyobis` (Python) |
| Response format | JSON |

### Spatial query — WKT geometry only

OBIS **does not support point + radius**. You must construct a WKT polygon. For dive site queries, build a bounding box or circular polygon approximation:

```
GET https://api.obis.org/v3/checklist
  ?geometry=POLYGON((149 -23, 149 -24, 150 -24, 150 -23, 149 -23))
```

Coordinates are **longitude first, latitude second** (WGS84). OBIS also offers ~800 pre-defined `areaid` values (EEZs, ocean regions) accessible via `https://api.obis.org/v3/area`.

**Helper function to create a bounding box from point + radius:**

```typescript
function pointToBBox(lat: number, lng: number, radiusKm: number): string {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
}
```

### The checklist endpoint — species lists per area

This is OBIS's killer feature for this use case. The `/checklist` endpoint returns a **species list with record counts** for any geographic area:

```
GET https://api.obis.org/v3/checklist
  ?geometry=POLYGON((149 -23, 149 -24, 150 -24, 150 -23, 149 -23))
  &size=500
  &offset=0
```

**Key parameters:**

| Parameter | Description |
|---|---|
| `geometry` | WKT geometry string |
| `areaid` | Pre-defined OBIS area ID |
| `scientificname` | Filter by taxon (includes children) |
| `taxonid` | WoRMS AphiaID |
| `startdate` / `enddate` | Date range (YYYY-MM-DD) |
| `startdepth` / `enddepth` | Depth range in meters |
| `redlist` | IUCN Red List species only |
| `size` | Results per page |
| `offset` | Pagination offset |

### Checklist response structure

```json
{
  "total": 1532,
  "results": [
    {
      "taxonID": 218217,
      "scientificName": "Acanthurus lineatus",
      "scientificNameAuthorship": "(Linnaeus, 1758)",
      "acceptedNameUsage": "Acanthurus lineatus (Linnaeus, 1758)",
      "taxonRank": "Species",
      "taxonomicStatus": "accepted",
      "kingdom": "Animalia",
      "phylum": "Chordata",
      "class": "Actinopterygii",
      "order": "Acanthuriformes",
      "family": "Acanthuridae",
      "genus": "Acanthurus",
      "species": "Acanthurus lineatus",
      "category": "LC",
      "records": 47,
      "datasets": 3
    }
  ]
}
```

The `records` field gives occurrence count and `datasets` gives contributing dataset count — both directly map to confidence indicators.

### Occurrence response enrichment fields

Individual occurrence records (`/v3/occurrence`) include OBIS-added fields not available anywhere else:

- **`marine`**, **`brackish`**, **`freshwater`**, **`terrestrial`** — boolean habitat flags from WoRMS
- **`bathymetry`** — seafloor depth from GEBCO
- **`shoredistance`** — distance from shore in meters (from OpenStreetMap)
- **`sst`** — sea surface temperature from Bio-Oracle
- **`sss`** — sea surface salinity from Bio-Oracle
- **`depth`** — observation depth (from data provider)
- **`absence`** — boolean, whether this is an absence record
- **`dropped`** — boolean, whether the record failed QC
- **`flags`** — quality control flag codes

### Marine filtering

OBIS is marine-focused, but ~0.5% of records are flagged `NOT_MARINE` and ~1% `MARINE_UNSURE`. **Dropped records (including non-marine) are excluded by default**, so no additional filtering is needed for standard queries. There is no habitat-type filter (reef vs. pelagic), but you can use `startdepth`/`enddepth` as a proxy (e.g., shallow reef: 0–30m).

### Australian coverage and key datasets

OBIS Australia (hosted by CSIRO NCMI) contributes **649 datasets** to the global OBIS system. Key datasets:

- **AIMS Long-Term Monitoring Program** — GBR fish visual census, crown-of-thorns surveys, coral surveys. ~50 reefs, 191+ species, data from 1992–present.
- **CReefs Australia** — Ningaloo, Heron Island, Lizard Island scuba/snorkel surveys (2008–2010)
- **GBR Nearshore Coral Diversity** — 466 sites, 96 reefs, 285 coral species
- **CSIRO trawl surveys** — deep-water and continental shelf surveys
- **Museum collections** — Australian Museum, Queensland Museum, WAM, Museums Victoria

Coverage of remote sites: GBR is excellent; Ningaloo is good via CReefs and WAM; Coral Sea has moderate coverage from deep-sea surveys; Rowley Shoals has limited but present data from WA biodiversity surveys.

### Data quality

OBIS applies automated QC flags. Key flags to watch:

| Flag | Meaning | Action |
|---|---|---|
| `ON_LAND` | Point on land per OSM | Check — 8.7% of AU records flagged, many are legitimate near-shore |
| `NO_DEPTH` | Missing depth | Flag only |
| `DEPTH_EXCEEDS_BATH` | Depth exceeds bathymetry | Suspect |
| `NOT_MARINE` | Species not marine per WoRMS | Dropped by default |
| `ZERO_COORD` | Coordinates are 0,0 | Dropped |

Distinguish scientific surveys from citizen science using `basisOfRecord` (HumanObservation, PreservedSpecimen, MachineObservation) and `dataset_id` metadata.

### Overlap with ALA

**Significant overlap exists.** Many OBIS-AU datasets are also harvested by ALA. CSIRO hosts both OBIS Australia and manages ALA's GBIF node. Deduplication between OBIS and ALA is essential — use `occurrenceID` for matching, though taxonomy will differ (OBIS uses WoRMS; ALA uses the Australian National Species List).

### Schema mapping

```typescript
// OBIS checklist → species table
const species = {
  scientific_name: result.scientificName,
  common_name: null,                        // OBIS has NO common names
  taxon_id_worms: result.taxonID,           // WoRMS AphiaID
  class: result.class,
  order: result.order,
  family: result.family,
  iucn_category: result.category
};

// OBIS checklist → location_species table
const locationSpecies = {
  observation_count: result.records,
  dataset_count: result.datasets,
  source: 'obis',
  likelihood: deriveLikelihood(result.records, result.datasets)
};
```

### OBIS gotchas

- **No common/vernacular names** — must cross-reference with WoRMS API or FishBase.
- **No images** — occurrence records only.
- **No point+radius** — must construct WKT polygons manually.
- **WKT is longitude-first** — `POLYGON((lon lat, ...))`, not lat/lon.
- **`scientificName` is the WoRMS-accepted name**, not the provider's original (stored in `originalScientificName`). Searching for a synonym may return nothing.
- **8.7% of AU records flagged ON_LAND** — many are legitimate near-shore records; don't filter aggressively.
- **No month aggregation endpoint** — must query occurrences and aggregate client-side.
- **Large polygon queries can be very slow** — use `areaid` for the full Australian EEZ.
- **Taxonomy uses WoRMS** — different from iNaturalist's backbone. Same species may have different accepted names.

### Licensing

Datasets use CC0, CC-BY, or CC-BY-NC. License varies per dataset and must be tracked per record. Citation format: *"OBIS (2026). Ocean Biodiversity Information System. Intergovernmental Oceanographic Commission of UNESCO. www.obis.org. Accessed: [date]."*

---

## Source 3: FishBase and SeaLifeBase

**Verdict: INTEGRATE AS ENRICHMENT LAYER ONLY — excellent species data, but no REST API, no occurrence records, and the CC-BY-NC license prohibits commercial use.**

FishBase (36,100 fish species) and SeaLifeBase (200,000+ non-fish marine species) are the world's most comprehensive species reference databases. They don't track where/when individual observations occurred — they provide species profiles: depth range, habitat, size, common names, diet, behaviour. These are **enrichment databases**, not observation databases.

### Current API state — the REST API is deprecated

The old REST API at `https://fishbase.ropensci.org/species?genus=X` is **deprecated**. The data behind it dates to March 2017. The current access method uses **Apache Parquet files** served from S3-compatible storage:

```
FishBase:    https://fishbase.ropensci.org/fishbase/species.parquet
SeaLifeBase: https://fishbase.ropensci.org/sealifebase/species.parquet
```

**For a TypeScript/Node.js developer, the practical approach is:**
1. Download parquet files periodically (they're static snapshots, updated a few times per year)
2. Import into your database (PostgreSQL, SQLite)
3. Query locally — no runtime API dependency

You can also use **DuckDB-WASM** or **DuckDB Node.js bindings** to query parquet files directly:

```typescript
import { Database } from 'duckdb-async';

const db = await Database.create(':memory:');
const species = await db.all(`
  SELECT SpecCode, Genus, Species, FBname, 
         DepthRangeShallow, DepthRangeDeep,
         DemersPelag, Length, Vulnerability
  FROM read_parquet('https://fishbase.ropensci.org/fishbase/species.parquet')
  WHERE Saltwater = -1
  AND Genus = 'Cheilinus' AND Species = 'undulatus'
`);
```

### Geographic queries — country/FAO area only

No lat/lng queries. Distribution is at country and FAO area level only:

```sql
-- Australian fish species via country table (C_Code '036' = Australia)
SELECT s.Genus, s.Species, s.FBname, s.DepthRangeShallow, s.DepthRangeDeep
FROM read_parquet('.../species.parquet') s
JOIN read_parquet('.../country.parquet') c ON s.SpecCode = c.SpecCode
WHERE c.C_Code = '036'
```

Relevant FAO areas for Australia: 57 (Eastern Indian Ocean), 71 (Western Central Pacific), 81 (Southwest Pacific).

### Key enrichment fields

The `species` table has 100+ columns. The most valuable for a dive guide:

| Field | Example | Table |
|---|---|---|
| `FBname` | "Humphead wrasse" | species |
| `Length` (max cm) | 229.0 | species |
| `DepthRangeShallow` / `DepthRangeDeep` | 1 / 60 | species |
| `DepthRangeComShallow` / `DepthRangeComDeep` | 2 / 30 | species |
| `DemersPelag` | "reef-associated" | species |
| `Vulnerability` (0–100 score) | 72.1 | species |
| `Dangerous` | "harmless" / "venomous" | species |
| `Fresh` / `Brack` / `Saltwater` | 0 / 0 / -1 | species |
| `ComName` (multilingual common names) | "Bumphead parrotfish" | comnames |
| `CoralReefs` / `SeaGrass` / `Oceanic` | boolean flags | ecology |
| `FoodTroph` (trophic level) | 3.4 | ecology |

**Boolean encoding quirk**: FishBase uses **`-1` for true and `0` for false** as integers, not proper booleans.

### FishBase vs. SeaLifeBase

Both use **identical table structures** and API patterns. FishBase covers finfish; SeaLifeBase covers invertebrates, marine mammals, reptiles, and other non-fish species. Change the URL path from `/fishbase/` to `/sealifebase/` to access SeaLifeBase tables. SeaLifeBase data is generally sparser than FishBase.

### Species range validation use case

FishBase is valuable as a **plausibility check**: "Is *Cheilinus undulatus* known to occur in Australian waters?" Query the `country` table for `C_Code = '036'`. This won't tell you about specific dive sites but confirms a species is expected in the region. The distribution data is compiled from **67,600+ published references** and expert review.

### License — the dealbreaker

**CC-BY-NC 4.0 (FishBase) and CC-BY-NC 3.0 (SeaLifeBase).** This means:

- ✅ Free for non-commercial use with attribution
- ❌ **Cannot be used commercially** — if Salt Safari generates revenue through ads, subscriptions, or paid features, you need separate permission from Quantitative Aquatics Inc.

The R package `rfishbase` is CC0, but **the data retains CC-BY-NC**.

### Attribution

*"Froese, R. and D. Pauly. Editors. 2026. FishBase. World Wide Web electronic publication. www.fishbase.org, version (MM/YYYY)."*

### Integration recommendation

**Worth integrating for enrichment, but address the license first.** Download parquet tables into your database as a one-time data import. Use FishBase to add depth ranges, habitat type, size, and common names to species discovered via iNaturalist/ALA/OBIS. Don't build runtime API dependencies against their infrastructure. If Salt Safari is commercial, contact FishBase for licensing terms or find alternative enrichment sources (WoRMS API provides some of these fields under CC-BY).

---

## Source 4: GBIF (Global Biodiversity Information Facility)

**Verdict: USE FOR BULK BOOTSTRAPPING VIA DOWNLOAD API — excellent for initial data load, but high overlap with ALA/OBIS makes it redundant for ongoing queries.**

GBIF aggregates data from iNaturalist, ALA, OBIS, museums, and hundreds of other publishers. For Australian marine data, **most GBIF records originate from sources you're already querying** (ALA is the GBIF node for Australia; OBIS publishes to GBIF). The unique value of GBIF is its **bulk download API** which can extract all matching records in a single async request — far more efficient than paginating multiple APIs.

### API basics

| Detail | Value |
|---|---|
| Base URL | `https://api.gbif.org/v1/` |
| Auth (search) | **None required** |
| Auth (downloads) | HTTP Basic Auth with free GBIF.org account |
| Response format | JSON |
| Max results per page | **300** |
| Pagination hard limit | **offset + limit ≤ 100,000** |

### Spatial query — point + radius supported

GBIF supports `geoDistance` on the occurrence search API:

```
GET https://api.gbif.org/v1/occurrence/search
  ?decimalLatitude=-16.9
  &decimalLongitude=146.0
  &geoDistance=10km
  &hasCoordinate=true
  &country=AU
  &limit=300
```

Also supports bounding box via lat/lng ranges and WKT `geometry` parameter (counter-clockwise winding order required).

### Excluding iNaturalist — critical limitation

The iNaturalist dataset key in GBIF is **`50c9509d-22c7-4a22-a47d-8c48425ef4a7`**.

**The search API does NOT support negative filters.** You cannot exclude iNaturalist via query parameters. Options:

1. **Client-side filtering**: Filter `datasetKey !== "50c9509d-22c7-4a22-a47d-8c48425ef4a7"` after receiving results
2. **Download API** (supports `not` predicates):

```json
{
  "creator": "username",
  "notificationAddresses": ["email@example.org"],
  "format": "SIMPLE_CSV",
  "predicate": {
    "type": "and",
    "predicates": [
      { "type": "equals", "key": "COUNTRY", "value": "AU" },
      { "type": "equals", "key": "HAS_COORDINATE", "value": "true" },
      { "type": "not", "predicate": {
        "type": "equals", "key": "DATASET_KEY",
        "value": "50c9509d-22c7-4a22-a47d-8c48425ef4a7"
      }},
      { "type": "in", "key": "LICENSE",
        "values": ["CC0_1_0", "CC_BY_4_0"] }
    ]
  }
}
```

3. **SQL download API**:

```sql
SELECT gbifid, datasetKey, scientificName, decimalLatitude,
       decimalLongitude, eventDate, depth, species, family
FROM occurrence
WHERE countryCode = 'AU'
  AND datasetKey != '50c9509d-22c7-4a22-a47d-8c48425ef4a7'
  AND hasCoordinate = true
```

### Species counts via faceted search

```
GET https://api.gbif.org/v1/occurrence/search
  ?country=AU
  &geoDistance=10km
  &decimalLatitude=-16.9
  &decimalLongitude=146.0
  &facet=speciesKey
  &facetLimit=500
  &limit=0
```

Returns `speciesKey` values with occurrence counts in the `facets` array. Use `limit=0` for counts only. The `SPECIES_LIST` download format provides aggregated species lists.

### Marine filtering

No `habitat=marine` filter on occurrence search. Workarounds:

- Filter by marine phyla/classes: `classKey=204` (Actinopterygii), `phylumKey=52` (Cnidaria), etc.
- Use spatial queries targeting ocean coordinates
- The Species API (`/v1/species/search`) supports `habitat=marine` — use for building a marine taxon key list, then query occurrences by those keys

### Licensing and commercial use

GBIF records carry one of three licenses: **CC0** (~15%), **CC-BY** (~83%), or **CC-BY-NC** (~2%). Filter for commercial use: `license=CC0_1_0&license=CC_BY_4_0` (repeatable parameter, use underscores). Register a **derived dataset** at `https://www.gbif.org/derived-dataset/register` with datasetKey + record counts to get a citable DOI.

### Bulk download — the primary use case

For 50–200 dive sites, the download API is **far superior** to paginating the search API. The search API's 100,000-record offset limit and 300-records-per-page cap make bulk extraction impractical.

Download workflow:
1. POST predicate JSON to `https://api.gbif.org/v1/occurrence/download/request` with Basic Auth
2. Poll `GET /v1/occurrence/download/{key}` until `status: "SUCCEEDED"` (5–60 minutes)
3. Download ZIP from `https://api.gbif.org/v1/occurrence/download/request/{key}.zip`
4. Parse `SIMPLE_CSV` (tab-separated) or `DWCA` (Darwin Core Archive)

### GBIF gotchas

- **100,000 pagination hard limit** — the biggest gotcha. Use the download API for anything substantial.
- **No negative filters in search API** — cannot exclude iNaturalist server-side.
- **No vernacular names in occurrence records** — fetch separately from `/v1/species/{taxonKey}/vernacularNames`.
- **WKT winding order matters** — counter-clockwise = inside polygon; clockwise = everything outside. Common bug source.
- **Rate limiting is dynamic** — no guaranteed rate. Returns HTTP 429. Design for exponential backoff.
- **iNaturalist dominates recent records** — without exclusion, iNat may be the majority of observations for popular species.
- **`depth` field is sparsely populated** for marine records.
- **Taxonomy uses GBIF backbone** — differs from both iNaturalist and WoRMS. Use `/v1/species/match?name=...` to resolve.

---

## Multi-source pipeline architecture

### Unified pipeline design

```
┌─────────────────────────────────────────────────────────┐
│                    LOCATION INPUT                        │
│         (lat, lng, radius, site_name)                    │
└──────────┬──────────┬──────────┬────────────────────────┘
           │          │          │
     ┌─────▼───┐ ┌────▼────┐ ┌──▼───┐
     │ iNat API │ │ ALA API │ │ OBIS │   ◄── Real-time per-site queries
     │ species_ │ │ faceted │ │check-│
     │ counts   │ │ search  │ │ list │
     └────┬─────┘ └────┬────┘ └──┬───┘
          │            │         │
     ┌────▼────────────▼─────────▼────┐
     │     SPECIES DEDUPLICATION       │
     │  Match by scientific name       │
     │  Normalize via WoRMS AphiaID    │
     │  Merge counts, track sources    │
     └──────────────┬─────────────────┘
                    │
     ┌──────────────▼─────────────────┐
     │      ENRICHMENT LAYER           │
     │  FishBase: depth, habitat, size │
     │  WoRMS API: common names        │
     │  IUCN API: conservation status  │
     └──────────────┬─────────────────┘
                    │
     ┌──────────────▼─────────────────┐
     │      CONFIDENCE SCORING         │
     │  Weight by source, count,       │
     │  recency, spatial precision     │
     └──────────────┬─────────────────┘
                    │
     ┌──────────────▼─────────────────┐
     │       DATABASE STORAGE          │
     │  species table                  │
     │  location_species table         │
     │  source_records table           │
     └────────────────────────────────┘
```

**GBIF's role**: Use a one-time bulk download to bootstrap the database for all sites. Then query iNaturalist, ALA, and OBIS per-site for ongoing updates.

### TypeScript pipeline pseudocode

```typescript
interface SourceResult {
  scientific_name: string;
  common_name: string | null;
  observation_count: number;
  source: 'inaturalist' | 'ala' | 'obis' | 'gbif';
  source_detail: string;           // dataset name
  basis_of_record: string;
  last_observed: string | null;
  license: string;
}

async function queryAllSources(
  lat: number, lng: number, radiusKm: number
): Promise<SourceResult[]> {
  const results: SourceResult[] = [];

  // 1. iNaturalist (existing pipeline)
  const inatSpecies = await queryINaturalist(lat, lng, radiusKm);
  results.push(...inatSpecies.map(toSourceResult('inaturalist')));

  // 2. ALA (excluding iNaturalist records)
  const alaUrl = `https://biocache-ws.ala.org.au/ws/occurrences/search`
    + `?q=*:*&lat=${lat}&lon=${lng}&radius=${radiusKm}`
    + `&fq=-data_resource_uid:"dr1411"`     // exclude iNat
    + `&facets=species&pageSize=0&flimit=500`;
  const alaSpecies = await fetch(alaUrl).then(r => r.json());
  results.push(...parseALAFacets(alaSpecies));

  // 3. OBIS (construct bounding box from point+radius)
  const wkt = pointToBBox(lat, lng, radiusKm);
  const obisUrl = `https://api.obis.org/v3/checklist`
    + `?geometry=${encodeURIComponent(wkt)}&size=500`;
  const obisSpecies = await fetch(obisUrl).then(r => r.json());
  results.push(...parseOBISChecklist(obisSpecies));

  return deduplicateSpecies(results);
}
```

### Source priority and confidence model

Assign each species-location record a **confidence score** (0–1) based on source type, observation count, spatial precision, and recency:

```typescript
function calculateConfidence(records: SourceResult[]): number {
  let score = 0;

  for (const record of records) {
    // Source weight
    const sourceWeight = {
      'inaturalist': 0.7,   // citizen science, photo-verified
      'ala_scientific': 1.0, // AIMS/CSIRO/museum — highest trust
      'ala_citizen': 0.6,    // other ALA citizen science
      'obis': 0.9,           // scientific surveys, WoRMS-validated
      'gbif': 0.5,           // meta-aggregator, unknown provenance
      'fishbase_range': 0.3  // species known in country, not site-level
    }[record.source] ?? 0.5;

    // Count factor (diminishing returns)
    const countFactor = Math.min(1, Math.log10(record.observation_count + 1) / 2);

    // Recency factor (observations < 5 years = 1.0, 5-10 = 0.8, > 10 = 0.6)
    const recencyFactor = getRecencyFactor(record.last_observed);

    score = Math.max(score, sourceWeight * countFactor * recencyFactor);
  }

  return Math.min(1, score);
}
```

**Confidence tiers for display:**

| Score | Label | Typical scenario |
|---|---|---|
| 0.8–1.0 | **Confirmed** | 50+ iNat observations or AIMS survey data at this site |
| 0.5–0.8 | **Likely** | Multiple sources confirm; scientific survey in broader area |
| 0.3–0.5 | **Possible** | OBIS shows species in region, few local observations |
| 0.1–0.3 | **Range only** | FishBase says species occurs in Australian waters, no site-level data |

**Worked example**: If iNaturalist reports *Manta alfredi* with 50 observations at Lady Elliot Island, and ALA has 3 AIMS survey records confirming it, the combined confidence is ~0.95 (Confirmed). If OBIS shows *Rhincodon typus* in a broad GBR region with 12 records across 3 datasets but nobody has logged it at your specific dive site, confidence is ~0.5 (Likely — the species is in the area but not confirmed at this exact site).

### Deduplication strategy

**Primary match key: normalized scientific name.** Taxonomic IDs are unreliable across sources because each uses a different backbone (iNaturalist own taxonomy, ALA uses Australian NSL, OBIS uses WoRMS, GBIF uses GBIF backbone).

```typescript
function normalizeSpeciesName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 2)               // genus + species epithet only
    .join(' ')
    .toLowerCase();
}

function deduplicateSpecies(records: SourceResult[]): MergedSpecies[] {
  const grouped = new Map<string, SourceResult[]>();

  for (const record of records) {
    const key = normalizeSpeciesName(record.scientific_name);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(record);
  }

  return Array.from(grouped.entries()).map(([name, sources]) => ({
    scientific_name: sources[0].scientific_name,  // prefer iNat/OBIS name
    common_name: sources.find(s => s.common_name)?.common_name ?? null,
    total_observations: sources.reduce((sum, s) => sum + s.observation_count, 0),
    sources: sources.map(s => ({ source: s.source, count: s.observation_count })),
    confidence: calculateConfidence(sources)
  }));
}
```

**Cross-referencing taxonomy IDs**: For higher reliability, use the WoRMS API (`https://www.marinespecies.org/rest/AphiaRecordsByName/{name}?like=false`) to resolve all names to a canonical AphiaID. This handles synonyms, misspellings, and taxonomic revisions. Cache the AphiaID in your species table as the universal join key.

**Handling synonyms**: If ALA reports *Carcharodon carcharias* and OBIS reports the same species under an older synonym, both will resolve to the same WoRMS AphiaID (105838). Without WoRMS resolution, you'd count them as separate species. Budget time for building a synonym resolution cache.

### Data freshness strategy

| Source | Update frequency | Re-query interval | Method |
|---|---|---|---|
| iNaturalist | Real-time | Weekly | Per-site API query |
| ALA | Weekly (iNat), variable (others) | Monthly | Per-site faceted search |
| OBIS | Quarterly | Quarterly | Per-site checklist query |
| FishBase | 2–4× per year | Bi-annually | Re-download parquet files |
| GBIF | Continuous, but lag varies | One-time bootstrap + annual refresh | Bulk download |

**Practical schedule for a solo developer**: Run iNaturalist weekly. Run ALA monthly (it updates its iNat mirror weekly, so monthly catches scientific data updates). Run OBIS quarterly (scientific survey datasets update infrequently). Re-download FishBase parquet files every 6 months for enrichment updates.

### What to implement first — ordered by coverage gain per effort

**Phase 1: ALA (1–2 weeks)**
Highest ROI. Single API with point-radius, faceted species counts, iNaturalist exclusion, and access to AIMS/CSIRO/museum data. Covers the primary gap (offshore scientific survey data). The faceted search endpoint is nearly a drop-in replacement for iNaturalist's `species_counts`.

**Phase 2: OBIS (1 week)**
Adds the dedicated marine checklist endpoint with WoRMS-validated taxonomy and record counts per species. Quick to implement. The main cost is building the WKT polygon helper since OBIS lacks point-radius. Adds coverage for scientific surveys that may not be in ALA.

**Phase 3: FishBase enrichment (1 week)**
Download parquet files, import to database, join on scientific name. Adds depth range, habitat type, maximum size, and common names to every species profile. Major UX improvement. Address the CC-BY-NC license issue.

**Phase 4: GBIF bulk download (2–3 days)**
Use the download API for a one-time bootstrap of all marine records in Australian waters (excluding iNaturalist). Process the CSV, load into database, then deduplicate against ALA/OBIS. Low ongoing maintenance — just re-download annually. Yields diminishing returns since most GBIF Australian data originates from ALA and OBIS.

**Phase 5 (optional): WoRMS API for taxonomy normalization**
`https://www.marinespecies.org/rest/` — resolve all species names to canonical AphiaIDs, fetch authoritative common names, and handle synonyms. Free, no auth required, essential for robust deduplication.

### Database schema sketch

```sql
CREATE TABLE species (
  id SERIAL PRIMARY KEY,
  scientific_name TEXT NOT NULL UNIQUE,
  common_name TEXT,
  worms_aphia_id INTEGER,
  taxon_id_ala TEXT,
  taxon_id_inat INTEGER,
  kingdom TEXT,
  phylum TEXT,
  class TEXT,
  "order" TEXT,
  family TEXT,
  genus TEXT,
  -- FishBase enrichment
  max_length_cm NUMERIC,
  depth_min_m INTEGER,
  depth_max_m INTEGER,
  depth_common_min_m INTEGER,
  depth_common_max_m INTEGER,
  habitat_type TEXT,         -- 'reef-associated', 'pelagic', 'demersal'
  iucn_category TEXT,
  vulnerability_score NUMERIC
);

CREATE TABLE location_species (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id),
  species_id INTEGER REFERENCES species(id),
  confidence NUMERIC,        -- 0-1 composite score
  total_observations INTEGER,
  last_observed DATE,
  UNIQUE(location_id, species_id)
);

CREATE TABLE source_records (
  id SERIAL PRIMARY KEY,
  location_species_id INTEGER REFERENCES location_species(id),
  source TEXT NOT NULL,       -- 'inaturalist', 'ala', 'obis', 'gbif'
  source_dataset TEXT,        -- e.g. 'AIMS LTMP', 'CSIRO ANFC'
  observation_count INTEGER,
  basis_of_record TEXT,
  license TEXT,
  last_queried TIMESTAMP,
  raw_response JSONB          -- store raw for debugging
);
```

### Key architectural decisions

**Query at ingest time, not at request time.** Don't hit external APIs when a user loads a dive site page. Pre-query all sources for each location on a schedule, store results in your database, and serve from cache. External APIs are too slow and rate-limited for real-time use.

**Store source attribution per record.** Different sources carry different licenses. You need to track which data came from where to display correct attribution and respect CC-BY-NC restrictions.

**Normalize taxonomy once, match everywhere.** Build a WoRMS AphiaID lookup cache. When any source returns a species, resolve it to a canonical AphiaID before deduplication. This handles the three different taxonomic backbones (iNat, ALA NSL, WoRMS/OBIS) gracefully.

**Use ALA's `disableQualityFilter=spatial-suspect` for all marine queries.** Without this, legitimate coastal and marine records get silently dropped due to coastline layer misalignment. This is the single most impactful configuration detail for marine data quality.

## Conclusion

The multi-source approach fills iNaturalist's coverage gaps through complementary data. **ALA is the clear first integration** — it wraps AIMS reef monitoring, CSIRO deep-water surveys, and museum collections behind a single API with spatial queries and built-in iNaturalist deduplication. OBIS adds purpose-built marine functionality with its checklist endpoint and WoRMS-validated taxonomy. Together, ALA and OBIS will surface species at remote reefs and offshore sites that no amount of iNaturalist queries would uncover.

The critical technical insight is that **taxonomy normalization is the hardest problem**, not API integration. Four sources use three different taxonomic backbones, and the same species can appear under different accepted names. Investing in a WoRMS AphiaID resolution cache early will prevent compounding data quality issues as you add sources. The second insight is that **GBIF is best treated as a bulk bootstrapping tool** rather than an ongoing query source — its data for Australia largely originates from ALA and OBIS anyway, so querying all three creates triple-counting, not triple-coverage. Use GBIF's download API once, then maintain freshness through ALA and OBIS.