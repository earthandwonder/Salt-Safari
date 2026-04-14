"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeciesCard } from "@/components/SpeciesCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";

type BrowseSpecies = {
  slug: string;
  name: string;
  scientific_name: string | null;
  hero_image_url: string | null;
  size_category: string | null;
  colours: string[];
  habitat: string[];
  danger_note: string | null;
  family: string | null;
  phylum: string | null;
  class: string | null;
  order: string | null;
};

interface SpeciesBrowseClientProps {
  species: BrowseSpecies[];
  totalCount: number;
  availableColours: string[];
  availableHabitats: string[];
}

const SIZE_LABELS: Record<string, string> = {
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
  very_large: "Very Large",
};

const PER_PAGE = 50;

export function SpeciesBrowseClient({
  species,
  totalCount,
  availableColours,
  availableHabitats,
}: SpeciesBrowseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sizeFilter, setSizeFilter] = useState<string | null>(searchParams.get("size"));
  const [colourFilter, setColourFilter] = useState<string | null>(searchParams.get("colour"));
  const [habitatFilter, setHabitatFilter] = useState<string | null>(searchParams.get("habitat"));
  const [sortBy, setSortBy] = useState<"alpha" | "taxonomic">(
    (searchParams.get("sort") as "alpha" | "taxonomic") ?? "alpha"
  );
  const [page, setPage] = useState(initialPage);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = species;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.scientific_name?.toLowerCase().includes(q) ?? false)
      );
    }

    if (sizeFilter) {
      result = result.filter((s) => s.size_category === sizeFilter);
    }

    if (colourFilter) {
      result = result.filter((s) => s.colours.includes(colourFilter));
    }

    if (habitatFilter) {
      result = result.filter((s) => s.habitat.includes(habitatFilter));
    }

    // Sort
    if (sortBy === "alpha") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result = [...result].sort((a, b) => {
        const phylumCmp = (a.phylum ?? "").localeCompare(b.phylum ?? "");
        if (phylumCmp !== 0) return phylumCmp;
        const classCmp = (a.class ?? "").localeCompare(b.class ?? "");
        if (classCmp !== 0) return classCmp;
        const orderCmp = (a.order ?? "").localeCompare(b.order ?? "");
        if (orderCmp !== 0) return orderCmp;
        const familyCmp = (a.family ?? "").localeCompare(b.family ?? "");
        if (familyCmp !== 0) return familyCmp;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [species, search, sizeFilter, colourFilter, habitatFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const hasActiveFilters = sizeFilter || colourFilter || habitatFilter || search.trim();

  function updateUrl(params: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.replace(`/species?${sp.toString()}`, { scroll: false });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    updateUrl({ page: newPage > 1 ? String(newPage) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setSearch("");
    setSizeFilter(null);
    setColourFilter(null);
    setHabitatFilter(null);
    setPage(1);
    router.replace("/species", { scroll: false });
  }

  return (
    <>
      {/* Hero / Header */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 hero-gradient">
          <div className="caustic-overlay" />
        </div>
        <div className="relative z-10 container mx-auto px-4 md:px-6 pt-28 pb-12 md:pt-32 md:pb-16">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-white tracking-tight">
              All Species
            </h1>
            <p className="mt-2 text-white/60 text-lg">
              {totalCount.toLocaleString()} marine species across Australia
            </p>
          </div>

          {/* Search */}
          <div className="mt-6 max-w-md relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                updateUrl({ q: e.target.value || null, page: null });
              }}
              className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-coral/40 focus:border-coral backdrop-blur-sm transition-colors"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  updateUrl({ q: null, page: null });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Size filter */}
            <FilterDropdown
              label="Size"
              value={sizeFilter}
              options={Object.entries(SIZE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              onChange={(v) => {
                setSizeFilter(v);
                setPage(1);
                updateUrl({ size: v, page: null });
              }}
            />

            {/* Colour filter */}
            {availableColours.length > 0 && (
              <FilterDropdown
                label="Colour"
                value={colourFilter}
                options={availableColours.map((c) => ({
                  value: c,
                  label: c.charAt(0).toUpperCase() + c.slice(1),
                }))}
                onChange={(v) => {
                  setColourFilter(v);
                  setPage(1);
                  updateUrl({ colour: v, page: null });
                }}
              />
            )}

            {/* Habitat filter */}
            {availableHabitats.length > 0 && (
              <FilterDropdown
                label="Habitat"
                value={habitatFilter}
                options={availableHabitats.map((h) => ({
                  value: h,
                  label: h.charAt(0).toUpperCase() + h.slice(1),
                }))}
                onChange={(v) => {
                  setHabitatFilter(v);
                  setPage(1);
                  updateUrl({ habitat: v, page: null });
                }}
              />
            )}

            {/* Divider */}
            <div className="hidden md:block w-px h-6 bg-slate-200 mx-1" />

            {/* Sort toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button
                onClick={() => {
                  setSortBy("alpha");
                  updateUrl({ sort: null });
                }}
                className={`px-3 py-1.5 transition-colors ${
                  sortBy === "alpha"
                    ? "bg-deep text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                A–Z
              </button>
              <button
                onClick={() => {
                  setSortBy("taxonomic");
                  updateUrl({ sort: "taxonomic" });
                }}
                className={`px-3 py-1.5 transition-colors ${
                  sortBy === "taxonomic"
                    ? "bg-deep text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Taxonomy
              </button>
            </div>

            {/* Clear all */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-coral hover:text-coral/80 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sizeFilter && (
                <FilterPill
                  label={`Size: ${SIZE_LABELS[sizeFilter] ?? sizeFilter}`}
                  onRemove={() => {
                    setSizeFilter(null);
                    setPage(1);
                    updateUrl({ size: null, page: null });
                  }}
                />
              )}
              {colourFilter && (
                <FilterPill
                  label={`Colour: ${colourFilter}`}
                  onRemove={() => {
                    setColourFilter(null);
                    setPage(1);
                    updateUrl({ colour: null, page: null });
                  }}
                />
              )}
              {habitatFilter && (
                <FilterPill
                  label={`Habitat: ${habitatFilter}`}
                  onRemove={() => {
                    setHabitatFilter(null);
                    setPage(1);
                    updateUrl({ habitat: null, page: null });
                  }}
                />
              )}
              <span className="text-sm text-slate-400 self-center ml-1">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Species grid */}
      <section className="bg-sand min-h-[60vh]">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          {paginated.length > 0 ? (
            <ResponsiveGrid columns={{ mobile: 2, desktop: 3 }}>
              {paginated.map((s) => (
                <SpeciesCard
                  key={s.slug}
                  slug={s.slug}
                  commonName={s.name}
                  scientificName={s.scientific_name}
                  heroImageUrl={s.hero_image_url}
                  likelihood="common"
                  dangerNote={s.danger_note}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400 text-lg">No species match your filters.</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-coral hover:text-coral/80 text-sm transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage <= 1}
                className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Previous page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>

              {generatePageNumbers(safePage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p as number)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                      p === safePage
                        ? "bg-deep text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage >= totalPages}
                className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Next page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}

// ─── Helper components ───────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`text-sm rounded-lg border px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-coral/40 ${
        value
          ? "border-coral bg-coral/5 text-deep"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-coral/10 text-coral text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-coral/70 transition-colors" aria-label={`Remove ${label} filter`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </span>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}
