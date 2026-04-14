"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SpeciesResult {
  type: "species";
  slug: string;
  name: string;
  scientific_name: string | null;
  hero_image_url: string | null;
}

interface LocationResult {
  type: "location";
  slug: string;
  name: string;
  region_slug: string;
  region_name: string;
  hero_image_url: string | null;
}

type SearchResult = SpeciesResult | LocationResult;

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const locations = results.filter((r): r is LocationResult => r.type === "location");
  const species = results.filter((r): r is SpeciesResult => r.type === "species");
  const allItems = [...locations, ...species];

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setOpen(true);
          setActiveIndex(-1);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navigateTo = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      if (result.type === "location") {
        router.push(`/locations/${result.region_slug}/${result.slug}`);
      } else {
        router.push(`/species/${result.slug}`);
      }
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || allItems.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          navigateTo(allItems[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
          width="15"
          height="15"
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
          ref={inputRef}
          type="text"
          placeholder="Search species or locations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/40 focus:bg-white/15 backdrop-blur-sm transition-all"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-deep/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-[110]"
          style={{ minWidth: "280px" }}
          role="listbox"
        >
          {allItems.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-white/40 text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
              {/* Locations section */}
              {locations.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1.5">
                    <span className="text-[11px] font-medium tracking-widest uppercase text-teal-400/70">
                      Locations
                    </span>
                  </div>
                  {locations.map((loc, i) => {
                    const idx = i;
                    return (
                      <button
                        key={`loc-${loc.slug}`}
                        onClick={() => navigateTo(loc)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          activeIndex === idx
                            ? "bg-white/10"
                            : "hover:bg-white/6"
                        }`}
                        role="option"
                        aria-selected={activeIndex === idx}
                      >
                        <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {loc.hero_image_url ? (
                            <Image
                              src={loc.hero_image_url}
                              alt=""
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal-400/60">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{loc.name}</p>
                          <p className="text-white/40 text-xs truncate">{loc.region_name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Species section */}
              {species.length > 0 && (
                <div>
                  {locations.length > 0 && (
                    <div className="mx-3 border-t border-white/8" />
                  )}
                  <div className="px-3 pt-3 pb-1.5">
                    <span className="text-[11px] font-medium tracking-widest uppercase text-coral/70">
                      Species
                    </span>
                  </div>
                  {species.map((sp, i) => {
                    const idx = locations.length + i;
                    return (
                      <button
                        key={`sp-${sp.slug}`}
                        onClick={() => navigateTo(sp)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          activeIndex === idx
                            ? "bg-white/10"
                            : "hover:bg-white/6"
                        }`}
                        role="option"
                        aria-selected={activeIndex === idx}
                      >
                        <div className="w-9 h-9 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {sp.hero_image_url ? (
                            <Image
                              src={sp.hero_image_url}
                              alt=""
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-coral/50">
                              <path d="M2 16s2-2 4-2 4 2 6 2 4-2 6-2 4 2 4 2" />
                              <path d="M2 12s2-2 4-2 4 2 6 2 4-2 6-2 4 2 4 2" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{sp.name}</p>
                          {sp.scientific_name && (
                            <p className="text-white/35 text-xs italic truncate">{sp.scientific_name}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Keyboard hint */}
          <div className="px-3 py-2 border-t border-white/6 flex items-center gap-3 text-[11px] text-white/25">
            <span><kbd className="px-1 py-0.5 rounded border border-white/10 text-[10px]">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded border border-white/10 text-[10px]">↵</kbd> select</span>
            <span><kbd className="px-1 py-0.5 rounded border border-white/10 text-[10px]">esc</kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
}
