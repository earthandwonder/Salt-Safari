export type SpotterTier = {
  name: string;
  minSpecies: number;
  maxSpecies: number | null;
};

const TIERS: SpotterTier[] = [
  { name: "Landlubber", minSpecies: 0, maxSpecies: 0 },
  { name: "Beachcomber", minSpecies: 1, maxSpecies: 5 },
  { name: "Rockpool Ranger", minSpecies: 6, maxSpecies: 15 },
  { name: "Reef Scout", minSpecies: 16, maxSpecies: 30 },
  { name: "Current Rider", minSpecies: 31, maxSpecies: 50 },
  { name: "Kelp Keeper", minSpecies: 51, maxSpecies: 75 },
  { name: "Tide Master", minSpecies: 76, maxSpecies: 100 },
  { name: "Sea Legend", minSpecies: 101, maxSpecies: null },
];

export function getSpotterTier(speciesCount: number): SpotterTier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (speciesCount >= TIERS[i].minSpecies) {
      return TIERS[i];
    }
  }
  return TIERS[0];
}
