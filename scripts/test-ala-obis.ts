// Test script for the ALA and OBIS pipeline modules
// Run: npx tsx scripts/test-ala-obis.ts

import { queryALASpecies } from "../src/lib/pipeline/ala";
import { queryOBISSpecies, pointToBBox } from "../src/lib/pipeline/obis";

async function main() {
  // Cabbage Tree Bay, Manly — the Session 1 seed location
  const location = { lat: -33.7983, lng: 151.2885, radiusKm: 1.5 };

  console.log("=== ALA + OBIS Pipeline Test ===");
  console.log(`Location: Cabbage Tree Bay (${location.lat}, ${location.lng}), radius ${location.radiusKm}km\n`);

  // Show the WKT bounding box that OBIS will use
  console.log(`OBIS WKT bbox: ${pointToBBox(location.lat, location.lng, location.radiusKm)}\n`);

  // --- ALA ---
  console.log("--- Querying ALA (marine fish, excluding iNat) ---\n");
  const alaResult = await queryALASpecies(location);

  console.log(`\nALA species found: ${alaResult.species.length}`);
  console.log(`ALA errors: ${alaResult.errors.length}`);

  if (alaResult.errors.length > 0) {
    for (const err of alaResult.errors) {
      console.log(`  - [${err.type}] ${err.message}`);
    }
  }

  // Show top 20 ALA species
  const alaSorted = [...alaResult.species].sort((a, b) => b.observationCount - a.observationCount);
  console.log("\nTop 20 ALA species:");
  for (const sp of alaSorted.slice(0, 20)) {
    console.log(
      `  ${sp.observationCount.toString().padStart(4)} obs — ${sp.scientificName}`
    );
  }

  // --- OBIS ---
  console.log("\n--- Querying OBIS (Animalia checklist) ---\n");
  const obisResult = await queryOBISSpecies(location);

  console.log(`\nOBIS species found: ${obisResult.species.length}`);
  console.log(`OBIS errors: ${obisResult.errors.length}`);

  if (obisResult.errors.length > 0) {
    for (const err of obisResult.errors) {
      console.log(`  - [${err.type}] ${err.message}`);
    }
  }

  // Show top 20 OBIS species
  const obisSorted = [...obisResult.species].sort((a, b) => b.observationCount - a.observationCount);
  console.log("\nTop 20 OBIS species:");
  for (const sp of obisSorted.slice(0, 20)) {
    const aphia = sp.wormsAphiaId ? ` [AphiaID ${sp.wormsAphiaId}]` : "";
    console.log(
      `  ${sp.observationCount.toString().padStart(4)} obs — ${sp.scientificName} (${sp.family ?? "?"})${aphia}`
    );
  }

  // Show OBIS taxonomy breakdown
  const phyla = new Map<string, number>();
  for (const sp of obisResult.species) {
    const p = sp.phylum ?? "Unknown";
    phyla.set(p, (phyla.get(p) ?? 0) + 1);
  }
  console.log("\nOBIS species by phylum:");
  for (const [phylum, count] of [...phyla.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)} — ${phylum}`);
  }

  // --- Summary ---
  console.log("\n--- Summary ---");
  console.log(`iNaturalist (Session 2): 691 species`);
  console.log(`ALA: ${alaResult.species.length} species`);
  console.log(`OBIS: ${obisResult.species.length} species`);

  // Check for overlap between ALA and OBIS by scientific name
  const alaNames = new Set(alaResult.species.map((s) => s.scientificName.toLowerCase()));
  const obisNames = new Set(obisResult.species.map((s) => s.scientificName.toLowerCase()));
  const overlap = [...alaNames].filter((n) => obisNames.has(n));
  console.log(`\nALA ∩ OBIS overlap: ${overlap.length} species`);
  console.log(`ALA-only: ${alaResult.species.length - overlap.length}`);
  console.log(`OBIS-only: ${obisResult.species.length - overlap.length}`);

  console.log("\n=== Test complete ===");
}

main().catch(console.error);
