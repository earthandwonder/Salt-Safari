"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type SpeciesOption = {
  id: string;
  name: string;
  scientificName: string | null;
};

interface LogSightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (speciesId: string) => void;
  locationId: string;
  locationName: string;
  speciesList: SpeciesOption[];
  /** Pre-select a species (e.g. from quick-log on a card). */
  preSelectedSpeciesId?: string | null;
}

export function LogSightingModal({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  locationName,
  speciesList,
  preSelectedSpeciesId,
}: LogSightingModalProps) {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens / pre-selected species changes
  useEffect(() => {
    if (isOpen) {
      if (preSelectedSpeciesId) {
        setSelectedSpeciesId(preSelectedSpeciesId);
        const sp = speciesList.find((s) => s.id === preSelectedSpeciesId);
        setSearch(sp ? sp.name : "");
        setDropdownOpen(false);
      } else {
        setSelectedSpeciesId("");
        setSearch("");
        setDropdownOpen(false);
      }
      setDate(new Date().toISOString().split("T")[0]);
      setQuantity(1);
      setNotes("");
      setSubmitting(false);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, preSelectedSpeciesId, speciesList]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [dropdownOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const filteredSpecies = search.trim()
    ? speciesList.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.scientificName?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : speciesList;

  const handleSelect = useCallback(
    (sp: SpeciesOption) => {
      setSelectedSpeciesId(sp.id);
      setSearch(sp.name);
      setDropdownOpen(false);
    },
    []
  );

  const handleSubmit = async () => {
    if (!selectedSpeciesId) {
      setError("Please select a species.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sightings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speciesId: selectedSpeciesId,
          locationId,
          sightedAt: date,
          quantity,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to log sighting");
      }

      setSuccess(true);
      onSuccess(selectedSpeciesId);
      // Auto-close modal after brief success feedback
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-lg font-semibold text-deep">
              Log a Sighting
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{locationName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {success ? (
          /* ── Success state ───────────────────── */
          <div className="p-6 text-center py-12">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-deep mb-1">Sighting logged!</h3>
            <p className="text-sm text-slate-500">
              Added to your collection at {locationName}.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-full bg-deep text-white text-sm font-medium hover:bg-deep/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form ────────────────────────────── */
          <div className="p-6 space-y-5">
            {/* Species picker */}
            <div ref={dropdownRef}>
              <label className="block text-sm font-medium text-deep mb-1.5">
                Species <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedSpeciesId("");
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search for a species..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-slate-200 text-base sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>

              {dropdownOpen && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredSpecies.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">No species found</p>
                  ) : (
                    filteredSpecies.slice(0, 50).map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => handleSelect(sp)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-b-0 ${
                          selectedSpeciesId === sp.id ? "bg-teal-50" : ""
                        }`}
                      >
                        <span className="block text-sm font-medium text-deep leading-tight">
                          {sp.name}
                        </span>
                        {sp.scientificName && (
                          <span className="block text-xs text-slate-400 italic mt-0.5">
                            {sp.scientificName}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-deep mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-base sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-deep mb-1.5">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-deep w-8 text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-deep mb-1.5">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Spotted under a rocky ledge at 6m..."
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-base sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedSpeciesId}
              className="w-full py-3 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors shadow-lg shadow-coral/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Logging..." : "Log Sighting"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
