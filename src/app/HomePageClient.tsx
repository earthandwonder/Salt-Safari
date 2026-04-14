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

type DiscoverSpecies = {
  id: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
};

type UserLatestLog = {
  speciesCount: number;
  locationName: string;
  date: string;
  speciesImages: string[];
};

interface HomePageClientProps {
  speciesCount: number;
  spottableCount: number;
  inSeasonCount: number;
  inSeasonSpecies: InSeasonSpecies[];
  collectionPreviewSpecies: CollectionPreviewSpecies[];
  discoverSpecies: DiscoverSpecies[];
  userSpottedCount?: number;
  userLatestLog?: UserLatestLog | null;
  isLoggedIn?: boolean;
  heroImageUrl?: string | null;
}

export function HomePageClient({
  speciesCount,
  spottableCount,
  inSeasonCount,
  inSeasonSpecies,
  collectionPreviewSpecies,
  discoverSpecies,
  userSpottedCount,
  userLatestLog,
  isLoggedIn,
  heroImageUrl,
}: HomePageClientProps) {
  const spottedCount = isLoggedIn ? (userSpottedCount ?? 0) : 0;
  const progressPercent = spottableCount > 0 ? Math.round((spottedCount / spottableCount) * 100) : 0;
  return (
    <main>
      <Header />

      {/* ──────────────────────────────────────────
          HERO — The Wow Number
          ────────────────────────────────────────── */}
      <section className="relative z-0 min-h-[70svh] flex flex-col justify-end hero-gradient overflow-hidden">
        {heroImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/55 to-deep/25" />
          </>
        )}
        {!heroImageUrl && <div className="caustic-overlay" />}

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-28 md:pb-32 pt-32">
          <p className="text-teal-300 font-display text-sm md:text-base tracking-widest uppercase mb-4 opacity-0 animate-fade-up font-medium drop-shadow-[0_0_4px_rgba(0,0,0,1)] drop-shadow-[0_0_10px_rgba(0,0,0,1)] drop-shadow-[0_0_20px_rgba(0,0,0,1)] drop-shadow-[0_0_60px_rgba(0,0,0,1)]">
            Cabbage Tree Bay Aquatic Reserve
          </p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white font-semibold leading-[1.05] tracking-tight mb-6 opacity-0 animate-fade-up stagger-1 text-balance drop-shadow-[0_4px_40px_rgba(0,0,0,1)] drop-shadow-[0_0_60px_rgba(0,0,0,0.7)]">
            {speciesCount.toLocaleString()}+ species
            <br />
            call this place home.
          </h1>

          <p className="text-lg md:text-xl text-white/90 max-w-lg mb-10 opacity-0 animate-fade-up stagger-2 drop-shadow-[0_2px_20px_rgba(0,0,0,1)] drop-shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            Your complete guide to every species at Sydney&apos;s best
            swim spot. Know what you&apos;ll see. Track what
            you&apos;ve found.
          </p>

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
                    {inSeasonCount} In Season Now
                  </span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight">
                  Visiting this month? Look out for these.
                </h2>
              </div>
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
              <div>
                <p className="font-display text-lg font-semibold text-deep">
                  Got a species you&apos;re excited about?
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  We&apos;ll alert you when they&apos;re in town
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
          THE COLLECTION — "How many can you find?"
          ────────────────────────────────────────── */}
      <section className="bg-white section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-3">
              Your underwater collection
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              We&apos;ve picked {spottableCount} species you might spot on a swim. Every visit is a chance to add to your collection — how many can you check off?
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">
                <span className="text-deep font-display text-lg font-bold">
                  {spottedCount}
                </span>{" "}
                of {spottableCount.toLocaleString()} spotted
              </p>
              <Link
                href="/locations/sydney/cabbage-tree-bay"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Start spotting
              </Link>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(progressPercent, isLoggedIn && spottedCount > 0 ? 2 : 0)}%` }}
              />
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

          {/* Start spotting CTA */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/locations/sydney/cabbage-tree-bay"
              className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-7 py-3 rounded-full font-semibold transition-colors"
            >
              Start spotting
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

          {/* Trip logging intro */}
          <div className="mt-16 max-w-2xl mx-auto text-center mb-8">
            <h3 className="font-display text-2xl md:text-3xl font-semibold text-deep tracking-tight mb-3">
              Remember what you saw.
            </h3>
            <p className="text-slate-500 text-lg leading-relaxed">
              Log your sightings after each swim and we&apos;ll build you a swim report you can share with your swim group.
            </p>
          </div>

          {/* Trip card preview */}
          <div className="max-w-sm mx-auto">
            <div className="bg-deep rounded-2xl p-5 md:p-6 shadow-xl shadow-deep/20">
              <p className="text-white/40 text-xs tracking-wider uppercase mb-3">
                {isLoggedIn && userLatestLog ? "Your latest swim" : "Shareable swim report"}
              </p>
              <p className="font-display text-lg font-semibold text-white mb-1">
                {isLoggedIn && userLatestLog
                  ? `You saw ${userLatestLog.speciesCount} species`
                  : "You saw 8 species"}
              </p>
              <p className="text-white/50 text-sm mb-4">
                {isLoggedIn && userLatestLog
                  ? `${userLatestLog.locationName} \u00B7 ${new Date(userLatestLog.date).toLocaleDateString("en-AU", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Cabbage Tree Bay \u00B7 April 13, 2026"}
              </p>

              {/* Avatar stack of species */}
              <div className="flex items-center mb-4">
                <div className="flex -space-x-2">
                  {isLoggedIn && userLatestLog ? (
                    <>
                      {userLatestLog.speciesImages.slice(0, 5).map((url, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-full border-2 border-deep overflow-hidden"
                          style={{ zIndex: 5 - i }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Species"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {userLatestLog.speciesCount > 5 && (
                        <div className="w-9 h-9 rounded-full border-2 border-deep bg-white/10 flex items-center justify-center text-white/50 text-xs font-medium">
                          +{userLatestLog.speciesCount - 5}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {/* Mini progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                    style={{ width: `${Math.max(progressPercent, isLoggedIn && spottedCount > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="text-white/40 text-xs whitespace-nowrap">
                  {spottedCount} of {spottableCount}
                </span>
              </div>
            </div>

            {/* Share your swim button */}
            <div className="mt-5 flex justify-center">
              <Link
                href={isLoggedIn ? "/log" : "/signup?redirectTo=%2Flog"}
                className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-7 py-3 rounded-full font-semibold transition-colors"
              >
                Share your swim
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
          <div className="relative flex justify-center order-2 md:order-1">
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
          <div className="order-1 md:order-2">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-4 text-balance">
              Saw something different?
              <br />
              Find out what it was.
            </h2>
            <p className="text-slate-500 text-lg mb-6 leading-relaxed">
              Answer five quick questions — size, colour, habitat, when and
              where — and we&apos;ll match it against every species recorded
              at Cabbage Tree Bay.
            </p>
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
          DISCOVER SPECIES — Deep Dives
          ────────────────────────────────────────── */}
      {discoverSpecies.length > 0 && (
        <section className="bg-white section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-10">
              <p className="text-teal-600 text-sm font-medium tracking-wider uppercase mb-3">
                Deep Dives
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-3">
                Get to know the locals
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                Every species has a story — what they eat, where they hide,
                why they&apos;re here. Dive into the field guide.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
              {discoverSpecies.map((species) => (
                <Link
                  key={species.id}
                  href={`/species/${species.slug}`}
                  className="group"
                >
                  <div className="card-lift rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {species.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={species.heroImageUrl}
                          alt={species.commonName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full photo-placeholder-species" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold text-deep group-hover:text-teal-700 transition-colors truncate">
                        {species.commonName}
                      </h3>
                      {species.scientificName && (
                        <p className="text-xs text-slate-400 italic mt-1 truncate">
                          {species.scientificName}
                        </p>
                      )}
                      <p className="text-xs text-coral font-medium mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                        Learn more
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────
          COMMUNITY — Who's been swimming?
          Commented out until we have more users
          ──────────────────────────────────────────
      <section className="bg-sand section-padding overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-soft" />
                <span className="text-teal-600 text-sm font-medium tracking-wider uppercase">
                  Community
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-deep tracking-tight mb-4 text-balance">
                Follow the community&apos;s sightings
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                We know what species live here — the community shows you
                who spotted what and when. See what swimmers are logging
                after each visit and discover what&apos;s being seen right now.
              </p>
              <Link
                href="/locations/sydney/cabbage-tree-bay/community"
                className="inline-flex items-center gap-2 bg-deep hover:bg-deep-light text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                See the community
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

            <div className="relative">
              <Link
                href="/locations/sydney/cabbage-tree-bay/community"
                className="block group"
              >
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden card-lift">
                  <div className="bg-deep px-6 py-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-teal-300 text-xs font-medium tracking-wider uppercase">
                        Cabbage Tree Bay
                      </p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                        <span className="text-emerald-400 text-xs font-medium">Live</span>
                      </div>
                    </div>
                    <p className="text-white font-display text-lg font-semibold">
                      Who spotted what
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {[
                      { initials: "KM", name: "Kate M.", species: 12, time: "Today", color: "bg-teal-500" },
                      { initials: "JR", name: "James R.", species: 8, time: "Today", color: "bg-coral" },
                      { initials: "SL", name: "Sarah L.", species: 15, time: "Yesterday", color: "bg-indigo-500" },
                      { initials: "DP", name: "Dan P.", species: 6, time: "2 days ago", color: "bg-amber-500" },
                    ].map((swimmer) => (
                      <div key={swimmer.name} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={`w-9 h-9 rounded-full ${swimmer.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {swimmer.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-deep truncate">
                            {swimmer.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            logged {swimmer.species} species
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">
                          {swimmer.time}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80">
                    <p className="text-sm text-slate-500">
                      See all community activity
                    </p>
                    <svg
                      className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors"
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
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
      */}

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
                hover in the shallows, and sea turtles feast on the sea grass.
              </p>
              <p className="text-slate-500 leading-relaxed mb-8">
                An entry from South Manly makes it one of Sydney&apos;s most
                popular swim spots. Walk in off the sand at Shelly Beach
                and you&apos;re surrounded by hundreds of species within
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
