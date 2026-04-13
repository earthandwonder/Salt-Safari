// Session 6: Validate pipeline output and publish Cabbage Tree Bay
// Usage: npm run validate -- --location cabbage-tree-bay
//        npm run validate -- --location cabbage-tree-bay --publish

import { createClient } from "@supabase/supabase-js";

async function main() {
  const args = process.argv.slice(2);
  const locationIdx = args.indexOf("--location");
  if (locationIdx === -1 || !args[locationIdx + 1]) {
    console.error("Usage: npm run validate -- --location <slug> [--publish]");
    process.exit(1);
  }
  const locationSlug = args[locationIdx + 1];
  const shouldPublish = args.includes("--publish");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // === Fetch location ===
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, name, slug, region_id, last_synced_at, data_quality")
    .eq("slug", locationSlug)
    .single();

  if (locError || !location) {
    console.error("Location not found:", locError?.message);
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`VALIDATION REPORT: ${location.name}`);
  console.log(`${"=".repeat(60)}\n`);
  console.log(`Last synced: ${location.last_synced_at}`);
  console.log(`Data quality: ${location.data_quality}\n`);

  // === 1. Species count and breakdown ===
  console.log("--- SPECIES OVERVIEW ---");

  // Paginate location_species (Supabase default limit is 1000)
  const locationSpecies: Array<{ id: string; species_id: string; confidence: number; total_observations: number }> = [];
  let lsPage = 0;
  const lsPageSize = 1000;
  while (true) {
    const { data: page } = await supabase
      .from("location_species")
      .select("id, species_id, confidence, total_observations")
      .eq("location_id", location.id)
      .range(lsPage * lsPageSize, (lsPage + 1) * lsPageSize - 1);
    if (!page || page.length === 0) break;
    locationSpecies.push(...page);
    if (page.length < lsPageSize) break;
    lsPage++;
  }

  if (locationSpecies.length === 0) {
    console.error("No location_species found");
    process.exit(1);
  }

  console.log(`Total species at location: ${locationSpecies.length}`);

  const speciesIds = locationSpecies.map((ls) => ls.species_id);

  // Fetch species in batches of 200 (Supabase .in() limit)
  type SpeciesRow = { id: string; name: string; scientific_name: string; slug: string; worms_aphia_id: number | null; kingdom: string | null; phylum: string | null; class: string | null; order: string | null; family: string | null; data_quality: string; hero_image_url: string | null; inat_taxon_id: number | null };
  const allSpecies: SpeciesRow[] = [];
  for (let i = 0; i < speciesIds.length; i += 200) {
    const batch = speciesIds.slice(i, i + 200);
    const { data } = await supabase
      .from("species")
      .select("id, name, scientific_name, slug, worms_aphia_id, kingdom, phylum, class, order, family, data_quality, hero_image_url, inat_taxon_id")
      .in("id", batch);
    if (data) allSpecies.push(...(data as SpeciesRow[]));
  }

  if (allSpecies.length === 0) {
    console.error("Failed to fetch species");
    process.exit(1);
  }

  // Data quality breakdown
  const qualityCounts = { stub: 0, partial: 0, complete: 0 };
  for (const sp of allSpecies) {
    const q = sp.data_quality as keyof typeof qualityCounts;
    if (q in qualityCounts) qualityCounts[q]++;
  }
  console.log(`Data quality: stub=${qualityCounts.stub}, partial=${qualityCounts.partial}, complete=${qualityCounts.complete}`);

  // WoRMS resolution
  const withAphia = allSpecies.filter((s) => s.worms_aphia_id).length;
  const withoutAphia = allSpecies.filter((s) => !s.worms_aphia_id).length;
  console.log(`WoRMS resolved: ${withAphia} (${((withAphia / allSpecies.length) * 100).toFixed(1)}%)`);
  console.log(`WoRMS unresolved: ${withoutAphia}`);

  if (withoutAphia > 0) {
    console.log("\nUnresolved species (no WoRMS AphiaID):");
    for (const sp of allSpecies.filter((s) => !s.worms_aphia_id)) {
      console.log(`  - ${sp.scientific_name} (${sp.name})`);
    }
  }

  // === 2. Phylum breakdown ===
  console.log("\n--- PHYLUM BREAKDOWN ---");
  const phylumCounts: Record<string, number> = {};
  for (const sp of allSpecies) {
    const phylum = sp.phylum || "Unknown";
    phylumCounts[phylum] = (phylumCounts[phylum] || 0) + 1;
  }
  const sortedPhyla = Object.entries(phylumCounts).sort((a, b) => b[1] - a[1]);
  for (const [phylum, count] of sortedPhyla) {
    console.log(`  ${phylum}: ${count}`);
  }

  // === 3. Check for charismatic species ===
  console.log("\n--- CHARISMATIC SPECIES CHECK ---");
  const mustHave = [
    "Eastern Blue Groper",
    "Weedy Seadragon",
    "Port Jackson Shark",
    "Spotted Wobbegong",
    "Australian Giant Cuttlefish",
    "Blue-ringed Octopus",
  ];
  for (const name of mustHave) {
    const found = allSpecies.find(
      (s) => s.name?.toLowerCase().includes(name.toLowerCase()) ||
             s.scientific_name?.toLowerCase().includes(name.toLowerCase())
    );
    const ls = found ? locationSpecies.find((l) => l.species_id === found.id) : null;
    console.log(`  ${found ? "✓" : "✗"} ${name}${ls ? ` (confidence=${ls.confidence}, obs=${ls.total_observations})` : ""}`);
  }

  // === 4. Confidence distribution ===
  console.log("\n--- CONFIDENCE DISTRIBUTION ---");
  const confBuckets = { high: 0, medium: 0, low: 0, veryLow: 0 };
  for (const ls of locationSpecies) {
    if (ls.confidence >= 0.6) confBuckets.high++;
    else if (ls.confidence >= 0.4) confBuckets.medium++;
    else if (ls.confidence >= 0.2) confBuckets.low++;
    else confBuckets.veryLow++;
  }
  console.log(`  High (≥0.6): ${confBuckets.high}`);
  console.log(`  Medium (0.4-0.6): ${confBuckets.medium}`);
  console.log(`  Low (0.2-0.4): ${confBuckets.low}`);
  console.log(`  Very Low (<0.2): ${confBuckets.veryLow}`);

  // Top 15 by confidence
  console.log("\nTop 15 species by confidence:");
  const lsMap = new Map(locationSpecies.map((ls) => [ls.species_id, ls]));
  const ranked = allSpecies
    .map((sp) => ({ ...sp, ls: lsMap.get(sp.id) }))
    .filter((sp) => sp.ls)
    .sort((a, b) => (b.ls!.confidence - a.ls!.confidence))
    .slice(0, 15);

  for (const sp of ranked) {
    console.log(`  ${sp.ls!.confidence.toFixed(3)} | ${sp.name} (${sp.scientific_name}) | obs=${sp.ls!.total_observations}`);
  }

  // === 5. Multi-source corroboration ===
  console.log("\n--- SOURCE CORROBORATION ---");
  const lsIds = locationSpecies.map((ls) => ls.id);
  const sourceRecords: Array<{ location_species_id: string; source: string; observation_count: number }> = [];
  for (let i = 0; i < lsIds.length; i += 200) {
    const batch = lsIds.slice(i, i + 200);
    const { data } = await supabase
      .from("source_records")
      .select("location_species_id, source, observation_count")
      .in("location_species_id", batch);
    if (data) sourceRecords.push(...data);
  }

  if (sourceRecords.length > 0) {
    const sourcesBySpecies = new Map<string, string[]>();
    for (const sr of sourceRecords) {
      if (!sourcesBySpecies.has(sr.location_species_id)) {
        sourcesBySpecies.set(sr.location_species_id, []);
      }
      sourcesBySpecies.get(sr.location_species_id)!.push(sr.source);
    }

    let three = 0, two = 0, one = 0;
    for (const [, sources] of sourcesBySpecies) {
      const unique = new Set(sources).size;
      if (unique >= 3) three++;
      else if (unique === 2) two++;
      else one++;
    }
    console.log(`  3+ sources: ${three}`);
    console.log(`  2 sources: ${two}`);
    console.log(`  1 source: ${one}`);

    // Source totals
    const sourceTotals: Record<string, number> = {};
    for (const sr of sourceRecords) {
      sourceTotals[sr.source] = (sourceTotals[sr.source] || 0) + 1;
    }
    console.log("\n  Species per source:");
    for (const [src, count] of Object.entries(sourceTotals)) {
      console.log(`    ${src}: ${count}`);
    }
  }

  // === 6. Seasonality check ===
  console.log("\n--- SEASONALITY ---");
  const seasonalityRecords: Array<{ location_species_id: string; month: number; likelihood: string; raw_observation_count: number }> = [];
  for (let i = 0; i < lsIds.length; i += 200) {
    const batch = lsIds.slice(i, i + 200);
    const { data } = await supabase
      .from("species_seasonality")
      .select("location_species_id, month, likelihood, raw_observation_count")
      .in("location_species_id", batch);
    if (data) seasonalityRecords.push(...data);
  }

  if (seasonalityRecords.length > 0) {
    const speciesWithSeasonality = new Set(seasonalityRecords.map((s) => s.location_species_id)).size;
    console.log(`Species with seasonality data: ${speciesWithSeasonality}`);

    // Check Port Jackson Shark seasonality (should peak May-October)
    const pjs = allSpecies.find((s) => s.scientific_name?.toLowerCase().includes("heterodontus portusjacksoni"));
    if (pjs) {
      const pjsLs = locationSpecies.find((ls) => ls.species_id === pjs.id);
      if (pjsLs) {
        const pjsSeas = seasonalityRecords
          .filter((s) => s.location_species_id === pjsLs.id)
          .sort((a, b) => a.month - b.month);
        if (pjsSeas.length > 0) {
          console.log(`\nPort Jackson Shark seasonality (expect winter peak May-Oct):`);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          for (const m of pjsSeas) {
            const bar = "█".repeat(Math.min(50, m.raw_observation_count));
            console.log(`  ${monthNames[m.month - 1]}: ${bar} ${m.raw_observation_count} (${m.likelihood})`);
          }
        }
      }
    }

    // Check Weedy Seadragon
    const wsd = allSpecies.find((s) => s.scientific_name?.toLowerCase().includes("phyllopteryx"));
    if (wsd) {
      const wsdLs = locationSpecies.find((ls) => ls.species_id === wsd.id);
      if (wsdLs) {
        const wsdSeas = seasonalityRecords
          .filter((s) => s.location_species_id === wsdLs.id)
          .sort((a, b) => a.month - b.month);
        if (wsdSeas.length > 0) {
          console.log(`\nWeedy Seadragon seasonality:`);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          for (const m of wsdSeas) {
            const bar = "█".repeat(Math.min(50, m.raw_observation_count));
            console.log(`  ${monthNames[m.month - 1]}: ${bar} ${m.raw_observation_count} (${m.likelihood})`);
          }
        }
      }
    }
  }

  // === 7. Photo coverage ===
  console.log("\n--- PHOTO COVERAGE ---");
  const withHero = allSpecies.filter((s) => s.hero_image_url).length;
  const withoutHero = allSpecies.filter((s) => !s.hero_image_url).length;
  console.log(`Species with hero image: ${withHero} (${((withHero / allSpecies.length) * 100).toFixed(1)}%)`);
  console.log(`Species without hero image: ${withoutHero}`);

  const photoRecords: Array<{ id: string; source: string; species_id: string }> = [];
  for (let i = 0; i < speciesIds.length; i += 200) {
    const batch = speciesIds.slice(i, i + 200);
    const { data } = await supabase
      .from("photos")
      .select("id, source, species_id")
      .in("species_id", batch);
    if (data) photoRecords.push(...data);
  }

  if (photoRecords.length > 0 || true) {
    console.log(`Total photo records: ${photoRecords.length}`);
    const photoSources: Record<string, number> = {};
    for (const p of photoRecords) {
      photoSources[p.source] = (photoSources[p.source] || 0) + 1;
    }
    for (const [src, count] of Object.entries(photoSources)) {
      console.log(`  ${src}: ${count}`);
    }
  }

  // === 8. Potential issues ===
  console.log("\n--- POTENTIAL ISSUES ---");

  // Check for freshwater species
  const freshwaterKeywords = ["goldfish", "carassius", "trout", "salmo", "carp", "cyprinus"];
  const suspectFreshwater = allSpecies.filter((sp) =>
    freshwaterKeywords.some(
      (kw) => sp.scientific_name?.toLowerCase().includes(kw) || sp.name?.toLowerCase().includes(kw)
    )
  );
  if (suspectFreshwater.length > 0) {
    console.log(`Suspected freshwater species (${suspectFreshwater.length}):`);
    for (const sp of suspectFreshwater) {
      console.log(`  - ${sp.scientific_name} (${sp.name})`);
    }
  } else {
    console.log("No suspected freshwater species found ✓");
  }

  // Check for bird species that might not belong
  const birdCount = allSpecies.filter((sp) => sp.class === "Aves").length;
  console.log(`Seabird species: ${birdCount} (check if count seems reasonable)`);

  // Check for very low observation count species
  const veryLowObs = locationSpecies.filter((ls) => ls.total_observations <= 1).length;
  console.log(`Species with ≤1 observation: ${veryLowObs}`);

  // === PUBLISH ===
  if (shouldPublish) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("PUBLISHING...");
    console.log(`${"=".repeat(60)}\n`);

    // Publish region (uses boolean `published` column)
    const { error: regionError } = await supabase
      .from("regions")
      .update({ published: true })
      .eq("id", location.region_id);
    console.log(`Region: ${regionError ? "FAILED - " + regionError.message : "published ✓"}`);

    // Publish location (uses boolean `published` column)
    const { error: locationError } = await supabase
      .from("locations")
      .update({ published: true })
      .eq("id", location.id);
    console.log(`Location: ${locationError ? "FAILED - " + locationError.message : "published ✓"}`);

    // Publish all species at this location that have WoRMS AphiaID (batched)
    const publishableSpeciesIds = allSpecies
      .filter((s) => s.worms_aphia_id)
      .map((s) => s.id);

    let publishErrors = 0;
    for (let i = 0; i < publishableSpeciesIds.length; i += 200) {
      const batch = publishableSpeciesIds.slice(i, i + 200);
      const { error } = await supabase
        .from("species")
        .update({ published: true })
        .in("id", batch);
      if (error) publishErrors++;
    }
    console.log(`Species published: ${publishableSpeciesIds.length} ${publishErrors ? `(${publishErrors} batch errors)` : "✓"}`);

    // Stubs (no WoRMS AphiaID) remain unpublished
    const stubIds = allSpecies
      .filter((s) => !s.worms_aphia_id)
      .map((s) => s.id);
    if (stubIds.length > 0) {
      console.log(`Stub species left unpublished: ${stubIds.length}`);
    }

    // Update location data quality
    await supabase
      .from("locations")
      .update({ data_quality: "partial" })
      .eq("id", location.id);

    console.log("\nPublish complete!");
  } else {
    console.log(`\nTo publish, run: npm run validate -- --location ${locationSlug} --publish`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("VALIDATION COMPLETE");
  console.log(`${"=".repeat(60)}\n`);
}

main();
