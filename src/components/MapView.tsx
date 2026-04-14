"use client";

import { type ReactNode, type CSSProperties, useState, useCallback } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  children?: ReactNode;
  style?: CSSProperties;
}

function CoordinateFallback({
  center,
  height,
  style,
}: {
  center: { lat: number; lng: number };
  height: number;
  style?: CSSProperties;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`;

  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl"
      style={{ height, ...style }}
    >
      <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4845F" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-deep">
          {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
        </p>
        <p className="text-xs text-slate-400 mt-1">Map could not be loaded</p>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-medium text-deep hover:bg-slate-50 transition-colors shadow-sm"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Open in Google Maps
      </a>
    </div>
  );
}

export function MapView({
  center,
  zoom = 14,
  height = 420,
  children,
  style,
}: MapViewProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [mapError, setMapError] = useState(false);

  const handleError = useCallback(() => {
    setMapError(true);
  }, []);

  if (!mapboxToken || mapError) {
    return (
      <CoordinateFallback center={center} height={height} style={style} />
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <Map
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        }}
        style={{ width: "100%", height, ...style }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={mapboxToken}
        scrollZoom={false}
        attributionControl={false}
        onError={handleError}
      >
        <NavigationControl position="top-right" />
        {children}
      </Map>
    </div>
  );
}

/** Coral pin marker with optional label */
export function MapPin({
  label,
  size = "default",
}: {
  label?: string;
  size?: "default" | "small";
}) {
  const pinSize = size === "small" ? "w-5 h-5" : "w-8 h-8";
  const borderWidth = size === "small" ? "border-2" : "border-[3px]";
  const iconSize = size === "small" ? 10 : 14;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${pinSize} rounded-full bg-coral ${borderWidth} border-white shadow-lg flex items-center justify-center`}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        </svg>
      </div>
      {label && (
        <div className="mt-1 px-2 py-0.5 rounded bg-white shadow-md text-[11px] font-semibold text-deep whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}

/** Teal pin for secondary/nearby locations */
export function MapPinSecondary({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-5 h-5 rounded-full bg-teal-500 border-2 border-white shadow-md flex items-center justify-center">
        <svg width={10} height={10} viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        </svg>
      </div>
      {label && (
        <div className="mt-0.5 px-1.5 py-0.5 rounded bg-white/90 shadow-sm text-[10px] font-medium text-deep whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}
