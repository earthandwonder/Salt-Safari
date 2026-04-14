"use client";

import { useState, useCallback } from "react";
import { Marker, Popup } from "react-map-gl/mapbox";
import { MapView, MapPin } from "@/components/MapView";
import Link from "next/link";
import type { RegionLocation } from "./page";

interface RegionMapTabProps {
  locations: RegionLocation[];
  regionSlug: string;
  regionName: string;
}

type PopupInfo = {
  location: RegionLocation;
  longitude: number;
  latitude: number;
};

export function RegionMapTab({ locations, regionSlug, regionName }: RegionMapTabProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

  const handleMarkerClick = useCallback((loc: RegionLocation) => {
    if (loc.lat == null || loc.lng == null) return;
    setPopupInfo({
      location: loc,
      longitude: loc.lng,
      latitude: loc.lat,
    });
  }, []);

  const mappableLocations = locations.filter((loc) => loc.lat != null && loc.lng != null);

  if (mappableLocations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
        <p className="text-slate-500 text-sm">
          No map coordinates available for locations in {regionName}.
        </p>
      </div>
    );
  }

  // Calculate bounds to fit all locations
  const lats = mappableLocations.map((l) => l.lat!);
  const lngs = mappableLocations.map((l) => l.lng!);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const spread = Math.max(latSpread, lngSpread);
  let zoom = 12;
  if (spread > 2) zoom = 8;
  else if (spread > 1) zoom = 9;
  else if (spread > 0.5) zoom = 10;
  else if (spread > 0.2) zoom = 11;
  else if (spread > 0.05) zoom = 12;
  else zoom = 13;

  return (
    <div className="space-y-6">
      <MapView center={{ lat: centerLat, lng: centerLng }} zoom={zoom} height={500}>
        {mappableLocations.map((loc) => (
          <Marker
            key={loc.id}
            longitude={loc.lng!}
            latitude={loc.lat!}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(loc);
            }}
          >
            <div className="cursor-pointer group">
              <MapPin size="default" />
            </div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={[0, -40]}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="region-map-popup"
          >
            <div className="p-1 min-w-[160px]">
              <Link
                href={`/locations/${regionSlug}/${popupInfo.location.slug}`}
                className="block hover:bg-slate-50 rounded-lg p-2 -m-1 transition-colors"
              >
                <h4 className="font-display text-sm font-semibold text-deep leading-tight">
                  {popupInfo.location.name}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-slate-500">
                    {popupInfo.location.speciesCount} species
                  </span>
                  {popupInfo.location.inSeasonCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {popupInfo.location.inSeasonCount} in season
                    </span>
                  )}
                </div>
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-coral font-medium">
                  View location
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Link>
            </div>
          </Popup>
        )}
      </MapView>

      {/* Location list below map */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mappableLocations.map((loc) => (
          <Link
            key={loc.id}
            href={`/locations/${regionSlug}/${loc.slug}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4845F" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-semibold text-deep truncate">
                {loc.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">
                  {loc.speciesCount} species
                </span>
                {loc.inSeasonCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {loc.inSeasonCount} in season
                  </span>
                )}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
