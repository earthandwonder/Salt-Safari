// TypeScript types matching the Salt Safari database schema
// Source of truth: supabase/migrations/20260411000000_initial_schema.sql

export type Region = {
  id: string;
  name: string;
  country: string;
  slug: string;
  description: string | null;
  description_status: "draft" | "reviewed" | "published";
  hero_image_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  region_id: string;
  name: string;
  slug: string;
  aliases: string[];
  lat: number | null;
  lng: number | null;
  radius_km: number;
  coords_source: string | null;
  activities: string[];
  skill_level: "beginner" | "intermediate" | "advanced" | null;
  depth_min: number | null;
  depth_max: number | null;
  access_notes: string | null;
  description: string | null;
  description_source: "stub" | "ai_draft" | "human" | "ai_reviewed";
  description_status: "draft" | "reviewed" | "published";
  hero_image_url: string | null;
  data_quality: "stub" | "partial" | "complete";
  source: string | null;
  published: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Species = {
  id: string;
  name: string;
  scientific_name: string | null;
  slug: string;
  inat_taxon_id: number | null;
  worms_aphia_id: number | null;
  taxon_id_ala: string | null;
  kingdom: string | null;
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  summary: string | null;
  deep_dive: string | null;
  deep_dive_status: "draft" | "reviewed" | "published";
  hero_image_url: string | null;
  size_category: "tiny" | "small" | "medium" | "large" | "very_large" | null;
  colours: string[];
  habitat: string[];
  behaviour_tags: string[];
  max_length_cm: number | null;
  depth_min_m: number | null;
  depth_max_m: number | null;
  depth_common_min_m: number | null;
  depth_common_max_m: number | null;
  habitat_type: string | null;
  iucn_category: string | null;
  is_endemic: boolean | null;
  is_native: boolean | null;
  is_introduced: boolean | null;
  is_charismatic: boolean;
  data_quality: "stub" | "partial" | "complete";
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type LocationSpecies = {
  id: string;
  location_id: string;
  species_id: string;
  confidence: number | null;
  total_observations: number;
  observer_count: number | null;
  first_observed_month: number | null;
  last_observed_month: number | null;
  season_notes: string | null;
  verified: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SourceRecord = {
  id: string;
  location_species_id: string;
  source: "inaturalist" | "ala" | "obis" | "gbif" | "manual" | "community_report";
  source_dataset: string | null;
  observation_count: number;
  basis_of_record: string | null;
  license: string | null;
  last_queried: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
};

export type SpeciesSeasonality = {
  id: string;
  location_species_id: string;
  month: number;
  likelihood: "common" | "occasional" | "rare";
  raw_observation_count: number | null;
  normalized_frequency: number | null;
  total_effort_that_month: number | null;
  source: "inaturalist_data" | "ala_data" | "local_knowledge" | "community";
  last_synced_at: string | null;
};

export type Photographer = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  referral_code: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  url: string;
  alt_text: string | null;
  photographer_name: string;
  photographer_id: string | null;
  license: string;
  license_url: string | null;
  source: "wikimedia" | "flickr" | "inaturalist" | "csiro" | "gbrmpa" | "partner" | "commissioned" | "community";
  source_url: string | null;
  date_accessed: string | null;
  inaturalist_obs_id: number | null;
  location_id: string | null;
  species_id: string | null;
  is_hero: boolean;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  username: string | null;
  display_name: string | null;
  has_purchased_id: boolean;
  stripe_customer_id: string | null;
  stripe_payment_id: string | null;
  referred_by: string | null;
  favourite_locations: string[];
  notification_prefs: "email" | "push" | "none";
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type SpeciesAlert = {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string | null;
  enabled: boolean;
  created_at: string;
};

export type Sighting = {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  sighted_at: string;
  quantity: number;
  notes: string | null;
  created_at: string;
};
