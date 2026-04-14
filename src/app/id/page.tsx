import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import SpeciesIdWizard from "./SpeciesIdWizard";

export const revalidate = 3600;

async function fetchLocations() {
  const supabase = await createClient();

  const [{ data: locationsData }, { data: regionsData }] = await Promise.all([
    supabase
      .from("locations")
      .select("slug, name, region_id")
      .eq("published", true)
      .order("name"),
    supabase
      .from("regions")
      .select("id, name")
      .eq("published", true),
  ]);

  const regionMap = new Map(
    (regionsData ?? []).map((r) => [r.id, r.name])
  );

  return (locationsData ?? []).map((loc) => ({
    slug: loc.slug,
    name: loc.name,
    regionName: regionMap.get(loc.region_id) ?? "Unknown",
  }));
}

export default async function SpeciesIdPage() {
  const locations = await fetchLocations();
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <Header />
          <div className="bg-deep pt-20 pb-8 px-6">
            <div className="max-w-2xl mx-auto">
              <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </main>
      }
    >
      <SpeciesIdWizard locations={locations} />
    </Suspense>
  );
}
