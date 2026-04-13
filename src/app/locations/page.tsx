import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";

// ─── Types ───────────────────────────────────────────────────────
type RegionWithCounts = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_image_url: string | null;
  locationCount: number;
};

// ─── Data fetching ───────────────────────────────────────────────
async function getRegions(): Promise<RegionWithCounts[]> {
  const supabase = await createClient();

  const { data: regions } = await supabase
    .from("regions")
    .select("id, name, slug, description, hero_image_url")
    .eq("published", true)
    .order("name", { ascending: true });

  if (!regions || regions.length === 0) return [];

  // Fetch location counts per region
  const result: RegionWithCounts[] = [];
  for (const region of regions) {
    const { count } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("region_id", region.id)
      .eq("published", true);

    result.push({
      ...region,
      locationCount: count ?? 0,
    });
  }

  return result;
}

// ─── SEO ─────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Explore Regions — Snorkelling & Diving Spots in Australia",
  description:
    "Browse snorkelling and diving regions across Australia. Discover marine species, seasonal guides, and dive site information for every region.",
  openGraph: {
    title: "Explore Regions — Snorkelling & Diving Spots in Australia",
    description:
      "Browse snorkelling and diving regions across Australia. Discover marine species, seasonal guides, and dive site information.",
    type: "website",
  },
};

// ─── Page ────────────────────────────────────────────────────────
export default async function RegionsIndexPage() {
  const regions = await getRegions();

  return (
    <div className="min-h-screen bg-sand">
      <Header />

      {/* ══════════════════════════════════════════
          HERO
         ══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-deep">
        <div className="absolute inset-0 hero-gradient opacity-80">
          <div className="caustic-overlay" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-16 md:pt-36 md:pb-20">
          <p className="text-teal-300 font-body text-sm font-medium tracking-wide uppercase mb-3">
            Explore Australia
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.1]">
            Regions
          </h1>
          <p className="mt-4 text-white/70 text-base md:text-lg max-w-xl font-body leading-relaxed">
            Discover marine species at snorkelling and diving locations across Australia&apos;s coastline.
          </p>
        </div>
      </section>

      <WaveDivider fill="#FFFBF5" />

      {/* ══════════════════════════════════════════
          REGION CARDS
         ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        {regions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {regions.map((region) => (
              <Link
                key={region.id}
                href={`/locations/${region.slug}`}
                className="group block card-lift rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100"
              >
                {/* Hero image — 16:9 */}
                <div className="relative aspect-[16/9] overflow-hidden">
                  {region.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={region.hero_image_url}
                      alt={region.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full photo-placeholder-ocean" />
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                  {/* Region name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <h2 className="font-display text-xl md:text-2xl font-semibold text-white leading-tight">
                      {region.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/80 font-medium">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        {region.locationCount} {region.locationCount === 1 ? "location" : "locations"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {region.description && (
                  <div className="p-4 md:p-5">
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                      {region.description}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-deep mb-2">
              More regions coming soon
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              We&apos;re expanding our coverage across Australia. Check back soon for new snorkelling and diving regions.
            </p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
