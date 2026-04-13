"use client";

import { useState, useMemo } from "react";
import { LocationCard } from "@/components/LocationCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { RegionLocation } from "./page";

interface LocationsTabProps {
  locations: RegionLocation[];
  regionSlug: string;
  regionName: string;
}

type SortOption = "name" | "species" | "in-season";
type ActivityFilter = "all" | "snorkelling" | "diving" | "freediving";
type SkillFilter = "all" | "beginner" | "intermediate" | "advanced";

export function LocationsTab({ locations, regionSlug, regionName }: LocationsTabProps) {
  const [sortBy, setSortBy] = useState<SortOption>("species");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [skillFilter, setSkillFilter] = useState<SkillFilter>("all");

  const filteredLocations = useMemo(() => {
    let result = [...locations];

    // Activity filter
    if (activityFilter !== "all") {
      result = result.filter((loc) =>
        loc.activities.some((a) => a.toLowerCase() === activityFilter)
      );
    }

    // Skill filter
    if (skillFilter !== "all") {
      result = result.filter((loc) => loc.skill_level === skillFilter);
    }

    // Sort
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "species":
        result.sort((a, b) => b.speciesCount - a.speciesCount);
        break;
      case "in-season":
        result.sort((a, b) => b.inSeasonCount - a.inSeasonCount);
        break;
    }

    return result;
  }, [locations, sortBy, activityFilter, skillFilter]);

  // Extract available activities from data
  const availableActivities = useMemo(() => {
    const activities = new Set<string>();
    for (const loc of locations) {
      for (const a of loc.activities) {
        activities.add(a.toLowerCase());
      }
    }
    return Array.from(activities);
  }, [locations]);

  // Extract available skill levels
  const availableSkills = useMemo(() => {
    const skills = new Set<string>();
    for (const loc of locations) {
      if (loc.skill_level) skills.add(loc.skill_level);
    }
    return Array.from(skills);
  }, [locations]);

  const hasFilters = activityFilter !== "all" || skillFilter !== "all";

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Activity filter */}
        {availableActivities.length > 1 && (
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-deep font-body focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
          >
            <option value="all">All activities</option>
            {availableActivities.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
        )}

        {/* Skill filter */}
        {availableSkills.length > 1 && (
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value as SkillFilter)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-deep font-body focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
          >
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-deep font-body focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
        >
          <option value="species">Most species</option>
          <option value="in-season">Most in season</option>
          <option value="name">Alphabetical</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setActivityFilter("all");
              setSkillFilter("all");
            }}
            className="text-xs text-coral hover:text-coral-dark transition-colors font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-400 mb-4">
        {filteredLocations.length} {filteredLocations.length === 1 ? "location" : "locations"}
        {hasFilters ? " matching" : ` in ${regionName}`}
      </p>

      {/* Grid */}
      {filteredLocations.length > 0 ? (
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          {filteredLocations.map((loc) => (
            <LocationCard
              key={loc.id}
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
          ))}
        </ResponsiveGrid>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
          <p className="text-slate-500 text-sm">
            No locations match your filters.
          </p>
          <button
            onClick={() => {
              setActivityFilter("all");
              setSkillFilter("all");
            }}
            className="mt-3 text-sm text-coral hover:text-coral-dark font-medium transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
