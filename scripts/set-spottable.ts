// Sets is_spottable on location_species based on observation count + taxonomic filtering.
// Usage: npx tsx scripts/set-spottable.ts --location cabbage-tree-bay [--dry-run] [--max 200]
//
// Taxonomic rules:
//   EXCLUDED phyla — never spottable (algae, sponges, worms, bryozoans, etc.)
//   EXCLUDED class — Aves (birds)
//   MOLLUSCA — only cephalopods (octopus, cuttlefish, squid) and nudibranchs
//   CHARISMATIC taxa — spottable with ≥30 obs (sharks, rays, turtles, seahorses, cephalopods)
//   Everything else — spottable with ≥3 obs, up to a per-site cap
//
// The cap flexes per site: min(max, count of species passing filters).

import { createClient } from "@supabase/supabase-js";

// ─── Config ───────────────────────────────────────────────────

const EXCLUDED_PHYLA = new Set([
  "Rhodophyta",     // red algae
  "Chlorophyta",    // green algae
  "Ochrophyta",     // brown algae, kelp
  "Porifera",       // sponges
  "Bryozoa",        // bryozoans
  "Annelida",       // worms (polychaetes etc.)
  "Entoprocta",     // entoprocts
  "Sipuncula",      // peanut worms
  "Nemertea",       // ribbon worms
  "Platyhelminthes",// flatworms
  "Foraminifera",   // forams
  "Ciliophora",     // ciliates
  "Bacillariophyta",// diatoms
  "Myzozoa",        // dinoflagellates
  "Haptophyta",     // coccolith algae
  "Tracheophyta",   // seagrasses (plants)
]);

// Mollusca: only allow cephalopods and nudibranchs
const MOLLUSC_ALLOWED_CLASSES = new Set(["Cephalopoda"]);
const MOLLUSC_ALLOWED_ORDERS = new Set(["Nudibranchia", "Doridida"]);

// Charismatic taxa — guaranteed spottable if they meet the charismatic obs threshold
const CHARISMATIC_TAXA = [
  { field: "class", value: "Elasmobranchii" },   // sharks & rays
  { field: "class", value: "Chondrichthyes" },    // alt classification
  { field: "order", value: "Testudines" },         // turtles
  { field: "family", value: "Syngnathidae" },      // seahorses, pipefish
  { field: "order", value: "Octopoda" },           // octopus
  { field: "order", value: "Sepiida" },            // cuttlefish
  { field: "order", value: "Myopsida" },           // squid
  { field: "order", value: "Sepiolida" },          // bottletail squid
  { field: "order", value: "Cetacea" },            // whales, dolphins (classic taxonomy)
  { field: "order", value: "Cetartiodactyla" },    // whales, dolphins (modern taxonomy)
  { field: "order", value: "Pinnipedia" },         // seals
];

const DEFAULT_MAX = 200;
const MIN_OBS_CHARISMATIC = 30;
const MIN_OBS_REGULAR = 3;

// ─── Helpers ──────────────────────────────────────────────────

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

type TaxonomyFields = {
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  is_charismatic: boolean;
};

function isCharismatic(species: TaxonomyFields): boolean {
  if (species.is_charismatic) return true;
  for (const rule of CHARISMATIC_TAXA) {
    const value = species[rule.field as keyof TaxonomyFields];
    if (value && value === rule.value) return true;
  }
  return false;
}

function isEligible(species: TaxonomyFields): boolean {
  if (species.phylum && EXCLUDED_PHYLA.has(species.phylum)) return false;
  if (species.class === "Aves") return false;
  if (species.phylum === "Mollusca") {
    if (species.class && MOLLUSC_ALLOWED_CLASSES.has(species.class)) return true;
    if (species.order && MOLLUSC_ALLOWED_ORDERS.has(species.order)) return true;
    return false;
  }
  return true;
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const locationSlug = getArgValue(args, "--location");
  const dryRun = args.includes("--dry-run");
  const maxCap = Number(getArgValue(args, "--max") ?? DEFAULT_MAX);

  if (!locationSlug) {
    console.error("Usage: npx tsx scripts/set-spottable.ts --location <slug> [--dry-run] [--max 200]");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Find the location
  const { data: location, error: locErr } = await supabase
    .from("locations")
    .select("id, name, slug")
    .eq("slug", locationSlug)
    .single();

  if (locErr || !location) {
    console.error(`Location "${locationSlug}" not found:`, locErr?.message);
    process.exit(1);
  }

  console.log(`\n═══ Setting spottable species for: ${location.name} ═══\n`);

  // 2. Fetch all location_species with species taxonomy
  type SpeciesRow = {
    ls_id: string;
    species_id: string;
    name: string;
    scientific_name: string;
    total_observations: number;
    phylum: string | null;
    class: string | null;
    order: string | null;
    family: string | null;
    is_charismatic: boolean;
  };

  const allSpecies: SpeciesRow[] = [];
  let from = 0;
  const pageSize = 500;
  let hasMore = true;

  while (hasMore) {
    const { data: batch } = await supabase
      .from("location_species")
      .select("id, species_id, total_observations, species!inner(id, name, scientific_name, phylum, class, order, family, is_charismatic)")
      .eq("location_id", location.id)
      .range(from, from + pageSize - 1)
      .order("total_observations", { ascending: false });

    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      for (const row of batch) {
        const sp = row.species as unknown as {
          id: string;
          name: string;
          scientific_name: string;
          phylum: string | null;
          class: string | null;
          order: string | null;
          family: string | null;
          is_charismatic: boolean;
        };
        allSpecies.push({
          ls_id: row.id,
          species_id: sp.id,
          name: sp.name,
          scientific_name: sp.scientific_name,
          total_observations: row.total_observations,
          phylum: sp.phylum,
          class: sp.class,
          order: sp.order,
          family: sp.family,
          is_charismatic: sp.is_charismatic,
        });
      }
      from += pageSize;
      if (batch.length < pageSize) hasMore = false;
    }
  }

  console.log(`Total species at location: ${allSpecies.length}`);

  // 3. Apply eligibility filter
  const eligible = allSpecies.filter((sp) => isEligible(sp));
  console.log(`After filters (phyla, birds, molluscs): ${eligible.length} (removed ${allSpecies.length - eligible.length})`);

  // 4. Split into charismatic and regular, apply obs thresholds
  const charismaticSpecies = eligible
    .filter((sp) => isCharismatic(sp) && sp.total_observations >= MIN_OBS_CHARISMATIC)
    .sort((a, b) => b.total_observations - a.total_observations);

  const regularSpecies = eligible
    .filter((sp) => !isCharismatic(sp) && sp.total_observations >= MIN_OBS_REGULAR)
    .sort((a, b) => b.total_observations - a.total_observations);

  console.log(`Charismatic (≥${MIN_OBS_CHARISMATIC} obs): ${charismaticSpecies.length}`);
  console.log(`Regular with ≥${MIN_OBS_REGULAR} obs: ${regularSpecies.length}`);

  // 5. Cap regular species
  const regularSlots = Math.max(0, maxCap - charismaticSpecies.length);
  const regularSelected = regularSpecies.slice(0, regularSlots);

  // 6. Combine
  const spottableSpecies = [...charismaticSpecies, ...regularSelected];
  console.log(`\n══ Total spottable: ${spottableSpecies.length} ══`);

  if (regularSelected.length > 0) {
    const cutoff = regularSelected[regularSelected.length - 1];
    console.log(`Regular cutoff: ${cutoff.total_observations} obs (${cutoff.name})`);
  }

  // 7. Show observation count distribution
  if (spottableSpecies.length > 0) {
    const obs = spottableSpecies.map((s) => s.total_observations).sort((a, b) => b - a);
    console.log(`\n── Observation count distribution ──`);
    console.log(`  Highest: ${obs[0]}`);
    console.log(`  Median: ${obs[Math.floor(obs.length / 2)]}`);
    console.log(`  Lowest: ${obs[obs.length - 1]}`);

    const buckets = [
      { label: "100+", min: 100, max: Infinity },
      { label: "50-99", min: 50, max: 99 },
      { label: "20-49", min: 20, max: 49 },
      { label: "10-19", min: 10, max: 19 },
      { label: "3-9", min: 3, max: 9 },
    ];
    for (const bucket of buckets) {
      const count = obs.filter((o) => o >= bucket.min && o <= bucket.max).length;
      if (count > 0) console.log(`  ${bucket.label} obs: ${count} species`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] No changes written. Remove --dry-run to apply.`);
    return;
  }

  // 8. Write to database
  console.log(`\nWriting to database...`);

  // Reset all to false for this location
  const { error: resetErr } = await supabase
    .from("location_species")
    .update({ is_spottable: false })
    .eq("location_id", location.id);

  if (resetErr) {
    console.error("Failed to reset is_spottable:", resetErr.message);
    process.exit(1);
  }

  // Set spottable species
  const spottableIds = spottableSpecies.map((s) => s.ls_id);
  let updated = 0;
  for (let i = 0; i < spottableIds.length; i += 200) {
    const batch = spottableIds.slice(i, i + 200);
    const { error: updateErr, count } = await supabase
      .from("location_species")
      .update({ is_spottable: true })
      .in("id", batch);

    if (updateErr) {
      console.error(`Failed to update batch ${i}:`, updateErr.message);
    } else {
      updated += count ?? batch.length;
    }
  }

  console.log(`\nDone! Marked ${updated} species as spottable at ${location.name}.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
