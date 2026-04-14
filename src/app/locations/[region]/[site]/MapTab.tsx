"use client";

import { useRef, useCallback } from "react";
import { Marker } from "react-map-gl/mapbox";
import { MapView, MapPin, MapPinSecondary } from "@/components/MapView";
import { LocationCard } from "@/components/LocationCard";
import type { Location } from "@/types";

type NearbyLocation = {
  id: string;
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  hero_image_url: string | null;
  skill_level: Location["skill_level"];
  depth_min: number | null;
  depth_max: number | null;
  activities: string[];
  speciesCount: number;
  inSeasonCount: number;
};

interface MapTabProps {
  lat: number | null;
  lng: number | null;
  locationName: string;
  nearbyLocations: NearbyLocation[];
  regionSlug: string;
}

export function MapTab({
  lat,
  lng,
  locationName,
  nearbyLocations,
  regionSlug,
}: MapTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenInMaps = useCallback(() => {
    if (lat == null || lng == null) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [lat, lng]);

  if (lat == null || lng == null) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
        <p className="text-slate-500 text-sm">
          Map coordinates not available for this location.
        </p>
      </div>
    );
  }

  // Calculate zoom to fit nearby locations if any have coordinates
  const nearbyWithCoords = nearbyLocations.filter(
    (l) => l.lat != null && l.lng != null
  );
  let zoom = 14;
  if (nearbyWithCoords.length > 0) {
    const allLats = [lat, ...nearbyWithCoords.map((l) => l.lat!)];
    const allLngs = [lng, ...nearbyWithCoords.map((l) => l.lng!)];
    const latSpread = Math.max(...allLats) - Math.min(...allLats);
    const lngSpread = Math.max(...allLngs) - Math.min(...allLngs);
    const spread = Math.max(latSpread, lngSpread);
    if (spread > 2) zoom = 8;
    else if (spread > 1) zoom = 9;
    else if (spread > 0.5) zoom = 10;
    else if (spread > 0.2) zoom = 11;
    else if (spread > 0.05) zoom = 12;
    else if (spread > 0.01) zoom = 13;
    else zoom = 14;
  }

  return (
    <div className="space-y-10">
      <MapView center={{ lat, lng }} zoom={zoom} height={420}>
        {/* Nearby location pins (rendered first so primary pin sits on top) */}
        {nearbyWithCoords.map((loc) => (
          <Marker
            key={loc.id}
            longitude={loc.lng!}
            latitude={loc.lat!}
            anchor="bottom"
          >
            <MapPinSecondary label={loc.name} />
          </Marker>
        ))}

        {/* Primary location pin */}
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <MapPin label={locationName} />
        </Marker>
      </MapView>

      {/* Open in Maps button */}
      <div className="flex justify-center">
        <button
          onClick={handleOpenInMaps}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-sm font-medium text-deep hover:bg-slate-50 transition-colors shadow-sm"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open in Maps
        </button>
      </div>

      {/* Nearby locations */}
      {nearbyLocations.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-deep mb-4">
            Nearby locations
          </h3>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6"
          >
            {nearbyLocations.map((loc) => (
              <div
                key={loc.id}
                className="flex-shrink-0 w-[260px] md:w-[280px]"
              >
                <LocationCard
                  regionSlug={regionSlug}
                  slug={loc.slug}
                  name={loc.name}
                  heroImageUrl={loc.hero_image_url}
                  speciesCount={loc.speciesCount}
                  skillLevel={loc.skill_level}
                  depthMin={loc.depth_min}
                  depthMax={loc.depth_max}
                  activities={loc.activities}
                  inSeasonCount={loc.inSeasonCount}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
