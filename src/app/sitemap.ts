import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://saltsafari.com.au";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/species`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/locations`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/id`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/credits`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  // Published regions
  const { data: regions } = await supabase
    .from("regions")
    .select("slug, updated_at")
    .eq("published", true);

  const regionPages: MetadataRoute.Sitemap = (regions ?? []).map((r) => ({
    url: `${BASE_URL}/locations/${r.slug}`,
    lastModified: new Date(r.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Published locations (with region slugs)
  const { data: locations } = await supabase
    .from("locations")
    .select("slug, updated_at, regions!inner(slug)")
    .eq("published", true)
    .eq("regions.published", true);

  const locationPages: MetadataRoute.Sitemap = (locations ?? []).map((l) => {
    const regionSlug = (l.regions as unknown as { slug: string }).slug;
    return {
      url: `${BASE_URL}/locations/${regionSlug}/${l.slug}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  // Published species
  const { data: species } = await supabase
    .from("species")
    .select("slug, updated_at")
    .eq("published", true);

  const speciesPages: MetadataRoute.Sitemap = (species ?? []).map((s) => ({
    url: `${BASE_URL}/species/${s.slug}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...regionPages, ...locationPages, ...speciesPages];
}
