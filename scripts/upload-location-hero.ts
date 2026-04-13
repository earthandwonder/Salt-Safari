/**
 * One-off script: Download a Wikimedia Commons image, upload to R2,
 * and set it as the hero image for a location.
 *
 * Usage: npx tsx scripts/upload-location-hero.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { uploadToR2 } from "../src/lib/pipeline/photos/r2";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
const envPath = resolve(import.meta.dirname ?? __dirname, "..", ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const WIKIMEDIA_THUMB_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Looking_over_Shelly_Beach_and_Cabbage_Tree_Bay_in_Sydney.jpg/1920px-Looking_over_Shelly_Beach_and_Cabbage_Tree_Bay_in_Sydney.jpg";

const LOCATION_SLUG = "cabbage-tree-bay";

const PHOTO_META = {
  photographer_name: "Hardlinerr",
  license: "CC BY-SA 4.0",
  license_url: "https://creativecommons.org/licenses/by-sa/4.0",
  source: "wikimedia" as const,
  source_url:
    "https://commons.wikimedia.org/wiki/File:Looking_over_Shelly_Beach_and_Cabbage_Tree_Bay_in_Sydney.jpg",
  alt_text:
    "Panoramic view looking over Shelly Beach and Cabbage Tree Bay in Manly, Sydney",
  date_accessed: new Date().toISOString().slice(0, 10),
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Find the location
  const { data: location, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("slug", LOCATION_SLUG)
    .single();

  if (locErr || !location) {
    throw new Error(`Location not found: ${LOCATION_SLUG} — ${locErr?.message}`);
  }

  console.log(`Found location: ${location.name} (${location.id})`);

  // 2. Download the image (1920px wide thumbnail)
  console.log("Downloading image from Wikimedia Commons...");
  const response = await fetch(WIKIMEDIA_THUMB_URL);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const imageBuffer = await response.arrayBuffer();
  console.log(`Downloaded ${(imageBuffer.byteLength / 1024).toFixed(0)} KB`);

  // 3. Upload to R2
  const storagePath = `locations/${LOCATION_SLUG}/hero.jpg`;
  console.log(`Uploading to R2: ${storagePath}`);
  const publicUrl = await uploadToR2(storagePath, imageBuffer, "image/jpeg");
  console.log(`Uploaded: ${publicUrl}`);

  // 4. Insert photo record
  const { data: photo, error: photoErr } = await supabase
    .from("photos")
    .insert({
      location_id: location.id,
      url: publicUrl,
      photographer_name: PHOTO_META.photographer_name,
      license: PHOTO_META.license,
      license_url: PHOTO_META.license_url,
      source: PHOTO_META.source,
      source_url: PHOTO_META.source_url,
      alt_text: PHOTO_META.alt_text,
      date_accessed: PHOTO_META.date_accessed,
      is_hero: true,
    })
    .select("id")
    .single();

  if (photoErr) {
    throw new Error(`Failed to insert photo: ${photoErr.message}`);
  }
  console.log(`Photo record created: ${photo.id}`);

  // 5. Update location hero_image_url
  const { error: updateErr } = await supabase
    .from("locations")
    .update({ hero_image_url: publicUrl })
    .eq("id", location.id);

  if (updateErr) {
    throw new Error(`Failed to update location: ${updateErr.message}`);
  }

  console.log(`✓ Set hero image for ${location.name}: ${publicUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
