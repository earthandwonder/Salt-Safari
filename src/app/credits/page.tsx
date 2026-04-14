import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Credits & Attribution",
  description:
    "Photo credits and attribution for all images used on Salt Safari. We respect and acknowledge every photographer and source.",
};

type CreditRow = {
  photographer_name: string;
  source: string;
  license: string;
  photo_count: number;
  website_url: string | null;
};

export default async function CreditsPage() {
  const supabase = await createClient();

  // Fetch photos grouped by photographer, with photographer details
  const { data: photos } = await supabase
    .from("photos")
    .select("photographer_name, photographer_id, source, license");

  // Fetch photographers for website URLs
  const { data: photographers } = await supabase
    .from("photographers")
    .select("id, name, website_url");

  const photographerMap = new Map<string, string | null>();
  for (const p of photographers ?? []) {
    photographerMap.set(p.id, p.website_url);
  }

  // Group by photographer + source + license
  const creditMap = new Map<string, CreditRow>();

  for (const photo of photos ?? []) {
    const key = `${photo.photographer_name}::${photo.source}::${photo.license}`;
    const existing = creditMap.get(key);

    if (existing) {
      existing.photo_count += 1;
    } else {
      creditMap.set(key, {
        photographer_name: photo.photographer_name,
        source: photo.source,
        license: photo.license,
        photo_count: 1,
        website_url: photo.photographer_id
          ? photographerMap.get(photo.photographer_id) ?? null
          : null,
      });
    }
  }

  const credits = [...creditMap.values()].sort((a, b) =>
    a.photographer_name.localeCompare(b.photographer_name)
  );

  const totalPhotos = credits.reduce((sum, c) => sum + c.photo_count, 0);

  const SOURCE_LABELS: Record<string, string> = {
    wikimedia: "Wikimedia Commons",
    flickr: "Flickr",
    inaturalist: "iNaturalist",
    csiro: "CSIRO",
    gbrmpa: "GBRMPA",
    partner: "Partner",
    commissioned: "Commissioned",
    community: "Community",
  };

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-sand pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-deep tracking-tight">
              Credits & Attribution
            </h1>
            <p className="mt-3 text-slate-500 text-lg max-w-2xl">
              Salt Safari wouldn&apos;t be possible without the photographers and open-data
              communities who share their work. Every photo on this site is properly
              licensed and attributed.
            </p>
            {totalPhotos > 0 && (
              <p className="mt-2 text-sm text-slate-400">
                {totalPhotos.toLocaleString()} photo{totalPhotos !== 1 ? "s" : ""} from{" "}
                {new Set(credits.map((c) => c.photographer_name)).size} contributor
                {new Set(credits.map((c) => c.photographer_name)).size !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </section>

        {/* Credits table */}
        <section className="bg-white">
          <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-4xl">
            {credits.length > 0 ? (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="px-4 py-3 font-semibold text-deep">Photographer</th>
                      <th className="px-4 py-3 font-semibold text-deep">Source</th>
                      <th className="px-4 py-3 font-semibold text-deep">License</th>
                      <th className="px-4 py-3 font-semibold text-deep text-right">Photos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map((credit, i) => (
                      <tr
                        key={`${credit.photographer_name}-${credit.source}-${credit.license}`}
                        className={i % 2 === 0 ? "bg-sand/50" : "bg-white"}
                      >
                        <td className="px-4 py-3 text-deep">
                          {credit.website_url ? (
                            <a
                              href={credit.website_url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-coral hover:text-coral/80 transition-colors underline underline-offset-2"
                            >
                              {credit.photographer_name}
                            </a>
                          ) : (
                            credit.photographer_name
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {SOURCE_LABELS[credit.source] ?? credit.source}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{credit.license}</td>
                        <td className="px-4 py-3 text-slate-600 text-right tabular-nums">
                          {credit.photo_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-12">
                No photo credits yet. Credits will appear here as photos are added to the site.
              </p>
            )}

            {/* Data attribution */}
            <div className="mt-12 pt-8 border-t border-slate-100">
              <h2 className="font-display text-xl font-semibold text-deep">
                Data Sources
              </h2>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Species occurrence data is sourced from multiple open-data platforms:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  <strong className="text-deep">iNaturalist</strong> — Community science
                  observations. Data licensed under CC BY-NC.
                </li>
                <li>
                  <strong className="text-deep">Atlas of Living Australia (ALA)</strong> —
                  Aggregated biodiversity data from AIMS, CSIRO, and museum collections.
                </li>
                <li>
                  <strong className="text-deep">OBIS</strong> — Ocean Biodiversity Information
                  System. Global marine species occurrence data.
                </li>
                <li>
                  <strong className="text-deep">WoRMS</strong> — World Register of Marine
                  Species. Taxonomy validation and canonical identifiers.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
