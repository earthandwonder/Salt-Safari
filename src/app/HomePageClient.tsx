"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { WaveDivider } from "@/components/WaveDivider";
import { Footer } from "@/components/Footer";

type InSeasonSpecies = {
  speciesId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
  locationName: string;
  regionSlug: string;
  siteSlug: string;
  isCharismatic: boolean;
  isSeasonal: boolean;
  activeMonths: number;
  monthRange: string;
};

type RegionWithCounts = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImageUrl: string | null;
  locationCount: number;
};

interface HomePageClientProps {
  speciesCount: number;
  locationCount: number;
  regionCount: number;
  inSeasonSpecies: InSeasonSpecies[];
  regions: RegionWithCounts[];
}

export function HomePageClient({
  speciesCount,
  locationCount,
  regionCount,
  inSeasonSpecies,
  regions,
}: HomePageClientProps) {
  return (
    <main>
      <Header />

      {/* ──────────────────────────────────────────
          HERO
          ────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex flex-col justify-end hero-gradient overflow-hidden">
        <div className="caustic-overlay" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-28 md:pb-32 pt-32">
          <p className="text-teal-400 font-display text-sm md:text-base tracking-widest uppercase mb-4 opacity-0 animate-fade-up">
            Snorkelling &amp; diving in Australia
          </p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-semibold leading-[1.05] tracking-tight mb-6 opacity-0 animate-fade-up stagger-1 text-balance">
            Discover what lives
            <br />
            beneath the surface
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-lg mb-10 opacity-0 animate-fade-up stagger-2">
            Find out which marine species you can see at every snorkelling and
            diving spot — and know what&apos;s in season right now.
          </p>

          {/* Search bar */}
          <div className="opacity-0 animate-fade-up stagger-3 max-w-xl">
            <Link
              href="/locations"
              className="relative block"
            >
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <div
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white/40 text-base cursor-pointer hover:bg-white/15 transition-colors"
              >
                Search locations or species...
              </div>
            </Link>
          </div>

          {/* Quick stats */}
          <div className="flex gap-8 mt-10 opacity-0 animate-fade-up stagger-4">
            <div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">
                {speciesCount.toLocaleString()}+
              </div>
              <div className="text-sm text-white/50 tracking-wide">
                Species
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">
                {locationCount}
              </div>
              <div className="text-sm text-white/50 tracking-wide">
                Locations
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">
                {regionCount}
              </div>
              <div className="text-sm text-white/50 tracking-wide">
                {regionCount === 1 ? "Region" : "Regions"}
              </div>
            </div>
          </div>
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* ──────────────────────────────────────────
          IN SEASON NOW
          ────────────────────────────────────────── */}
      {inSeasonSpecies.length > 0 && (
        <section className="bg-sand section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="season-dot" />
                  <span className="text-emerald-600 text-sm font-medium tracking-wide uppercase">
                    In Season Now
                  </span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight">
                  Commonly spotted this month
                </h2>
              </div>
              <Link
                href="/alerts"
                className="hidden sm:flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Get alerts
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Horizontal scroll on mobile, grid on desktop */}
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible">
              {inSeasonSpecies.map((item) => (
                <Link
                  key={item.speciesId}
                  href={`/species/${item.slug}`}
                  className="flex-shrink-0 w-[200px] md:w-auto group"
                >
                  <div className="card-lift rounded-2xl overflow-hidden bg-white shadow-sm">
                    {/* Photo */}
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {item.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.heroImageUrl}
                          alt={item.commonName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full photo-placeholder-species" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                      {/* Season badge */}
                      {item.isSeasonal ? (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                          In season
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">
                          Year-round
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold text-deep group-hover:text-teal-700 transition-colors truncate">
                        {item.commonName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {item.locationName}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{item.monthRange}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Alert teaser */}
            <div className="mt-8 bg-deep/5 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-deep">
                  Know what&apos;s in the water before you get in
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Get monthly alerts when your favourite species come into season.
                </p>
              </div>
              <Link
                href="/alerts"
                className="bg-coral hover:bg-coral-dark text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              >
                Set up alerts
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────
          BROWSE BY REGION
          ────────────────────────────────────────── */}
      <section className="bg-white section-padding">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-3">
            Explore by region
          </h2>
          <p className="text-slate-500 mb-10 max-w-lg">
            Browse snorkelling and diving locations across Australia. Each spot
            includes species lists, access notes, and depth information.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {regions.slice(0, 6).map((region) => (
              <Link
                key={region.id}
                href={`/locations/${region.slug}`}
                className="group"
              >
                <div className="card-lift rounded-2xl overflow-hidden">
                  <div className="aspect-[16/9] md:aspect-[2/1] relative overflow-hidden">
                    {region.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={region.heroImageUrl}
                        alt={region.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-700 to-cyan-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-display text-2xl md:text-3xl font-semibold text-white">
                        {region.name}
                      </h3>
                      <p className="text-white/70 text-sm mt-1">
                        {region.locationCount} {region.locationCount === 1 ? "location" : "locations"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {regions.length > 6 && (
            <div className="mt-8 text-center">
              <Link
                href="/locations"
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                View all regions
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SPECIES ID TOOL PROMO
          ────────────────────────────────────────── */}
      <section className="bg-slate-50 section-padding overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Phone mockup */}
          <div className="relative flex justify-center">
            <div className="w-[280px] h-[560px] bg-deep rounded-[3rem] p-3 shadow-2xl shadow-deep/30 relative">
              <div className="w-full h-full bg-white rounded-[2.3rem] overflow-hidden flex flex-col">
                {/* Screen header */}
                <div className="bg-deep px-5 pt-10 pb-5">
                  <p className="text-teal-400 text-xs font-medium tracking-wider uppercase">
                    Step 3 of 5
                  </p>
                  <p className="text-white font-display text-lg font-semibold mt-1">
                    How big was it?
                  </p>
                  {/* Progress dots */}
                  <div className="flex gap-1.5 mt-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i <= 2 ? "bg-teal-400" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Size options */}
                <div className="flex-1 p-4 space-y-2.5">
                  {[
                    { label: "Tiny", desc: "Shrimp / nudibranch", size: "text-lg" },
                    { label: "Small", desc: "Hand-sized", size: "text-xl" },
                    {
                      label: "Medium",
                      desc: "Forearm length",
                      size: "text-2xl",
                      selected: true,
                    },
                    { label: "Large", desc: "Arm length", size: "text-3xl" },
                    { label: "Very large", desc: "Body+", size: "text-4xl" },
                  ].map((opt) => (
                    <div
                      key={opt.label}
                      className={`rounded-xl px-4 py-2.5 border-2 transition-colors ${
                        opt.selected
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`font-medium text-sm ${
                              opt.selected ? "text-teal-700" : "text-slate-700"
                            }`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-xs text-slate-400">{opt.desc}</p>
                        </div>
                        {/* Fish silhouette scaled */}
                        <svg
                          className={`${opt.size} text-slate-300`}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="1em"
                          height="1em"
                        >
                          <ellipse cx="10" cy="12" rx="8" ry="5" />
                          <polygon points="18,12 24,7 24,17" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="text-teal-600 text-sm font-medium tracking-wider uppercase mb-3">
              Free to use
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-4 text-balance">
              Saw something underwater?
            </h2>
            <p className="text-slate-500 text-lg mb-6 leading-relaxed">
              Use our Species ID tool to figure out what you saw. Answer five
              simple questions — where, when, size, colour, habitat — and
              we&apos;ll show you the most likely matches.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Works for snorkellers, not just divers",
                "No account needed — completely free",
                "Based on real observation data, not guesswork",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/id"
              className="inline-flex items-center gap-2 bg-deep hover:bg-deep-light text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Identify a species
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          PREMIUM — KNOW THE OCEAN (one-off A$9.99)
          ────────────────────────────────────────── */}
      <section className="relative bg-deep overflow-hidden">
        <div className="caustic-overlay opacity-40" />
        <div className="relative z-10 section-padding">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-teal-400 text-sm font-medium tracking-widest uppercase mb-4">
              Unlock Premium
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4 text-balance">
              Know the Ocean
            </h2>
            <p className="text-lg text-white/60 mb-12 max-w-xl mx-auto">
              Get personalised &ldquo;In Season Now&rdquo; alerts and unlock the
              full story behind every species.
            </p>

            {/* Feature cards */}
            <div className="grid sm:grid-cols-2 gap-6 mb-12 text-left">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  In Season Now Alerts
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Monthly email alerts telling you which species are being commonly
                  spotted at your favourite locations right now.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  Species Deep Dives
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  The full story behind every species — behaviour, fun facts, ID
                  tips, and why they matter. Be the interesting person in your
                  group.
                </p>
              </div>
            </div>

            {/* One-off pricing */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative bg-teal-500/20 backdrop-blur-sm border border-teal-400/30 rounded-2xl px-10 py-6 text-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  One-off purchase
                </span>
                <p className="text-teal-300 text-sm mb-1">Lifetime access</p>
                <p className="font-display text-4xl font-bold text-white">
                  A$9.99
                </p>
                <p className="text-white/40 text-sm mt-1">
                  No subscription. Pay once, keep forever.
                </p>
              </div>
            </div>

            <Link
              href="/premium"
              className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-8 py-3.5 rounded-full font-semibold text-lg transition-colors"
            >
              Unlock Premium — A$9.99
            </Link>
            <p className="text-white/30 text-sm mt-4">
              Instant access. No recurring charges.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          FOOTER
          ────────────────────────────────────────── */}
      <Footer />
    </main>
  );
}
