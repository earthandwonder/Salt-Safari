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
  matchScore: number;
  matchLabel: "Confirmed" | "Likely" | "Possible";
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawLocation = searchParams.get("location"); // location slug
  const location = rawLocation === "__all__" ? null : rawLocation;
  const monthParam = searchParams.get("month"); // 0-11
  const size = searchParams.get("size");
  const coloursParam = searchParams.get("colours"); // comma-separated
  const habitatParam = searchParams.get("habitat");

  const month = monthParam !== null ? parseInt(monthParam, 10) : null;
  const colours = coloursParam ? coloursParam.split(",").filter(Boolean) : [];
  const habitat = habitatParam || null;

  const supabase = await createClient();

  // Build the base species query
  // If a location is selected, filter to species at that location
  let speciesIds: string[] | null = null;

  if (location) {
    // First get the location ID from slug
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", location)
      .eq("published", true)
      .single();

    if (loc) {
      // Get all species IDs at this location
      const allSpeciesIds: string[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: locSpecies } = await supabase
          .from("location_species")
          .select("species_id")
          .eq("location_id", loc.id)
          .range(from, from + batchSize - 1);

        if (locSpecies && locSpecies.length > 0) {
          allSpeciesIds.push(...locSpecies.map((ls) => ls.species_id));
          hasMore = locSpecies.length === batchSize;
          from += batchSize;
        } else {
          hasMore = false;
        }
      }
      speciesIds = allSpeciesIds;
    }
  }

  // If month filter is set AND a location is provided, get species active that month
  let seasonalSpeciesIds: Set<string> | null = null;

  if (month !== null && month >= 0 && month <= 11 && location) {
    // Get the location first
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", location)
      .eq("published", true)
      .single();

    if (loc) {
      // Seasonality month is 1-12, input month is 0-11
      const dbMonth = month + 1;

      // Get location_species IDs for this location
      const lsIds: string[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: ls } = await supabase
          .from("location_species")
          .select("id, species_id")
          .eq("location_id", loc.id)
          .range(from, from + batchSize - 1);

        if (ls && ls.length > 0) {
          lsIds.push(...ls.map((l) => `${l.id}|${l.species_id}`));
          hasMore = ls.length === batchSize;
          from += batchSize;
        } else {
          hasMore = false;
        }
      }

      // Batch query seasonality
      const lsIdList = lsIds.map((l) => l.split("|")[0]);
      seasonalSpeciesIds = new Set<string>();

      for (let i = 0; i < lsIdList.length; i += 200) {
        const batch = lsIdList.slice(i, i + 200);
        const { data: seasonality } = await supabase
          .from("species_seasonality")
          .select("location_species_id, likelihood")
          .in("location_species_id", batch)
          .eq("month", dbMonth)
          .in("likelihood", ["common", "occasional"]);

        if (seasonality) {
          for (const s of seasonality) {
            const match = lsIds.find((l) => l.startsWith(s.location_species_id));
            if (match) {
              seasonalSpeciesIds.add(match.split("|")[1]);
            }
          }
        }
      }
    }
  }

  // Now fetch all published species (or filtered set)
  const allSpecies: Array<{
    id: string;
    slug: string;
    name: string;
    scientific_name: string | null;
    hero_image_url: string | null;
    size_category: string | null;
    colours: string[];
    habitat: string[];
    confidence: number | null;
  }> = [];

  // If we have speciesIds from location filter, use them; otherwise fetch all published
  if (speciesIds !== null) {
    // Batch fetch species by IDs
    for (let i = 0; i < speciesIds.length; i += 200) {
      const batch = speciesIds.slice(i, i + 200);
      const { data } = await supabase
        .from("species")
        .select("id, slug, name, scientific_name, hero_image_url, size_category, colours, habitat")
        .in("id", batch)
        .eq("published", true);

      if (data) allSpecies.push(...data.map((d) => ({ ...d, confidence: null })));
    }

    // Get confidence scores from location_species
    if (speciesIds.length > 0) {
      const { data: loc } = await supabase
        .from("locations")
        .select("id")
        .eq("slug", location!)
        .single();

      if (loc) {
        for (let i = 0; i < speciesIds.length; i += 200) {
          const batch = speciesIds.slice(i, i + 200);
          const { data: ls } = await supabase
            .from("location_species")
            .select("species_id, confidence")
            .eq("location_id", loc.id)
            .in("species_id", batch);

          if (ls) {
            for (const l of ls) {
              const sp = allSpecies.find((s) => s.id === l.species_id);
              if (sp) sp.confidence = l.confidence;
            }
          }
        }
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
        .select("id, slug, name, scientific_name, hero_image_url, size_category, colours, habitat")
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

  // Score each species based on matching criteria
  const scored: MatchedSpecies[] = [];

  for (const sp of allSpecies) {
    let matchCount = 0;
    let totalCriteria = 0;

    // Size match
    if (size) {
      totalCriteria++;
      if (sp.size_category === size) {
        matchCount++;
      }
    }

    // Colour match (any overlap)
    if (colours.length > 0) {
      totalCriteria++;
      if (sp.colours && sp.colours.length > 0) {
        const overlap = colours.filter((c) => sp.colours.includes(c));
        if (overlap.length > 0) {
          matchCount++;
        }
      }
    }

    // Habitat match
    if (habitat) {
      totalCriteria++;
      if (sp.habitat && sp.habitat.includes(habitat)) {
        matchCount++;
      }
    }

    // Seasonality match
    if (seasonalSpeciesIds !== null) {
      totalCriteria++;
      if (seasonalSpeciesIds.has(sp.id)) {
        matchCount++;
      }
    }

    // Species with missing enrichment data: don't penalize them
    // Treat missing values as "no match" for that criterion (per spec)
    // But still include them if they match other criteria

    // Must match at least 1 criterion (or have no criteria to match)
    if (totalCriteria === 0 || matchCount > 0) {
      // Calculate score: match ratio + confidence boost
      const matchRatio = totalCriteria > 0 ? matchCount / totalCriteria : 0.5;
      const confidenceBoost = sp.confidence ? sp.confidence * 0.1 : 0;
      const score = matchRatio + confidenceBoost;

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
        matchScore: score,
        matchLabel,
      });
    }
  }

  // Sort by match score descending, then confidence
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // Limit to top 50 results
  const results = scored.slice(0, 50);

  return NextResponse.json({ results, total: scored.length });
}
