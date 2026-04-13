// Test script for the iNaturalist pipeline module
// Run: npx tsx scripts/test-inaturalist.ts

import {
  queryINaturalistSpecies,
  queryINaturalistSeasonality,
} from "../src/lib/pipeline/inaturalist";

async function main() {
  // Cabbage Tree Bay, Manly — the Session 1 seed location
  const location = { lat: -33.7983, lng: 151.2885, radiusKm: 1.5 };

  console.log("=== iNaturalist Pipeline Test ===");
  console.log(`Location: Cabbage Tree Bay (${location.lat}, ${location.lng}), radius ${location.radiusKm}km\n`);

  // 1. Query all species
  console.log("--- Querying species counts (4 taxon group calls) ---\n");
  const result = await queryINaturalistSpecies(location);

  console.log(`\nTotal species found: ${result.species.length}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Queried at: ${result.queriedAt}\n`);

  if (result.errors.length > 0) {
    console.log("Errors:");
    for (const err of result.errors) {
      console.log(`  - [${err.type}] ${err.message} (${err.url})`);
    }
    console.log();
  }

  // Show top 20 by observation count
  const sorted = [...result.species].sort((a, b) => b.observationCount - a.observationCount);
  console.log("Top 20 species by observation count:");
  for (const sp of sorted.slice(0, 20)) {
    console.log(
      `  ${sp.observationCount.toString().padStart(4)} obs — ${sp.commonName ?? "?"} (${sp.scientificName}) [taxon ${sp.inatTaxonId}]`
    );
  }

  // Show taxonomy breakdown
  const families = new Set(result.species.map((s) => s.family).filter(Boolean));
  console.log(`\nUnique families: ${families.size}`);

  // 2. Query seasonality for Weedy Seadragon (taxon_id=54536)
  console.log("\n--- Querying seasonality for Weedy Seadragon (taxon_id=54536) ---\n");
  const seasonality = await queryINaturalistSeasonality({
    ...location,
    taxonId: 54536,
  });

  if (seasonality.error) {
    console.log(`Error: ${seasonality.error.message}`);
  } else {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    console.log("Monthly observations:");
    for (const entry of seasonality.data) {
      const bar = "█".repeat(Math.min(entry.observationCount, 50));
      console.log(
        `  ${monthNames[entry.month - 1]}: ${entry.observationCount.toString().padStart(3)} ${bar}`
      );
    }
    const total = seasonality.data.reduce((sum, e) => sum + e.observationCount, 0);
    console.log(`  Total: ${total} observations`);
  }

  console.log("\n=== Test complete ===");
}

main().catch(console.error);
