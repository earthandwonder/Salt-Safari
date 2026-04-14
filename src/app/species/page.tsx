import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SpeciesBrowseClient } from "./SpeciesBrowseClient";

export const revalidate = 3600; // revalidate every hour

export const metadata: Metadata = {
  title: "All Species",
  description:
    "Browse all marine species found at snorkelling and diving locations across Australia. Filter by size, colour, habitat, and more.",
  openGraph: {
    title: "All Species — Salt Safari",
    description:
      "Browse all marine species found at snorkelling and diving locations across Australia.",
  },
};

export default async function SpeciesBrowsePage() {
  const supabase = await createClient();

  const { data: allSpecies, count } = await supabase
    .from("species")
    .select(
      "slug, name, scientific_name, hero_image_url, size_category, colours, habitat, danger_note, family, phylum, class, order",
      { count: "exact" }
    )
    .eq("published", true)
    .order("name");

  const species = allSpecies ?? [];
  const totalCount = count ?? species.length;

  // Extract unique colours and habitats for filter options
  const colourSet = new Set<string>();
  const habitatSet = new Set<string>();

  for (const s of species) {
    for (const c of s.colours ?? []) colourSet.add(c);
    for (const h of s.habitat ?? []) habitatSet.add(h);
  }

  const availableColours = [...colourSet].sort();
  const availableHabitats = [...habitatSet].sort();

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All Species — Salt Safari",
    description:
      "Browse all marine species found at snorkelling and diving locations across Australia.",
    url: "https://saltsafari.com.au/species",
    numberOfItems: totalCount,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <SpeciesBrowseClient
          species={species}
          totalCount={totalCount}
          availableColours={availableColours}
          availableHabitats={availableHabitats}
        />
      </main>
      <Footer />
    </>
  );
}
