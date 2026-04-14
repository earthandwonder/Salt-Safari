// Enriches species records with DERIVED classifications from FishBase signals.
// We never store raw FishBase values — only our own categories/tags.
//
// Derived fields:
//   size_category  — tiny/small/medium/large/very_large (from max length signal)
//   habitat[]      — our tag vocabulary (from ecology booleans + DemersPelag)
//   depth_zone     — snorkel-friendly/shallow dive/deep dive (from depth range signal)
//   danger_note    — harmless/venomous/can bite or sting/poisonous if eaten
//   where_to_look  — human-readable spotting tip (from habitat + ecology signals)
//
// FishBase data is CC-BY-NC. All output is derived — no raw data is stored.
//
// Usage: npx tsx scripts/enrich-fishbase.ts [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { Database as DuckDB } from "duckdb-async";

// ─── Types ──────────────────────────────────────────────────

type FishBaseRow = {
  scientific_name: string;
  max_length_cm: number | null;
  depth_shallow: number | null;
  depth_deep: number | null;
  depth_common_shallow: number | null;
  depth_common_deep: number | null;
  demers_pelag: string | null;
  dangerous: string | null;
  // Ecology booleans (-1 = true, 0 = false in FishBase)
  coral_reefs: number | null;
  sea_grass_beds: number | null;
  rocky: number | null;
  hard_bottom: number | null;
  sand: number | null;
  soft_bottom: number | null;
  pelagic: number | null;
  crevices: number | null;
  macrophyte: number | null;
  intertidal: number | null;
  burrows: number | null;
  benthic: number | null;
  demersal: number | null;
  drop_offs: number | null;
};

type SizeCategory = "tiny" | "small" | "medium" | "large" | "very_large";
type DepthZone = "snorkel-friendly" | "shallow dive" | "deep dive";
type DangerNote = "harmless" | "venomous" | "can bite or sting" | "poisonous if eaten";

// ─── Derivation Functions ───────────────────────────────────

const fb = (v: number | null) => v === -1;

function deriveSizeCategory(maxLengthCm: number): SizeCategory {
  if (maxLengthCm < 5) return "tiny";
  if (maxLengthCm < 15) return "small";
  if (maxLengthCm < 40) return "medium";
  if (maxLengthCm < 100) return "large";
  return "very_large";
}

function deriveHabitatTags(row: FishBaseRow): string[] {
  const tags: string[] = [];

  if (fb(row.coral_reefs)) tags.push("reef");
  if (fb(row.sand) || fb(row.soft_bottom)) tags.push("sand");
  if (fb(row.pelagic)) tags.push("open_water");
  if (fb(row.crevices)) tags.push("crevice");
  if (fb(row.sea_grass_beds)) tags.push("seagrass");
  if (fb(row.rocky) || fb(row.hard_bottom)) tags.push("rocky_bottom");
  if (fb(row.macrophyte)) tags.push("kelp");
  if (fb(row.intertidal)) tags.push("surface");

  // Fall back to DemersPelag if ecology gave us nothing
  if (tags.length === 0 && row.demers_pelag) {
    const dp = row.demers_pelag.toLowerCase();
    if (dp === "reef-associated") tags.push("reef");
    else if (dp === "pelagic" || dp === "pelagic-neritic" || dp === "pelagic-oceanic") tags.push("open_water");
    else if (dp === "demersal" || dp === "bathydemersal") tags.push("rocky_bottom", "sand");
    else if (dp === "benthopelagic") tags.push("reef", "open_water");
    else if (dp === "bathypelagic") tags.push("open_water");
  }

  return [...new Set(tags)];
}

function deriveDepthZone(row: FishBaseRow): DepthZone | null {
  // Use common depth range if available, otherwise full range
  const shallow = row.depth_common_shallow ?? row.depth_shallow;
  if (shallow == null) return null;

  // Classification based on where the species is typically FOUND (shallowest common depth)
  // Snorkellers reach ~3-5m, shallow divers ~5-18m
  if (shallow <= 5) return "snorkel-friendly";
  if (shallow <= 18) return "shallow dive";
  return "deep dive";
}

function deriveDangerNote(dangerous: string | null): DangerNote | null {
  if (!dangerous) return null;
  const d = dangerous.toLowerCase();
  if (d === "harmless") return "harmless";
  if (d === "venomous") return "venomous";
  if (d === "traumatogenic") return "can bite or sting";
  if (d === "poisonous to eat" || d === "reports of ciguatera poisoning") return "poisonous if eaten";
  // "potential pest", "other" → skip
  return null;
}

function deriveWhereToLook(row: FishBaseRow): string | null {
  const hints: string[] = [];

  // Specific micro-habitats first (most useful for spotting)
  if (fb(row.crevices)) hints.push("hiding in crevices");
  if (fb(row.burrows)) hints.push("buried in sand");
  if (fb(row.sea_grass_beds)) hints.push("among seagrass");
  if (fb(row.macrophyte)) hints.push("around kelp");
  if (fb(row.coral_reefs) && !fb(row.crevices)) hints.push("on the reef");
  if (fb(row.drop_offs)) hints.push("near drop-offs");
  if (fb(row.pelagic)) hints.push("hovering mid-water");
  if (fb(row.intertidal)) hints.push("in rockpools and shallows");
  if ((fb(row.sand) || fb(row.soft_bottom)) && !fb(row.burrows)) hints.push("over sandy bottom");
  if ((fb(row.rocky) || fb(row.hard_bottom)) && !fb(row.coral_reefs)) hints.push("around rocky reef");
  if (fb(row.benthic) && hints.length === 0) hints.push("on the bottom");

  if (hints.length > 0) return hints.slice(0, 3).join("; ");

  // Fallback from DemersPelag
  if (row.demers_pelag) {
    const dp = row.demers_pelag.toLowerCase();
    if (dp === "reef-associated") return "on the reef";
    if (dp === "pelagic" || dp === "pelagic-neritic") return "in open water";
    if (dp === "pelagic-oceanic") return "in open ocean";
    if (dp === "demersal" || dp === "bathydemersal") return "near the bottom";
    if (dp === "benthopelagic") return "near the bottom and mid-water";
  }

  return null;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ─── Load FishBase data via DuckDB ─────────────────────────

  console.log("[FishBase] Loading parquet files...");
  const duckdb = await DuckDB.create(":memory:");

  const fishbaseRows = await duckdb.all(`
    SELECT
      CONCAT(s.Genus, ' ', s.Species) AS scientific_name,
      s.Length                         AS max_length_cm,
      s.DepthRangeShallow              AS depth_shallow,
      s.DepthRangeDeep                 AS depth_deep,
      s.DepthRangeComShallow           AS depth_common_shallow,
      s.DepthRangeComDeep              AS depth_common_deep,
      s.DemersPelag                    AS demers_pelag,
      s.Dangerous                      AS dangerous,
      e.CoralReefs                     AS coral_reefs,
      e.SeaGrassBeds                   AS sea_grass_beds,
      e.Rocky                          AS rocky,
      e.HardBottom                     AS hard_bottom,
      e.Sand                           AS sand,
      e.SoftBottom                     AS soft_bottom,
      e.Pelagic                        AS pelagic,
      e.Crevices                       AS crevices,
      e.Macrophyte                     AS macrophyte,
      e.Intertidal                     AS intertidal,
      e.Burrows                        AS burrows,
      e.Benthic                        AS benthic,
      e.Demersal                       AS demersal,
      e.DropOffs                       AS drop_offs
    FROM read_parquet('data/fishbase/species.parquet') s
    LEFT JOIN read_parquet('data/fishbase/ecology.parquet') e
      ON s.SpecCode = e.SpecCode
  `);

  console.log(`[FishBase] Loaded ${fishbaseRows.length} FishBase records`);

  const fishbaseLookup = new Map<string, FishBaseRow>();
  for (const row of fishbaseRows) {
    const typed = row as unknown as FishBaseRow;
    if (typed.scientific_name) {
      fishbaseLookup.set(typed.scientific_name.toLowerCase(), typed);
    }
  }
  console.log(`[FishBase] Unique species in lookup: ${fishbaseLookup.size}`);

  await duckdb.close();

  // ─── Fetch species from Supabase ───────────────────────────

  console.log("[FishBase] Fetching species from database...");
  const { data: speciesList, error } = await supabase
    .from("species")
    .select("id, scientific_name")
    .not("scientific_name", "is", null);

  if (error) {
    console.error("[FishBase] Failed to fetch species:", error.message);
    process.exit(1);
  }

  console.log(`[FishBase] Found ${speciesList.length} species with scientific names`);

  // ─── Match and derive ─────────────────────────────────────

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const species of speciesList) {
    const key = species.scientific_name?.toLowerCase();
    if (!key) continue;

    const row = fishbaseLookup.get(key);
    if (!row) {
      skipped++;
      continue;
    }
    matched++;

    // Build update payload — ONLY derived classifications
    const updates: Record<string, unknown> = {};

    if (row.max_length_cm != null) {
      updates.size_category = deriveSizeCategory(row.max_length_cm);
    }

    const habitatTags = deriveHabitatTags(row);
    if (habitatTags.length > 0) {
      updates.habitat = habitatTags;
    }

    const depthZone = deriveDepthZone(row);
    if (depthZone) {
      updates.depth_zone = depthZone;
    }

    const dangerNote = deriveDangerNote(row.dangerous);
    if (dangerNote) {
      updates.danger_note = dangerNote;
    }

    const whereToLook = deriveWhereToLook(row);
    if (whereToLook) {
      updates.where_to_look = whereToLook;
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] ${species.scientific_name}: ${JSON.stringify(updates)}`);
      updated++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("species")
      .update(updates)
      .eq("id", species.id);

    if (updateErr) {
      errors.push(`${species.scientific_name}: ${updateErr.message}`);
    } else {
      updated++;
    }
  }

  // ─── Report ────────────────────────────────────────────────

  console.log("\n[FishBase] ═══ Enrichment Summary ═══");
  console.log(`  Total species in DB:    ${speciesList.length}`);
  console.log(`  Matched in FishBase:    ${matched} (${((matched / speciesList.length) * 100).toFixed(1)}%)`);
  console.log(`  Updated:                ${updated}`);
  console.log(`  Skipped (no match):     ${skipped}`);
  console.log(`  Errors:                 ${errors.length}`);
  if (dryRun) console.log("  Mode:                   DRY RUN (no changes written)");

  if (errors.length > 0) {
    console.log("\n[FishBase] Errors:");
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

main().catch((err) => {
  console.error("[FishBase] Fatal error:", err);
  process.exit(1);
});
