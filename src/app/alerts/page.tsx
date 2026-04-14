"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";
import { createClient } from "@/lib/supabase/client";

type AlertRow = {
  id: string;
  species_id: string;
  location_id: string | null;
  enabled: boolean;
  created_at: string;
  species: {
    id: string;
    name: string;
    scientific_name: string | null;
    slug: string;
    hero_image_url: string | null;
  } | null;
  locations: {
    id: string;
    name: string;
    slug: string;
    region_id: string;
  } | null;
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirectTo=%2Falerts");
        return;
      }

      setIsAuthenticated(true);
      await fetchAlerts();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = useCallback(
    async (id: string, currentEnabled: boolean) => {
      setToggling((prev) => new Set([...prev, id]));
      try {
        const res = await fetch(`/api/alerts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !currentEnabled }),
        });
        if (res.ok) {
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === id ? { ...a, enabled: !currentEnabled } : a
            )
          );
        }
      } finally {
        setToggling((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting((prev) => new Set([...prev, id]));
      try {
        const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
        if (res.ok) {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }
      } finally {
        setDeleting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    []
  );

  if (!isAuthenticated && !loading) return null;

  return (
    <div className="min-h-screen bg-sand">
      <Header />

      {/* Hero */}
      <section className="relative w-full pt-28 pb-16 md:pt-32 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 hero-gradient">
          <div className="caustic-overlay" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Season Alerts
          </h1>
          <p className="mt-3 text-white/60 text-sm md:text-base max-w-md mx-auto">
            Get notified when your favourite species come into season.
          </p>
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-white border border-slate-100 p-5 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0D9488"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-deep mb-2">
              No alerts yet
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Browse species at a location and tap the bell icon to get notified
              when they come into season.
            </p>
            <Link
              href="/locations"
              className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors"
            >
              Explore locations
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">
              <span className="font-semibold text-deep">{alerts.length}</span>{" "}
              alert{alerts.length !== 1 ? "s" : ""}
            </p>

            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl bg-white border border-slate-100 p-4 md:p-5 flex items-center gap-4 transition-opacity ${
                  deleting.has(alert.id) ? "opacity-50" : ""
                }`}
              >
                {/* Species photo */}
                <Link
                  href={`/species/${alert.species?.slug ?? ""}`}
                  className="flex-shrink-0"
                >
                  {alert.species?.hero_image_url ? (
                    <Image
                      src={alert.species.hero_image_url}
                      alt={alert.species.name}
                      width={64}
                      height={64}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg photo-placeholder-species" />
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/species/${alert.species?.slug ?? ""}`}
                    className="font-display text-sm md:text-base font-semibold text-deep hover:text-teal-700 transition-colors truncate block"
                  >
                    {alert.species?.name ?? "Unknown species"}
                  </Link>
                  {alert.species?.scientific_name && (
                    <p className="text-xs text-slate-400 italic truncate">
                      {alert.species.scientific_name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    at {alert.locations?.name ?? "Unknown location"}
                  </p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(alert.id, alert.enabled)}
                  disabled={toggling.has(alert.id)}
                  className="flex-shrink-0"
                  aria-label={
                    alert.enabled ? "Disable alert" : "Enable alert"
                  }
                >
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      alert.enabled ? "bg-teal-500" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        alert.enabled ? "translate-x-5.5 left-auto right-0.5" : "translate-x-0 left-0.5"
                      }`}
                      style={{
                        transform: `translateX(${alert.enabled ? "22px" : "0px"})`,
                        left: "2px",
                      }}
                    />
                  </div>
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(alert.id)}
                  disabled={deleting.has(alert.id)}
                  className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1"
                  aria-label="Delete alert"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
