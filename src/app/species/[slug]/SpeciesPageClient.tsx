"use client";

import { useState } from "react";
import Link from "next/link";
import { TabBar, TabPanel } from "@/components/TabBar";
import { Footer } from "@/components/Footer";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import type { Species, Photo } from "@/types";
import type { LocationOccurrence, SimilarSpecies } from "./page";
import { PhotosTab } from "./PhotosTab";
import { AboutTab } from "./AboutTab";
import { WhereWhenTab } from "./WhereWhenTab";

interface SpeciesPageClientProps {
  species: Species;
  photos: Photo[];
  locationOccurrences: LocationOccurrence[];
  similarSpecies: SimilarSpecies[];
}

// IUCN status config
const iucnConfig: Record<string, { label: string; bg: string; text: string }> = {
  LC: { label: "Least Concern", bg: "bg-emerald-500/15", text: "text-emerald-300" },
  NT: { label: "Near Threatened", bg: "bg-amber-500/15", text: "text-amber-300" },
  VU: { label: "Vulnerable", bg: "bg-orange-500/15", text: "text-orange-300" },
  EN: { label: "Endangered", bg: "bg-red-500/15", text: "text-red-300" },
  CR: { label: "Critically Endangered", bg: "bg-red-700/20", text: "text-red-200" },
  EW: { label: "Extinct in Wild", bg: "bg-slate-500/20", text: "text-slate-300" },
  EX: { label: "Extinct", bg: "bg-slate-700/20", text: "text-slate-400" },
  DD: { label: "Data Deficient", bg: "bg-slate-500/15", text: "text-slate-400" },
  NE: { label: "Not Evaluated", bg: "bg-slate-500/10", text: "text-slate-400" },
};

const sizeLabels: Record<string, string> = {
  tiny: "Tiny (<5 cm)",
  small: "Small (5–20 cm)",
  medium: "Medium (20–60 cm)",
  large: "Large (60–150 cm)",
  very_large: "Very Large (150+ cm)",
};

export function SpeciesPageClient({
  species,
  photos,
  locationOccurrences,
  similarSpecies,
}: SpeciesPageClientProps) {
  const hasMultiplePhotos = photos.length > 1;
  const defaultTab = hasMultiplePhotos ? "photos" : "about";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  const tabs = hasMultiplePhotos
    ? [
        { id: "photos", label: "Photos" },
        { id: "about", label: "About" },
        { id: "where-when", label: "Where & When" },
      ]
    : [
        { id: "about", label: "About" },
        { id: "where-when", label: "Where & When" },
      ];

  const heroPhoto = photos.find((p) => p.is_hero) ?? photos[0] ?? null;
  const iucn = species.iucn_category ? iucnConfig[species.iucn_category] : null;

  return (
    <div className="min-h-screen bg-sand">
      {/* ══════════════════════════════════════════
          HERO
         ══════════════════════════════════════════ */}
      <section className="relative w-full min-h-[56vh] md:min-h-[52vh] flex items-end overflow-hidden">
        {/* Background image or gradient */}
        {heroPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto.url}
              alt={species.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/60 to-deep/20" />
          </>
        ) : (
          <div className="absolute inset-0 photo-placeholder-species">
            <div className="caustic-overlay" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10 pt-28 md:pb-14">
          {/* Breadcrumb */}
          <nav className="mb-3" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60">
              <li>
                <Link href="/locations" className="hover:text-white/90 transition-colors">
                  Explore
                </Link>
              </li>
              <li aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </li>
              <li className="text-white/90 font-medium">{species.name}</li>
            </ol>
          </nav>

          {/* Species name */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.1]">
            {species.name}
          </h1>
          {species.scientific_name && (
            <p className="mt-2 text-lg md:text-xl text-white/60 italic font-body">
              {species.scientific_name}
            </p>
          )}

          {/* Quick facts row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            {species.size_category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 3L14.5 21l-3-7.5L4 10z" />
                </svg>
                {sizeLabels[species.size_category] ?? species.size_category}
              </span>
            )}

            {species.max_length_cm && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />
                </svg>
                Up to {species.max_length_cm} cm
              </span>
            )}

            {iucn && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${iucn.bg} ${iucn.text} backdrop-blur-sm`}>
                {iucn.label}
              </span>
            )}

            {species.is_endemic && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 backdrop-blur-sm">
                Endemic
              </span>
            )}

            {species.is_introduced && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 backdrop-blur-sm">
                Introduced
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TAB BAR + CONTENT
         ══════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="sticky top-16 z-30 bg-sand pt-4 pb-0 -mx-6 px-6 border-b-0">
          <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="py-8 md:py-10">
          {/* Photos Tab */}
          {hasMultiplePhotos && (
            <TabPanel tabId="photos" activeTab={activeTab}>
              <PhotosTab photos={photos} onPhotoClick={setLightboxPhoto} />
            </TabPanel>
          )}

          {/* About Tab */}
          <TabPanel tabId="about" activeTab={activeTab}>
            <AboutTab
              species={species}
              similarSpecies={similarSpecies}
            />
          </TabPanel>

          {/* Where & When Tab */}
          <TabPanel tabId="where-when" activeTab={activeTab}>
            <WhereWhenTab locationOccurrences={locationOccurrences} />
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
              Think you spotted one?
            </h2>
            <p className="mt-3 text-slate-500 text-sm md:text-base">
              Use our free Species ID tool to confirm what you saw underwater.
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

      {/* Lightbox */}
      <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </div>
  );
}
