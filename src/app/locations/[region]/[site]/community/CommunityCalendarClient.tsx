"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";

type CalendarDay = {
  date: string;
  speciesCount: number;
  spotterCount: number;
  sightingCount: number;
};

interface CommunityCalendarClientProps {
  regionSlug: string;
  siteSlug: string;
  regionName: string;
  locationName: string;
  locationHeroUrl: string | null;
  calendarDays: CalendarDay[];
  totalSpecies: number;
  totalSpotters: number;
  totalSightings: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function CommunityCalendarClient({
  regionSlug,
  siteSlug,
  regionName,
  locationName,
  locationHeroUrl,
  calendarDays,
  totalSpecies,
  totalSpotters,
  totalSightings,
}: CommunityCalendarClientProps) {
  const router = useRouter();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  // Build a map for quick lookup
  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    for (const d of calendarDays) {
      m.set(d.date, d);
    }
    return m;
  }, [calendarDays]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const monthPrefix = `${viewYear}-${pad(viewMonth + 1)}`;
    const monthDays = calendarDays.filter((d) => d.date.startsWith(monthPrefix));
    const speciesIds = new Set<string>(); // We only have counts, so approximate
    let totalSightings = 0;
    let daysWithActivity = 0;
    for (const d of monthDays) {
      totalSightings += d.sightingCount;
      daysWithActivity += 1;
    }
    // Sum unique species across the month (approximate — max of daily counts)
    const maxSpecies = monthDays.reduce((max, d) => Math.max(max, d.speciesCount), 0);
    return {
      totalSightings,
      daysWithActivity,
      maxSpecies,
      monthDays,
    };
  }, [calendarDays, viewYear, viewMonth]);

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday = 0, Sunday = 6 (ISO)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: (null | { day: number; dateStr: string; data: CalendarDay | undefined })[] = [];

    // Leading blanks
    for (let i = 0; i < startDow; i++) cells.push(null);

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      cells.push({ day: d, dateStr, data: dayMap.get(dateStr) });
    }

    return cells;
  }, [viewYear, viewMonth, dayMap]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function handleDayClick(dateStr: string) {
    router.push(
      `/locations/${regionSlug}/${siteSlug}/community/${dateStr}`
    );
  }

  // Find peak day for the intensity scale
  const peakSightings = Math.max(
    ...calendarDays.map((d) => d.speciesCount),
    1
  );

  return (
    <main>
      <Header />

      {/* ── HERO ── */}
      <section className="relative z-0 min-h-[45svh] flex flex-col justify-end hero-gradient overflow-hidden">
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
              href={`/locations/${regionSlug}`}
              className="hover:text-white/80 transition-colors"
            >
              {regionName}
            </Link>
            <span>/</span>
            <Link
              href={`/locations/${regionSlug}/${siteSlug}`}
              className="hover:text-white/80 transition-colors"
            >
              {locationName}
            </Link>
            <span>/</span>
            <span className="text-white/70">Community</span>
          </nav>

          <p className="text-teal-300 font-display text-sm tracking-widest uppercase mb-3 font-medium">
            Community Sightings
          </p>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white font-semibold leading-tight tracking-tight mb-4 text-balance">
            What is everyone finding?
          </h1>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-white font-display text-lg font-bold">{totalSpecies}</p>
                <p className="text-white/40 text-xs">species</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-coral/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-display text-lg font-bold">{totalSpotters}</p>
                <p className="text-white/40 text-xs">spotters</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-white font-display text-lg font-bold">{totalSightings}</p>
                <p className="text-white/40 text-xs">sightings</p>
              </div>
            </div>
          </div>
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* ── CALENDAR ── */}
      <section className="bg-sand section-padding">
        <div className="max-w-3xl mx-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={prevMonth}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-deep tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              {monthStats.daysWithActivity > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  {monthStats.daysWithActivity} day{monthStats.daysWithActivity !== 1 ? "s" : ""} with sightings
                  {monthStats.totalSightings > 0 && ` · ${monthStats.totalSightings} total`}
                </p>
              )}
            </div>

            <button
              onClick={nextMonth}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              aria-label="Next month"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarGrid.map((cell, i) => {
                if (!cell) {
                  return <div key={`blank-${i}`} className="aspect-square border-b border-r border-slate-50" />;
                }

                const hasData = !!cell.data;
                const intensity = hasData
                  ? Math.max(0.2, cell.data!.speciesCount / peakSightings)
                  : 0;
                const isToday =
                  cell.dateStr ===
                  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => hasData && handleDayClick(cell.dateStr)}
                    disabled={!hasData}
                    className={`
                      aspect-square border-b border-r border-slate-50 relative
                      flex flex-col items-center justify-center gap-0.5
                      transition-colors duration-150
                      ${hasData ? "cursor-pointer hover:bg-teal-50" : "cursor-default"}
                      ${isToday ? "ring-2 ring-inset ring-coral/40" : ""}
                    `}
                  >
                    <span
                      className={`text-sm font-medium ${
                        hasData ? "text-deep" : "text-slate-300"
                      } ${isToday ? "text-coral font-bold" : ""}`}
                    >
                      {cell.day}
                    </span>

                    {hasData && (
                      <>
                        {/* Activity dot — scales with intensity */}
                        <div
                          className="rounded-full bg-teal-500 transition-all duration-300"
                          style={{
                            width: `${Math.round(6 + intensity * 14)}px`,
                            height: `${Math.round(6 + intensity * 14)}px`,
                            opacity: 0.3 + intensity * 0.7,
                          }}
                        />
                        {/* Species count on larger screens */}
                        <span className="hidden sm:block text-[10px] text-teal-600 font-medium">
                          {cell.data!.speciesCount} sp.
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-500/30" />
              <span>Few species</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-teal-500/80" />
              <span>Many species</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded ring-2 ring-coral/40" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recent active days ── */}
      {calendarDays.length > 0 && (
        <section className="bg-white section-padding">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-deep tracking-tight mb-2">
              Recent activity
            </h2>
            <p className="text-slate-500 mb-8">
              The latest days with community sightings
            </p>

            <div className="space-y-3">
              {calendarDays
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 8)
                .map((day) => {
                  const d = new Date(day.date + "T00:00:00");
                  return (
                    <Link
                      key={day.date}
                      href={`/locations/${regionSlug}/${siteSlug}/community/${day.date}`}
                      className="flex items-center gap-4 bg-sand hover:bg-teal-50 rounded-xl px-5 py-4 border border-slate-100 transition-colors group"
                    >
                      {/* Date block */}
                      <div className="w-14 h-14 bg-deep rounded-xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-white font-display text-lg font-bold leading-none">
                          {d.getDate()}
                        </span>
                        <span className="text-teal-300 text-[10px] uppercase tracking-wider font-medium">
                          {d.toLocaleDateString("en-AU", { month: "short" })}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-deep group-hover:text-teal-700 transition-colors">
                          {d.toLocaleDateString("en-AU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {day.speciesCount} species · {day.spotterCount} spotter{day.spotterCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <svg
                        className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-deep section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
            Went for a swim?
          </h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            Log what you spotted and contribute to the community record at {locationName}.
          </p>
          <Link
            href="/log"
            className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-7 py-3 rounded-full font-semibold transition-colors"
          >
            Log your sightings
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
