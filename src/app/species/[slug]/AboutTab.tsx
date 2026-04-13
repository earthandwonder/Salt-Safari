"use client";

import Link from "next/link";
import type { Species } from "@/types";
import type { SimilarSpecies } from "./page";

interface AboutTabProps {
  species: Species;
  similarSpecies: SimilarSpecies[];
}

export function AboutTab({ species, similarSpecies }: AboutTabProps) {
  return (
    <div className="max-w-3xl">
      {/* ── Summary (free tier, always visible) ── */}
      {species.summary ? (
        <div className="font-body text-slate-700 leading-relaxed space-y-6 text-[16px] md:text-[17px]">
          {species.summary.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 p-8 md:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <h3 className="font-display text-xl font-semibold text-deep mb-2">
            Summary coming soon
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            We&apos;re writing a detailed guide for {species.name} with identification tips, behaviour, and where to find them.
          </p>
        </div>
      )}

      {/* ── Deep dive (premium teaser) ── */}
      <div className="mt-10">
        {species.deep_dive ? (
          // Phase 1: show full deep dive to everyone (Stripe gating comes in Phase 3)
          <div>
            <h3 className="font-display text-xl font-semibold text-deep mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-teal-600">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Deep Dive
            </h3>
            <div className="font-body text-slate-700 leading-relaxed space-y-6 text-[16px] md:text-[17px]">
              {species.deep_dive.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        ) : (
          // Deep dive not written yet — show teaser
          <div className="relative rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {/* Faded placeholder content */}
            <div className="p-8 md:p-10">
              <h3 className="font-display text-xl font-semibold text-deep mb-4 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-teal-600">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Deep Dive
              </h3>
              <div className="space-y-4 text-slate-400 text-sm select-none" aria-hidden="true">
                <p>
                  Behaviour, diet, reproduction, conservation status, and tips for identifying this species in the wild. Be the interesting person in your dive group.
                </p>
                <p>
                  Detailed information about seasonal patterns, preferred habitats, and how to distinguish from similar species you might encounter at the same locations...
                </p>
              </div>
            </div>
            {/* Gradient fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white flex items-end justify-center pb-8">
              <div className="text-center">
                <p className="text-slate-500 text-sm mb-3">
                  Deep dives are coming soon
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-coral/10 text-coral font-semibold text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Unlock the full story — A$9.99
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Similar species ── */}
      {similarSpecies.length > 0 && (
        <div className="mt-12">
          <h3 className="font-display text-xl font-semibold text-deep mb-5">
            Similar Species
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similarSpecies.map((sim) => (
              <Link
                key={sim.id}
                href={`/species/${sim.slug}`}
                className="group card-lift rounded-xl overflow-hidden bg-white border border-slate-100"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {sim.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sim.hero_image_url}
                      alt={sim.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full photo-placeholder-species" />
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-display text-sm font-semibold text-deep leading-snug truncate">
                    {sim.name}
                  </h4>
                  {sim.scientific_name && (
                    <p className="text-xs text-slate-400 italic mt-0.5 truncate">
                      {sim.scientific_name}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
