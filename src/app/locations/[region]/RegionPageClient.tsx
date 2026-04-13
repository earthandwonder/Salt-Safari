"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { TabBar, TabPanel } from "@/components/TabBar";
import { Footer } from "@/components/Footer";
import type { Region } from "@/types";
import type { RegionLocation, RegionSpecies } from "./page";
import { LocationsTab } from "./LocationsTab";
import { RegionSpeciesTab } from "./RegionSpeciesTab";
import { RegionMapTab } from "./RegionMapTab";

interface RegionPageClientProps {
  region: Region;
  locations: RegionLocation[];
  topSpecies: RegionSpecies[];
  totalLocations: number;
  regionSlug: string;
}

const TABS = [
  { id: "locations", label: "Locations" },
  { id: "species", label: "Species" },
  { id: "map", label: "Map" },
];

export function RegionPageClient({
  region,
  locations,
  topSpecies,
  totalLocations,
  regionSlug,
}: RegionPageClientProps) {
  const [activeTab, setActiveTab] = useState("locations");

  const totalSpeciesInSeason = locations.reduce((sum, loc) => {
    // Deduplicate would be ideal, but for display this is a rough total
    return Math.max(sum, loc.inSeasonCount);
  }, 0);

  return (
    <div className="min-h-screen bg-sand">
      <Header />

      {/* ══════════════════════════════════════════
          HERO
         ══════════════════════════════════════════ */}
      <section className="relative w-full min-h-[48vh] md:min-h-[44vh] flex items-end overflow-hidden">
        {region.hero_image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={region.hero_image_url}
              alt={region.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/60 to-deep/20" />
          </>
        ) : (
          <div className="absolute inset-0 hero-gradient">
            <div className="caustic-overlay" />
          </div>
        )}

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10 pt-28 md:pb-14">
          {/* Breadcrumb */}
          <nav className="mb-3" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60">
              <li>
                <Link href="/locations" className="hover:text-white/90 transition-colors">
                  Locations
                </Link>
              </li>
              <li aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </li>
              <li className="text-white/90 font-medium">{region.name}</li>
            </ol>
          </nav>

          {/* Region name */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.1]">
            {region.name}
          </h1>

          {/* Quick facts */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              {totalLocations} {totalLocations === 1 ? "location" : "locations"}
            </span>

            {totalSpeciesInSeason > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 backdrop-blur-sm">
                <span className="season-dot !w-1.5 !h-1.5" aria-hidden="true" />
                Species in season now
              </span>
            )}
          </div>

          {region.description && (
            <p className="mt-4 text-white/70 text-sm md:text-base max-w-2xl leading-relaxed">
              {region.description}
            </p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TAB BAR + CONTENT
         ══════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="sticky top-16 z-30 bg-sand pt-4 pb-0 -mx-6 px-6 border-b-0">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="py-8 md:py-10">
          {/* Locations Tab */}
          <TabPanel tabId="locations" activeTab={activeTab}>
            <LocationsTab
              locations={locations}
              regionSlug={regionSlug}
              regionName={region.name}
            />
          </TabPanel>

          {/* Species Tab */}
          <TabPanel tabId="species" activeTab={activeTab}>
            <RegionSpeciesTab
              topSpecies={topSpecies}
              regionName={region.name}
            />
          </TabPanel>

          {/* Map Tab */}
          <TabPanel tabId="map" activeTab={activeTab}>
            <RegionMapTab
              locations={locations}
              regionSlug={regionSlug}
              regionName={region.name}
            />
          </TabPanel>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CTA BANNER
         ══════════════════════════════════════════ */}
      <section className="bg-sand border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-deep">
              Saw something you can&apos;t identify?
            </h2>
            <p className="mt-3 text-slate-500 text-sm md:text-base">
              Use our free Species ID tool to figure out what you saw underwater.
            </p>
            <Link
              href="/id"
              className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors shadow-lg shadow-coral/20"
            >
              Identify a species
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
