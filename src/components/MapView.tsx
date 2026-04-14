"use client";

import { type ReactNode, type CSSProperties } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  children?: ReactNode;
  style?: CSSProperties;
}

export function MapView({
  center,
  zoom = 14,
  height = 420,
  children,
  style,
}: MapViewProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    return (
      <div
        className="w-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm rounded-2xl"
        style={{ height, ...style }}
      >
        Map unavailable — Mapbox token not configured
      </div>
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
