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
  isSeasonal: boolean;
  activeMonths: number;
  monthRange: string;
};

type CollectionPreviewSpecies = {
  id: string;
  commonName: string;
  heroImageUrl: string | null;
  revealed: boolean;
};

interface HomePageClientProps {
  speciesCount: number;
  spottableCount: number;
  inSeasonCount: number;
  inSeasonSpecies: InSeasonSpecies[];
  collectionPreviewSpecies: CollectionPreviewSpecies[];
}

export function HomePageClient({
  speciesCount,
  spottableCount,
  inSeasonCount,
  inSeasonSpecies,
  collectionPreviewSpecies,
}: HomePageClientProps) {
  return (
    <main>
      <Header />

      {/* ──────────────────────────────────────────
          HERO — The Wow Number
          ────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex flex-col justify-end hero-gradient overflow-hidden">
        <div className="caustic-overlay" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-28 md:pb-32 pt-32">
          <p className="text-teal-400 font-display text-sm md:text-base tracking-widest uppercase mb-4 opacity-0 animate-fade-up">
            Cabbage Tree Bay Aquatic Reserve
          </p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-semibold leading-[1.05] tracking-tight mb-6 opacity-0 animate-fade-up stagger-1 text-balance">
            {speciesCount.toLocaleString()}+ species
            <br />
            call this place home.
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-lg mb-10 opacity-0 animate-fade-up stagger-2">
            Your complete guide to every species at Sydney&apos;s best
            snorkelling spot. Know what you&apos;ll see. Track what
            you&apos;ve found.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-wrap gap-4 opacity-0 animate-fade-up stagger-3">
            <Link
              href="/locations/sydney/cabbage-tree-bay"
              className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-7 py-3.5 rounded-full font-semibold text-base transition-colors"
            >
              Explore the species
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
            <Link
              href="/id?location=cabbage-tree-bay"
              className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white px-7 py-3.5 rounded-full font-semibold text-base transition-colors hover:bg-white/5"
            >
              What did I just see?
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-10 opacity-0 animate-fade-up stagger-4">
            <div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">
                {speciesCount.toLocaleString()}+
              </div>
              <div className="text-sm text-white/50 tracking-wide">
                Species
              </div>
            </div>
            {inSeasonCount > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl md:text-3xl font-display font-bold text-white">
                    {inSeasonCount}
                  </div>
                  <span className="season-dot" />
                </div>
                <div className="text-sm text-white/50 tracking-wide">
                  In Season Now
                </div>
              </div>
            )}
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
                  Visiting this month? Look for these.
                </h2>
              </div>
              <Link
                href="/alerts"
                className="hidden sm:flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Get alerts
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
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
                      <p className="text-xs text-slate-400 mt-1">
                        {item.monthRange}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Alert teaser */}
            <div className="mt-8 bg-deep/5 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="font-display text-lg font-semibold text-deep">
                Got a species you&apos;re excited about? We&apos;ll tell you when they&apos;re in town
              </p>
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
          THE COLLECTION — "How many can you find?"
          ────────────────────────────────────────── */}
      <section className="bg-white section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-3">
              How many can you find?
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Every species you spot adds to your collection. Track your
              progress across visits. Share your best dives.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">
                <span className="text-deep font-display text-lg font-bold">
                  0
                </span>{" "}
                of {spottableCount.toLocaleString()} spotted
              </p>
              <Link
                href="/signup"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Sign up
              </Link>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-0 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-1000" />
            </div>
          </div>

          {/* Species collection grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {collectionPreviewSpecies.map((species) => (
              <div
                key={species.id}
                className="group relative rounded-xl overflow-hidden aspect-square"
              >
                {species.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={species.heroImageUrl}
                    alt={species.revealed ? species.commonName : "Unknown species"}
                    className={`w-full h-full object-cover ${
                      species.revealed
                        ? "transition-transform duration-500 group-hover:scale-105"
                        : "grayscale brightness-[0.3]"
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`w-full h-full photo-placeholder-species ${
                      !species.revealed ? "grayscale brightness-[0.3]" : ""
                    }`}
                  />
                )}

                {/* Overlay */}
                {species.revealed ? (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                    <p className="text-white text-xs md:text-sm font-medium leading-tight drop-shadow-md">
                      {species.commonName}
                    </p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white/20 flex items-center justify-center">
                      <span className="text-white/30 text-lg md:text-xl font-display font-bold">
                        ?
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Trip report mockup */}
          <div className="mt-10 flex flex-col md:flex-row items-center gap-8">
            {/* Trip card preview */}
            <div className="w-full md:w-auto md:flex-shrink-0">
              <div className="bg-deep rounded-2xl p-5 md:p-6 max-w-sm mx-auto md:mx-0 shadow-xl shadow-deep/20">
                <p className="text-white/40 text-xs tracking-wider uppercase mb-3">
                  Shareable trip report
                </p>
                <p className="font-display text-lg font-semibold text-white mb-1">
                  You saw 8 species
                </p>
                <p className="text-white/50 text-sm mb-4">
                  Cabbage Tree Bay &middot; April 13, 2026
                </p>

                {/* Avatar stack of species */}
                <div className="flex items-center mb-4">
                  <div className="flex -space-x-2">
                    {collectionPreviewSpecies
                      .filter((s) => s.revealed && s.heroImageUrl)
                      .slice(0, 5)
                      .map((s, i) => (
                        <div
                          key={s.id}
                          className="w-9 h-9 rounded-full border-2 border-deep overflow-hidden"
                          style={{ zIndex: 5 - i }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.heroImageUrl!}
                            alt={s.commonName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    <div className="w-9 h-9 rounded-full border-2 border-deep bg-white/10 flex items-center justify-center text-white/50 text-xs font-medium">
                      +3
                    </div>
                  </div>
                </div>

                {/* Mini progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                      style={{ width: "17%" }}
                    />
                  </div>
                  <span className="text-white/40 text-xs whitespace-nowrap">
                    8 of 47
                  </span>
                </div>
              </div>
            </div>

            {/* CTA text */}
            <div className="text-center md:text-left">
              <h3 className="font-display text-2xl font-semibold text-deep mb-2">
                Every dive tells a story.
              </h3>
              <p className="text-slate-500 mb-6 max-w-md">
                Log what you see, track your collection, and share a
                beautiful trip report with friends. Free — no catches.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-7 py-3 rounded-full font-semibold transition-colors"
              >
                Create your free account
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SPECIES ID TOOL
          ────────────────────────────────────────── */}
      <section className="bg-slate-50 section-padding overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Phone mockup */}
          <div className="relative flex justify-center">
            <div className="w-[280px] h-[560px] bg-deep rounded-[3rem] p-3 shadow-2xl shadow-deep/30 relative">
              <div className="w-full h-full bg-white rounded-[2.3rem] overflow-hidden flex flex-col">
                {/* Screen header */}
                <div className="bg-deep px-5 pt-10 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-teal-400/20 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-teal-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-teal-400 text-xs font-medium">
                      Cabbage Tree Bay
                    </span>
                  </div>
                  <p className="text-teal-400 text-xs font-medium tracking-wider uppercase">
                    Step 3 of 5
                  </p>
                  <p className="text-white font-display text-lg font-semibold mt-1">
                    How big was it?
                  </p>
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
                    {
                      label: "Tiny",
                      desc: "Shrimp / nudibranch",
                      size: "text-lg",
                    },
                    {
                      label: "Small",
                      desc: "Hand-sized",
                      size: "text-xl",
                    },
                    {
                      label: "Medium",
                      desc: "Forearm length",
                      size: "text-2xl",
                      selected: true,
                    },
                    {
                      label: "Large",
                      desc: "Arm length",
                      size: "text-3xl",
                    },
                    {
                      label: "Very large",
                      desc: "Body+",
                      size: "text-4xl",
                    },
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
                              opt.selected
                                ? "text-teal-700"
                                : "text-slate-700"
                            }`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-xs text-slate-400">{opt.desc}</p>
                        </div>
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
              <br />
              Find out what it was.
            </h2>
            <p className="text-slate-500 text-lg mb-6 leading-relaxed">
              Answer five quick questions — size, colour, habitat, when and
              where — and we&apos;ll match it against every species recorded
              at Cabbage Tree Bay.
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
              href="/id?location=cabbage-tree-bay"
              className="inline-flex items-center gap-2 bg-deep hover:bg-deep-light text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Identify a species
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          THE RESERVE — Know Before You Go
          ────────────────────────────────────────── */}
      <section className="bg-sand section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            {/* Copy */}
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-4">
                Know before you go
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Cabbage Tree Bay Aquatic Reserve is a fully protected no-take
                zone on Sydney&apos;s Northern Beaches. The marine life here
                is extraordinary — blue gropers swim up to you, cuttlefish
                hover in the shallows, and wobbegong sharks rest under every
                ledge.
              </p>
              <p className="text-slate-500 leading-relaxed mb-8">
                Shore access from Shelly Beach makes it one of the most
                accessible snorkelling spots in Australia. Walk in off the
                sand and you&apos;re surrounded by hundreds of species within
                minutes.
              </p>

              {/* Quick facts */}
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm">
                  <svg
                    className="w-4 h-4 text-teal-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">
                    Beginner friendly
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm">
                  <svg
                    className="w-4 h-4 text-teal-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">
                    1–10m depth
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm">
                  <svg
                    className="w-4 h-4 text-teal-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                    />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">
                    Snorkelling &middot; Diving
                  </span>
                </div>
              </div>

              <Link
                href="/locations/sydney/cabbage-tree-bay"
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Plan your visit
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>

            {/* Map placeholder */}
            <div className="relative">
              <div
                id="reserve-map"
                className="aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden shadow-lg"
              >
                <div className="w-full h-full bg-gradient-to-br from-sky-800 via-cyan-900 to-teal-900 relative flex flex-col items-center justify-center">
                  {/* Decorative grid lines */}
                  <div className="absolute inset-0 opacity-10">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                      }}
                    />
                  </div>

                  {/* Pin */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-coral flex items-center justify-center shadow-lg shadow-coral/30 mb-3">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="font-display text-lg font-semibold text-white mb-1">
                      Cabbage Tree Bay
                    </p>
                    <p className="text-white/40 text-xs font-mono tracking-wide">
                      33.7983&deg;S, 151.2900&deg;E
                    </p>
                  </div>

                  {/* Decorative wave at bottom */}
                  <div className="absolute bottom-0 left-0 right-0">
                    <svg
                      viewBox="0 0 400 40"
                      preserveAspectRatio="none"
                      className="w-full h-8 opacity-10"
                    >
                      <path
                        d="M0,20 C100,40 200,0 300,20 C350,30 375,25 400,20 L400,40 L0,40 Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
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
