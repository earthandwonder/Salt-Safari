import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MatchedSpecies = {
  id: string;
  slug: string;
  name: string;
  scientific_name: string | null;
  hero_image_url: string | null;
  size_category: string | null;
  colours: string[];
  habitat: string[];
  depth_zone: string | null;
  matchScore: number;
  matchLabel: "Confirmed" | "Likely" | "Possible";
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawLocation = searchParams.get("location"); // location slug
  const location = rawLocation === "__all__" ? null : rawLocation;
  const monthParam = searchParams.get("month"); // 0-11
  const depthParam = searchParams.get("depth"); // depth zone
  const size = searchParams.get("size");
  const coloursParam = searchParams.get("colours"); // comma-separated
  const habitatParam = searchParams.get("habitat");

  const month = monthParam !== null ? parseInt(monthParam, 10) : null;
  const depth = depthParam || null;
  const colours = coloursParam ? coloursParam.split(",").filter(Boolean) : [];
  const habitat = habitatParam || null;

  const supabase = await createClient();

  // Look up location once (reused for species IDs, seasonality, and confidence)
  let locationId: string | null = null;
  if (location) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", location)
      .eq("published", true)
      .single();
    locationId = loc?.id ?? null;
  }

  // Fetch location_species rows once (reused for species IDs, seasonality, and confidence)
  type LocSpeciesRow = { id: string; species_id: string; confidence: number | null };
  let locationSpeciesRows: LocSpeciesRow[] = [];

  if (locationId) {
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from("location_species")
        .select("id, species_id, confidence")
        .eq("location_id", locationId)
        .range(from, from + batchSize - 1);
      if (data && data.length > 0) {
        locationSpeciesRows.push(...data);
        hasMore = data.length === batchSize;
        from += batchSize;
      } else {
        hasMore = false;
      }
    }
  }

  const speciesIds: string[] | null = locationId
    ? locationSpeciesRows.map((ls) => ls.species_id)
    : null;

  // Seasonality: check which species are active in the given month
  let seasonalSpeciesIds: Set<string> | null = null;

  if (month !== null && month >= 0 && month <= 11 && locationId && locationSpeciesRows.length > 0) {
    const dbMonth = month + 1;
    const lsIdToSpeciesId = new Map(locationSpeciesRows.map((ls) => [ls.id, ls.species_id]));
    const lsIdList = locationSpeciesRows.map((ls) => ls.id);
    seasonalSpeciesIds = new Set<string>();

    // Parallel batch queries for seasonality
    const seasonBatches: string[][] = [];
    for (let i = 0; i < lsIdList.length; i += 200) {
      seasonBatches.push(lsIdList.slice(i, i + 200));
    }

    const seasonResults = await Promise.all(
      seasonBatches.map((batch) =>
        supabase
          .from("species_seasonality")
          .select("location_species_id, likelihood")
          .in("location_species_id", batch)
          .eq("month", dbMonth)
          .in("likelihood", ["common", "occasional"])
      )
    );

    for (const { data: seasonality } of seasonResults) {
      if (seasonality) {
        for (const s of seasonality) {
          const speciesId = lsIdToSpeciesId.get(s.location_species_id);
          if (speciesId) seasonalSpeciesIds.add(speciesId);
        }
      }
    }
  }

  // Fetch species records
  const allSpecies: Array<{
    id: string;
    slug: string;
    name: string;
    scientific_name: string | null;
    hero_image_url: string | null;
    size_category: string | null;
    colours: string[];
    habitat: string[];
    depth_zone: string | null;
    confidence: number | null;
  }> = [];

  if (speciesIds !== null) {
    // Parallel batch fetch species by IDs
    const speciesBatches: string[][] = [];
    for (let i = 0; i < speciesIds.length; i += 200) {
      speciesBatches.push(speciesIds.slice(i, i + 200));
    }

    const speciesResults = await Promise.all(
      speciesBatches.map((batch) =>
        supabase
          .from("species")
          .select("id, slug, name, scientific_name, hero_image_url, size_category, colours, habitat, depth_zone")
          .in("id", batch)
          .eq("published", true)
      )
    );

    // Build confidence map from the already-fetched locationSpeciesRows
    const confidenceMap = new Map(locationSpeciesRows.map((ls) => [ls.species_id, ls.confidence]));

    for (const { data } of speciesResults) {
      if (data) {
        allSpecies.push(...data.map((d) => ({ ...d, confidence: confidenceMap.get(d.id) ?? null })));
      }
    }
  } else {
    // Fetch all published species (no location filter)
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("species")
        .select("id, slug, name, scientific_name, hero_image_url, size_category, colours, habitat, depth_zone")
        .eq("published", true)
        .range(from, from + batchSize - 1);

      if (data && data.length > 0) {
        allSpecies.push(...data.map((d) => ({ ...d, confidence: null })));
        hasMore = data.length === batchSize;
        from += batchSize;
      } else {
        hasMore = false;
      }
    }
  }

  // Score each species using weighted criteria.
  // Colour and size are the most distinctive signals a user provides,
  // so they get higher weight than habitat/seasonality.
  const WEIGHT_SIZE = 3;
  const WEIGHT_COLOUR = 4;
  const WEIGHT_HABITAT = 1.5;
  const WEIGHT_DEPTH = 2;
  const WEIGHT_SEASON = 1.5;

  const scored: MatchedSpecies[] = [];

  for (const sp of allSpecies) {
    let weightedScore = 0;
    let totalWeight = 0;

    // Size match (weight 3)
    if (size) {
      totalWeight += WEIGHT_SIZE;
      if (sp.size_category === size) {
        weightedScore += WEIGHT_SIZE;
      }
    }

    // Colour match — proportional: matching 2/3 selected colours scores
    // higher than matching 1/3 (weight 4)
    if (colours.length > 0) {
      totalWeight += WEIGHT_COLOUR;
      if (sp.colours && sp.colours.length > 0) {
        const overlapCount = colours.filter((c) => sp.colours.includes(c)).length;
        if (overlapCount > 0) {
          weightedScore += WEIGHT_COLOUR * (overlapCount / colours.length);
        }
      }
    }

    // Habitat match (weight 1.5)
    if (habitat) {
      totalWeight += WEIGHT_HABITAT;
      if (sp.habitat && sp.habitat.includes(habitat)) {
        weightedScore += WEIGHT_HABITAT;
      }
    }

    // Depth zone match (weight 2)
    if (depth) {
      totalWeight += WEIGHT_DEPTH;
      if (sp.depth_zone === depth) {
        weightedScore += WEIGHT_DEPTH;
      }
    }

    // Seasonality match (weight 1.5)
    if (seasonalSpeciesIds !== null) {
      totalWeight += WEIGHT_SEASON;
      if (seasonalSpeciesIds.has(sp.id)) {
        weightedScore += WEIGHT_SEASON;
      }
    }

    // Must match at least 1 criterion (or have no criteria to match)
    if (totalWeight === 0 || weightedScore > 0) {
      const matchRatio = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
      // Reduced confidence boost (max 0.03 instead of 0.1) so it can't flip rankings
      const confidenceBoost = sp.confidence ? sp.confidence * 0.03 : 0;
      const score = matchRatio + confidenceBoost;

      // Count discrete matches for label thresholds
      let matchCount = 0;
      let totalCriteria = 0;
      if (size) { totalCriteria++; if (sp.size_category === size) matchCount++; }
      if (colours.length > 0) {
        totalCriteria++;
        if (sp.colours?.some((c) => colours.includes(c))) matchCount++;
      }
      if (habitat) { totalCriteria++; if (sp.habitat?.includes(habitat)) matchCount++; }
      if (depth) { totalCriteria++; if (sp.depth_zone === depth) matchCount++; }
      if (seasonalSpeciesIds !== null) { totalCriteria++; if (seasonalSpeciesIds.has(sp.id)) matchCount++; }

      let matchLabel: "Confirmed" | "Likely" | "Possible";
      if (matchCount === totalCriteria && totalCriteria >= 3) {
        matchLabel = "Confirmed";
      } else if (matchCount >= totalCriteria * 0.6) {
        matchLabel = "Likely";
      } else {
        matchLabel = "Possible";
      }

      scored.push({
        id: sp.id,
        slug: sp.slug,
        name: sp.name,
        scientific_name: sp.scientific_name,
        hero_image_url: sp.hero_image_url,
        size_category: sp.size_category,
        colours: sp.colours,
        habitat: sp.habitat,
        depth_zone: sp.depth_zone,
        matchScore: score,
        matchLabel,
      });
    }
  }

  // Sort by match score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // Limit to top 50 results
  const results = scored.slice(0, 50);

  return NextResponse.json({ results, total: scored.length }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
