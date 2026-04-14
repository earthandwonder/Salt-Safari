"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";

type CommunitySpecies = {
  id: string;
  name: string;
  scientificName: string | null;
  slug: string;
  heroImageUrl: string | null;
  observationCount: number;
};

type Contributor = {
  userId: string;
  displayName: string;
  username: string | null;
  sightingCount: number;
};

interface CommunityDayClientProps {
  regionSlug: string;
  siteSlug: string;
  regionName: string;
  locationName: string;
  locationHeroUrl: string | null;
  date: string;
  species: CommunitySpecies[];
  contributors: Contributor[];
  totalSightings: number;
}

export function CommunityDayClient({
  regionSlug,
  siteSlug,
  regionName,
  locationName,
  locationHeroUrl,
  date,
  species,
  contributors,
  totalSightings,
}: CommunityDayClientProps) {
  const parsedDate = new Date(date + "T00:00:00");
  const formattedDate = `${parsedDate.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })} '${String(parsedDate.getFullYear()).slice(2)}`;
  const longDate = parsedDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
  });

  const isEmpty = species.length === 0;

  return (
    <main>
      <Header />

      {/* ── HERO ── */}
      <section className="relative z-0 min-h-[50svh] flex flex-col justify-end hero-gradient overflow-hidden">
        {locationHeroUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={locationHeroUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/95 via-deep/60 to-deep/30" />
          </>
        )}
        {!locationHeroUrl && <div className="caustic-overlay" />}

        <div className="relative z-10 max-w-5xl mx-auto w-full px-6 pb-20 md:pb-24 pt-32">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/50 text-sm mb-6">
            <Link
              href={`/locations/${regionSlug}/${siteSlug}`}
              className="hover:text-white/80 transition-colors"
            >
              {locationName}
            </Link>
            <span>/</span>
            <Link
              href={`/locations/${regionSlug}/${siteSlug}/community`}
              className="hover:text-white/80 transition-colors"
            >
              Community
            </Link>
            <span>/</span>
            <span className="text-white/70">{longDate}</span>
          </nav>

          <p className="text-teal-300 font-display text-sm tracking-widest uppercase mb-3 font-medium">
            Community Day
          </p>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white font-semibold leading-tight tracking-tight mb-4 text-balance">
            {isEmpty ? (
              "No sightings recorded"
            ) : (
              <>
                {species.length} species spotted
                <br />
                <span className="text-teal-300">{formattedDate}</span>
              </>
            )}
          </h1>

          {!isEmpty && (
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-display text-xl font-bold">{totalSightings}</p>
                  <p className="text-white/50 text-xs">total sightings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-display text-xl font-bold">{contributors.length}</p>
                  <p className="text-white/50 text-xs">swimmers</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* ── EMPTY STATE ── */}
      {isEmpty && (
        <section className="bg-sand section-padding">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-deep mb-3">
              Nothing logged on {formattedDate}
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              No swimmers logged their sightings at {locationName} on this day.
              Be the first to share what you see!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/locations/${regionSlug}/${siteSlug}/community`}
                className="inline-flex items-center justify-center gap-2 bg-deep hover:bg-deep-light text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Browse calendar
              </Link>
              <Link
                href="/log"
                className="inline-flex items-center justify-center gap-2 bg-coral hover:bg-coral-dark text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                Log a swim
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── SPECIES GRID ── */}
      {!isEmpty && (
        <section className="bg-sand section-padding">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-deep tracking-tight">
                Species spotted
              </h2>
              <p className="text-slate-500 mt-1">
                Everything the community saw at {locationName} on {longDate}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {species.map((sp, i) => (
                <Link
                  key={sp.id}
                  href={`/species/${sp.slug}`}
                  className="group block card-lift rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100"
                  style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {sp.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sp.heroImageUrl}
                        alt={sp.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full photo-placeholder-species" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />

                    {/* Observation count badge */}
                    <div className="absolute top-2.5 right-2.5 bg-deep/80 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {sp.observationCount}
                    </div>
                  </div>

                  <div className="p-3 md:p-4">
                    <h3 className="font-display text-sm md:text-base font-semibold text-deep leading-tight truncate group-hover:text-teal-700 transition-colors">
                      {sp.name}
                    </h3>
                    {sp.scientificName && (
                      <p className="text-xs text-slate-400 italic mt-0.5 truncate">
                        {sp.scientificName}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTRIBUTORS ── */}
      {!isEmpty && contributors.length > 0 && (
        <section className="bg-white section-padding">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-deep tracking-tight mb-2">
              Swimmers
            </h2>
            <p className="text-slate-500 mb-8">
              {contributors.length} swimmer{contributors.length !== 1 ? "s" : ""} shared the species they saw
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contributors.map((c, i) => (
                <div
                  key={c.userId}
                  className="flex items-center gap-4 bg-sand rounded-xl px-5 py-4 border border-slate-100"
                >
                  {/* Rank indicator */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      i === 0
                        ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-md shadow-amber-200/50"
                        : i === 1
                          ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                          : i === 2
                            ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                            : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {c.username ? (
                      <Link
                        href={`/u/${c.username}`}
                        className="font-display font-semibold text-deep hover:text-teal-700 transition-colors truncate block"
                      >
                        {c.displayName}
                      </Link>
                    ) : (
                      <p className="font-display font-semibold text-deep truncate">
                        {c.displayName}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {c.sightingCount} species logged
                    </p>
                  </div>

                  {/* Mini bar showing relative contribution */}
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                      style={{
                        width: `${Math.round((c.sightingCount / Math.max(contributors[0].sightingCount, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
              <Link
                href={`/locations/${regionSlug}/${siteSlug}/community`}
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to community calendar
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
