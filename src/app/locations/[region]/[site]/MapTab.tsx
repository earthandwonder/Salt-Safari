"use client";

import { useRef, useCallback } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { LocationCard } from "@/components/LocationCard";
import type { Location } from "@/types";

type NearbyLocation = {
  id: string;
  name: string;
  slug: string;
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

export function MapTab({ lat, lng, locationName, nearbyLocations, regionSlug }: MapTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenInMaps = useCallback(() => {
    if (lat == null || lng == null) return;
    // Universal link — works on iOS (Apple Maps), Android (Google Maps), desktop (Google Maps)
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

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className="space-y-10">
      {/* Map container */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        {mapboxToken ? (
          <Map
            initialViewState={{
              longitude: lng,
              latitude: lat,
              zoom: 14,
            }}
            style={{ width: "100%", height: 420 }}
            mapStyle="mapbox://styles/mapbox/outdoors-v12"
            mapboxAccessToken={mapboxToken}
            scrollZoom={false}
            attributionControl={false}
          >
            <NavigationControl position="top-right" />
            <Marker longitude={lng} latitude={lat} anchor="bottom">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-coral border-[3px] border-white shadow-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                </div>
                <div className="mt-1 px-2 py-0.5 rounded bg-white shadow-md text-[11px] font-semibold text-deep whitespace-nowrap">
                  {locationName}
                </div>
              </div>
            </Marker>
          </Map>
        ) : (
          <div
            className="w-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm"
            style={{ height: 420 }}
          >
            Map unavailable — Mapbox token not configured
          </div>
        )}
      </div>

      {/* Open in Maps button */}
      <div className="flex justify-center">
        <button
          onClick={handleOpenInMaps}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-sm font-medium text-deep hover:bg-slate-50 transition-colors shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
              <div key={loc.id} className="flex-shrink-0 w-[260px] md:w-[280px]">
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
