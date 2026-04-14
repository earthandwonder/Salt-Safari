import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SpeciesResult {
  type: "species";
  slug: string;
  name: string;
  scientific_name: string | null;
  hero_image_url: string | null;
}

interface LocationResult {
  type: "location";
  slug: string;
  name: string;
  region_slug: string;
  region_name: string;
  hero_image_url: string | null;
}

type SearchResult = SpeciesResult | LocationResult;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  // Run FTS (prefix) and trigram (fuzzy) queries in parallel
  const [speciesFts, locationsFts, speciesTrgm, locationsTrgm] =
    await Promise.all([
      supabase.rpc("search_species_fts", { query: q }),
      supabase.rpc("search_locations_fts", { query: q }),
      supabase.rpc("search_species_trigram", { query: q }),
      supabase.rpc("search_locations_trigram", { query: q }),
    ]);

  // Merge results, dedup by slug — FTS results take priority
  const speciesMap = new Map<string, SpeciesResult>();
  const locationMap = new Map<string, LocationResult>();

  for (const s of speciesFts.data ?? []) {
    speciesMap.set(s.slug, {
      type: "species",
      slug: s.slug,
      name: s.name,
      scientific_name: s.scientific_name,
      hero_image_url: s.hero_image_url,
    });
  }

  for (const s of speciesTrgm.data ?? []) {
    if (!speciesMap.has(s.slug)) {
      speciesMap.set(s.slug, {
        type: "species",
        slug: s.slug,
        name: s.name,
        scientific_name: s.scientific_name,
        hero_image_url: s.hero_image_url,
      });
    }
  }

  for (const l of locationsFts.data ?? []) {
    locationMap.set(l.slug, {
      type: "location",
      slug: l.slug,
      name: l.name,
      region_slug: l.region_slug ?? "",
      region_name: l.region_name ?? "",
      hero_image_url: l.hero_image_url,
    });
  }

  for (const l of locationsTrgm.data ?? []) {
    if (!locationMap.has(l.slug)) {
      locationMap.set(l.slug, {
        type: "location",
        slug: l.slug,
        name: l.name,
        region_slug: l.region_slug ?? "",
        region_name: l.region_name ?? "",
        hero_image_url: l.hero_image_url,
      });
    }
  }

  const results: SearchResult[] = [
    ...Array.from(locationMap.values()).slice(0, 5),
    ...Array.from(speciesMap.values()).slice(0, 15),
  ];

  return NextResponse.json({ results });
}
