"use client";

import Image from "next/image";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { Photo } from "@/types";

interface PhotosTabProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
}

export function PhotosTab({ photos, onPhotoClick }: PhotosTabProps) {
  return (
    <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick(photo)}
          className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
        >
          <Image
            src={photo.url}
            alt={photo.alt_text ?? "Species photo"}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Hover overlay with photographer credit */}
          <div className="absolute inset-0 bg-gradient-to-t from-deep/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white/90 text-xs truncate">
                {photo.photographer_name}
              </p>
            </div>
          </div>
        </button>
      ))}
    </ResponsiveGrid>
  );
}
