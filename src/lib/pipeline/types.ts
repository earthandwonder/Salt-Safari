// Shared types for the multi-source species data pipeline

export type PipelineSource = "inaturalist" | "ala" | "obis" | "gbif" | "manual";

export type RawSpeciesRecord = {
  scientificName: string;
  commonName: string | null;
  inatTaxonId: number | null;
  wormsAphiaId: number | null;
  observationCount: number;
  photoUrl: string | null;
  source: PipelineSource;
  // Taxonomic hierarchy (populated by iNaturalist, partially by others)
  kingdom: string | null;
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  // Conservation / origin flags (from iNaturalist preferred_place_id)
  isEndemic: boolean | null;
  isNative: boolean | null;
  isIntroduced: boolean | null;
};

export type SeasonalityData = {
  month: number; // 1-12
  observationCount: number;
};

export type PipelineResult = {
  source: PipelineSource;
  location: { lat: number; lng: number; radiusKm: number };
  species: RawSpeciesRecord[];
  errors: PipelineError[];
  queriedAt: string; // ISO timestamp
};

export type PipelineError = {
  type: "rate_limit" | "server_error" | "client_error" | "network_error";
  message: string;
  url: string;
  statusCode?: number;
};

export type LocationQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export type INaturalistSpeciesQuery = LocationQuery & {
  taxonIds: string; // comma-separated taxon IDs
};

export type INaturalistSeasonalityQuery = LocationQuery & {
  taxonId: number;
};
