// CLI runner for the Salt Safari species data pipeline
// Usage: npm run pipeline -- --location cabbage-tree-bay
//        npm run pipeline -- --location cabbage-tree-bay --photos
//        npm run pipeline -- --location cabbage-tree-bay --photos-only
//        npm run pipeline -- --location cabbage-tree-bay --photos-only --batch 100 --offset 200
//        npm run pipeline -- --location cabbage-tree-bay --photos-only --max-photos 3

import { createClient } from "@supabase/supabase-js";
import { runPipelineForLocation } from "../src/lib/pipeline/orchestrator";
import { runPhotoPipelineForLocation } from "../src/lib/pipeline/photos/index";

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const locationSlug = getArgValue(args, "--location");
  if (!locationSlug) {
    console.error("Usage: npm run pipeline -- --location <slug> [--photos] [--photos-only]");
    console.error("       npm run pipeline -- --location <slug> --photos-only --batch 100 --offset 0");
    console.error("       npm run pipeline -- --location <slug> --photos-only --max-photos 3");
    process.exit(1);
  }

  const runPhotos = args.includes("--photos") || args.includes("--photos-only");
  const photosOnly = args.includes("--photos-only");
  const batchSize = Number(getArgValue(args, "--batch") ?? "0");
  const batchOffset = Number(getArgValue(args, "--offset") ?? "0");
  const maxPhotos = Number(getArgValue(args, "--max-photos") ?? "1");

  // Validate env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  console.log(`[Runner] Starting pipeline for: ${locationSlug}`);
  console.log(`[Runner] Mode: ${photosOnly ? "photos-only" : runPhotos ? "species + photos" : "species only"}`);
  if (runPhotos) {
    console.log(`[Runner] Photos: max=${maxPhotos}/species, batch=${batchSize || "all"}, offset=${batchOffset}`);
  }
  console.log(`[Runner] Time: ${new Date().toISOString()}`);

  try {
    // Run species pipeline (unless --photos-only)
    if (!photosOnly) {
      await runPipelineForLocation(locationSlug, supabase);
    }

    // Run photo pipeline (if --photos or --photos-only)
    if (runPhotos) {
      await runPhotoPipelineForLocation(supabase, {
        locationSlug,
        maxPhotosPerSpecies: maxPhotos,
        batchSize: batchSize || undefined,
        batchOffset: batchOffset || undefined,
      });
    }
  } catch (err) {
    console.error("[Runner] Pipeline failed:", err);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Runner] Total time: ${elapsed}s`);
}

main();
