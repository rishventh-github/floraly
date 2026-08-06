/** Flora & fauna discovery cards with IUCN-inspired risk levels (9 tiers). */

export type RiskLevel =
  | "least_concern"
  | "near_threatened"
  | "vulnerable"
  | "endangered"
  | "critically_endangered"
  | "extinct_in_wild"
  | "extinct"
  | "data_deficient"
  | "not_evaluated";

export interface RiskLevelMeta {
  id: RiskLevel;
  label: string;
  shortLabel: string;
  points: number;
  /** Relative weight for lucky-wheel pulls (higher = more common). */
  weight: number;
  glowClass: string;
  badgeClass: string;
  description: string;
}

export interface SpeciesCard {
  id: string;
  name: string;
  type: "flora" | "fauna";
  emoji: string;
  /** URL to a real photo of the species (Wikimedia Commons). */
  imageUrl: string;
  riskLevel: RiskLevel;
  blurb: string;
  habitat: string;
}

/** Nine risk tiers - points 1 (most common) → 9 (most precious / extinct). */
export const RISK_LEVELS: RiskLevelMeta[] = [
  {
    id: "least_concern",
    label: "Least Concern",
    shortLabel: "LC",
    points: 1,
    weight: 420,
    glowClass: "species-glow-lc",
    badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    description: "Widespread and abundant - still worth protecting.",
  },
  {
    id: "near_threatened",
    label: "Near Threatened",
    shortLabel: "NT",
    points: 2,
    weight: 220,
    glowClass: "species-glow-nt",
    badgeClass: "bg-lime-100 text-lime-900 ring-lime-200",
    description: "Likely to become threatened without care.",
  },
  {
    id: "not_evaluated",
    label: "Not Evaluated",
    shortLabel: "NE",
    points: 3,
    weight: 140,
    glowClass: "species-glow-ne",
    badgeClass: "bg-stone-100 text-stone-700 ring-stone-200",
    description: "Not yet assessed - a reminder how much we still don't know.",
  },
  {
    id: "vulnerable",
    label: "Vulnerable",
    shortLabel: "VU",
    points: 4,
    weight: 90,
    glowClass: "species-glow-vu",
    badgeClass: "bg-amber-100 text-amber-900 ring-amber-200",
    description: "Facing a high risk of extinction in the wild.",
  },
  {
    id: "data_deficient",
    label: "Data Deficient",
    shortLabel: "DD",
    points: 5,
    weight: 55,
    glowClass: "species-glow-dd",
    badgeClass: "bg-sky-100 text-sky-900 ring-sky-200",
    description: "Too little information - research and habitat protection matter.",
  },
  {
    id: "endangered",
    label: "Endangered",
    shortLabel: "EN",
    points: 6,
    weight: 35,
    glowClass: "species-glow-en",
    badgeClass: "bg-orange-100 text-orange-900 ring-orange-200",
    description: "Very high risk of extinction in the wild.",
  },
  {
    id: "critically_endangered",
    label: "Critically Endangered",
    shortLabel: "CR",
    points: 7,
    weight: 18,
    glowClass: "species-glow-cr",
    badgeClass: "bg-rose-100 text-rose-900 ring-rose-200",
    description: "Extremely high risk - every remaining population matters.",
  },
  {
    id: "extinct_in_wild",
    label: "Extinct in the Wild",
    shortLabel: "EW",
    points: 8,
    weight: 8,
    glowClass: "species-glow-ew",
    badgeClass: "bg-violet-100 text-violet-900 ring-violet-200",
    description: "Survives only in captivity or cultivation.",
  },
  {
    id: "extinct",
    label: "Extinct",
    shortLabel: "EX",
    points: 9,
    weight: 3,
    glowClass: "species-glow-ex",
    badgeClass: "bg-zinc-800 text-zinc-100 ring-zinc-600",
    description: "Gone forever - a solemn reminder to protect what remains.",
  },
];

const RISK_BY_ID = Object.fromEntries(RISK_LEVELS.map((r) => [r.id, r])) as Record<
  RiskLevel,
  RiskLevelMeta
>;

export function getRiskMeta(level: RiskLevel): RiskLevelMeta {
  return RISK_BY_ID[level];
}

/** Wide catalog of flora & fauna across risk levels. */
export const SPECIES_CATALOG: SpeciesCard[] = [
  // Least Concern
  { id: "oak", name: "English Oak", type: "flora", emoji: "🌳", imageUrl: "/species/oak.jpg", riskLevel: "least_concern", blurb: "A long-lived keystone tree supporting hundreds of species.", habitat: "Temperate forests" },
  { id: "daisy", name: "Common Daisy", type: "flora", emoji: "🌼", imageUrl: "/species/daisy.jpg", riskLevel: "least_concern", blurb: "Cheerful meadow blooms that feed pollinators.", habitat: "Grasslands" },
  { id: "robin", name: "American Robin", type: "fauna", emoji: "🐦", imageUrl: "/species/robin.jpg", riskLevel: "least_concern", blurb: "A familiar songbird and early spring messenger.", habitat: "Woodlands & gardens" },
  { id: "deer", name: "White-tailed Deer", type: "fauna", emoji: "🦌", imageUrl: "/species/deer.jpg", riskLevel: "least_concern", blurb: "Graceful browsers shaping forest understories.", habitat: "Forests & edges" },
  { id: "maple", name: "Sugar Maple", type: "flora", emoji: "🍁", imageUrl: "/species/maple.jpg", riskLevel: "least_concern", blurb: "Iconic autumn color and a sweet sap tradition.", habitat: "Eastern forests" },
  { id: "fox", name: "Red Fox", type: "fauna", emoji: "🦊", imageUrl: "/species/fox.jpg", riskLevel: "least_concern", blurb: "Clever omnivores adapting to wild and urban edges.", habitat: "Mixed habitats" },
  { id: "fern", name: "Sword Fern", type: "flora", emoji: "🌿", imageUrl: "/species/fern.jpg", riskLevel: "least_concern", blurb: "Ancient green architecture of shady forest floors.", habitat: "Damp woodlands" },
  { id: "rabbit", name: "Eastern Cottontail", type: "fauna", emoji: "🐇", imageUrl: "/species/rabbit.jpg", riskLevel: "least_concern", blurb: "A soft reminder that small lives keep ecosystems moving.", habitat: "Fields & scrub" },
  { id: "sunflower", name: "Wild Sunflower", type: "flora", emoji: "🌻", imageUrl: "/species/sunflower.jpg", riskLevel: "least_concern", blurb: "Sun-following blooms rich with seeds for wildlife.", habitat: "Prairies" },
  { id: "owl", name: "Great Horned Owl", type: "fauna", emoji: "🦉", imageUrl: "/species/owl.jpg", riskLevel: "least_concern", blurb: "Night hunters keeping rodent populations in check.", habitat: "Woodlands" },

  // Near Threatened
  { id: "giraffe", name: "Giraffe", type: "fauna", emoji: "🦒", imageUrl: "/species/giraffe.jpg", riskLevel: "near_threatened", blurb: "Tall browsers losing habitat across African savannas.", habitat: "Savanna" },
  { id: "hippo", name: "Hippopotamus", type: "fauna", emoji: "🦛", imageUrl: "/species/hippo.jpg", riskLevel: "near_threatened", blurb: "River giants threatened by hunting and water conflict.", habitat: "African rivers" },
  { id: "lion", name: "Lion", type: "fauna", emoji: "🦁", imageUrl: "/species/lion.jpg", riskLevel: "near_threatened", blurb: "Pride predators squeezed by habitat fragmentation.", habitat: "Savanna" },
  { id: "manatee_west", name: "West Indian Manatee", type: "fauna", emoji: "🦭", imageUrl: "/species/manatee_west.jpg", riskLevel: "near_threatened", blurb: "Gentle sea cows vulnerable to boats and cold snaps.", habitat: "Coastal waters" },
  { id: "cedar", name: "Lebanon Cedar", type: "flora", emoji: "🌲", imageUrl: "/species/cedar.jpg", riskLevel: "near_threatened", blurb: "Historic mountain conifers pressured by logging and climate.", habitat: "Mediterranean mountains" },
  { id: "shark_whale", name: "Whale Shark", type: "fauna", emoji: "🦈", imageUrl: "/species/shark_whale.jpg", riskLevel: "near_threatened", blurb: "The world's largest fish - still declining from bycatch.", habitat: "Tropical oceans" },

  // Not Evaluated
  { id: "moss_glow", name: "Glowing Cave Moss", type: "flora", emoji: "✨", imageUrl: "/species/moss_glow.jpg", riskLevel: "not_evaluated", blurb: "A luminous forest mystery awaiting formal assessment.", habitat: "Damp caves & cliffs" },
  { id: "river_shrimp", name: "Alpine Stream Shrimp", type: "fauna", emoji: "🦐", imageUrl: "/species/river_shrimp.jpg", riskLevel: "not_evaluated", blurb: "Tiny freshwater life rarely studied at high elevations.", habitat: "Mountain streams" },
  { id: "cloud_orchid", name: "Cloud-forest Orchid", type: "flora", emoji: "🌺", imageUrl: "/species/cloud_orchid.jpg", riskLevel: "not_evaluated", blurb: "High canopy blooms with incomplete conservation data.", habitat: "Cloud forests" },
  { id: "night_gecko", name: "Moonlit Leaf Gecko", type: "fauna", emoji: "🦎", imageUrl: "/species/night_gecko.jpg", riskLevel: "not_evaluated", blurb: "Nocturnal climbers known mostly from scattered sightings.", habitat: "Tropical canopy" },

  // Vulnerable
  { id: "panda", name: "Giant Panda", type: "fauna", emoji: "🐼", imageUrl: "/species/panda.jpg", riskLevel: "vulnerable", blurb: "Bamboo specialists recovering slowly with protected forests.", habitat: "Bamboo mountains" },
  { id: "polar", name: "Polar Bear", type: "fauna", emoji: "🐻‍❄️", imageUrl: "/species/polar.jpg", riskLevel: "vulnerable", blurb: "Sea-ice hunters facing a melting Arctic.", habitat: "Arctic sea ice" },
  { id: "cheetah", name: "Cheetah", type: "fauna", emoji: "🐆", imageUrl: "/species/cheetah.jpg", riskLevel: "vulnerable", blurb: "The fastest land mammal, losing open hunting grounds.", habitat: "Grasslands" },
  { id: "baobab", name: "Grandidier's Baobab", type: "flora", emoji: "🌴", imageUrl: "/species/baobab.jpg", riskLevel: "vulnerable", blurb: "Iconic Madagascar trees threatened by fire and farming.", habitat: "Dry forests" },
  { id: "hippocampus", name: "Pacific Seahorse", type: "fauna", emoji: "🐴", imageUrl: "/species/hippocampus.jpg", riskLevel: "vulnerable", blurb: "Delicate reef dwellers taken for trade and tourism.", habitat: "Seagrass & reefs" },
  { id: "redwood", name: "Giant Sequoia", type: "flora", emoji: "🌲", imageUrl: "/species/redwood.jpg", riskLevel: "vulnerable", blurb: "Ancient giants stressed by drought and intense fire.", habitat: "Sierra Nevada" },

  // Data Deficient
  { id: "deep_coral", name: "Abyssal Soft Coral", type: "flora", emoji: "🪸", imageUrl: "/species/deep_coral.jpg", riskLevel: "data_deficient", blurb: "Deep-sea gardens we barely map, let alone protect.", habitat: "Deep ocean" },
  { id: "fog_frog", name: "Mist Plateau Frog", type: "fauna", emoji: "🐸", imageUrl: "/species/fog_frog.jpg", riskLevel: "data_deficient", blurb: "Heard more than seen - population trends unknown.", habitat: "Highland wetlands" },
  { id: "sand_lily", name: "Dune Ghost Lily", type: "flora", emoji: "🤍", imageUrl: "/species/sand_lily.jpg", riskLevel: "data_deficient", blurb: "Sparse desert blooms with incomplete surveys.", habitat: "Coastal dunes" },
  { id: "reef_crab", name: "Sapphire Reef Crab", type: "fauna", emoji: "🦀", imageUrl: "/species/reef_crab.jpg", riskLevel: "data_deficient", blurb: "Colorful scavengers with patchy distribution records.", habitat: "Coral reefs" },

  // Endangered
  { id: "tiger", name: "Tiger", type: "fauna", emoji: "🐯", imageUrl: "/species/tiger.jpg", riskLevel: "endangered", blurb: "Fewer than many city blocks' worth remain in the wild.", habitat: "Asian forests" },
  { id: "elephant_asian", name: "Asian Elephant", type: "fauna", emoji: "🐘", imageUrl: "/species/elephant_asian.jpg", riskLevel: "endangered", blurb: "Forest engineers blocked by shrinking corridors.", habitat: "South & SE Asia" },
  { id: "gorilla", name: "Eastern Gorilla", type: "fauna", emoji: "🦍", imageUrl: "/species/gorilla.jpg", riskLevel: "endangered", blurb: "Great apes pressed by poaching and habitat loss.", habitat: "Central African forests" },
  { id: "rafflesia", name: "Rafflesia", type: "flora", emoji: "🥀", imageUrl: "/species/rafflesia.jpg", riskLevel: "endangered", blurb: "The world's largest flower, dependent on intact rainforest.", habitat: "SE Asian rainforest" },
  { id: "blue_whale", name: "Blue Whale", type: "fauna", emoji: "🐋", imageUrl: "/species/blue_whale.jpg", riskLevel: "endangered", blurb: "The largest animal ever - still recovering from whaling.", habitat: "Open ocean" },
  { id: "pitcher", name: "Giant Pitcher Plant", type: "flora", emoji: "🪴", imageUrl: "/species/pitcher.jpg", riskLevel: "endangered", blurb: "Carnivorous highland plants lost to collection and clearing.", habitat: "Tropical highlands" },

  // Critically Endangered
  { id: "vaquita", name: "Vaquita", type: "fauna", emoji: "🐬", imageUrl: "/species/vaquita.jpg", riskLevel: "critically_endangered", blurb: "The world's rarest marine mammal - only a handful remain.", habitat: "Gulf of California" },
  { id: "rhino_java", name: "Javan Rhino", type: "fauna", emoji: "🦏", imageUrl: "/species/rhino_java.jpg", riskLevel: "critically_endangered", blurb: "A single park holds the last of this ancient lineage.", habitat: "Java rainforest" },
  { id: "orchid_ghost", name: "Ghost Orchid", type: "flora", emoji: "👻", imageUrl: "/species/orchid_ghost.jpg", riskLevel: "critically_endangered", blurb: "Ephemeral blossoms clinging to vanishing swamp canopy.", habitat: "Swamp forests" },
  { id: "kakapo", name: "Kākāpō", type: "fauna", emoji: "🦜", imageUrl: "/species/kakapo.jpg", riskLevel: "critically_endangered", blurb: "Flightless night parrots brought back from the brink.", habitat: "New Zealand islands" },
  { id: "cycad", name: "Wood's Cycad", type: "flora", emoji: "🌴", imageUrl: "/species/cycad.jpg", riskLevel: "critically_endangered", blurb: "Living fossils with almost no remaining wild stands.", habitat: "Southern Africa" },
  { id: "amur", name: "Amur Leopard", type: "fauna", emoji: "🐆", imageUrl: "/species/amur.jpg", riskLevel: "critically_endangered", blurb: "One of the rarest big cats on Earth.", habitat: "Temperate forests" },

  // Extinct in the Wild
  { id: "scimitar", name: "Scimitar Oryx", type: "fauna", emoji: "🦌", imageUrl: "/species/scimitar.jpg", riskLevel: "extinct_in_wild", blurb: "Desert antelope surviving through captive breeding.", habitat: "Sahara (formerly)" },
  { id: "wyoming_toad", name: "Wyoming Toad", type: "fauna", emoji: "🐸", imageUrl: "/species/wyoming_toad.jpg", riskLevel: "extinct_in_wild", blurb: "Kept alive by careful reintroduction programs.", habitat: "Wyoming plains" },
  { id: "franklinia", name: "Franklin Tree", type: "flora", emoji: "🌳", imageUrl: "/species/franklinia.jpg", riskLevel: "extinct_in_wild", blurb: "Known only from gardens since the early 1800s.", habitat: "SE USA (formerly)" },
  { id: "guam_kingfisher", name: "Guam Kingfisher", type: "fauna", emoji: "🐦", imageUrl: "/species/guam_kingfisher.jpg", riskLevel: "extinct_in_wild", blurb: "Island birds wiped out by invasive predators.", habitat: "Guam forests (formerly)" },

  // Extinct
  { id: "dodo", name: "Dodo", type: "fauna", emoji: "🦤", imageUrl: "/species/dodo.jpg", riskLevel: "extinct", blurb: "A flightless island bird lost forever in the 1600s.", habitat: "Mauritius (lost)" },
  { id: "passenger", name: "Passenger Pigeon", type: "fauna", emoji: "🕊️", imageUrl: "/species/passenger.jpg", riskLevel: "extinct", blurb: "Once darkened American skies - hunted to nothing.", habitat: "Eastern forests (lost)" },
  { id: "thylacine", name: "Thylacine", type: "fauna", emoji: "🦘", imageUrl: "/species/thylacine.jpg", riskLevel: "extinct", blurb: "The Tasmanian tiger - last known individual died in 1936.", habitat: "Tasmania (lost)" },
  { id: "silphium", name: "Silphium", type: "flora", emoji: "🌾", imageUrl: "/species/silphium.jpg", riskLevel: "extinct", blurb: "A legendary ancient herb harvested into oblivion.", habitat: "Mediterranean (lost)" },
  { id: "great_auk", name: "Great Auk", type: "fauna", emoji: "🐧", imageUrl: "/species/great_auk.jpg", riskLevel: "extinct", blurb: "Northern seabirds extinguished by hunting for feathers and eggs.", habitat: "North Atlantic (lost)" },
  { id: "stellers_sea_cow", name: "Steller's Sea Cow", type: "fauna", emoji: "🐋", imageUrl: "/species/stellers_sea_cow.jpg", riskLevel: "extinct", blurb: "Gentle giants gone within decades of European contact.", habitat: "Bering Sea (lost)" },
];

const SPECIES_BY_ID = Object.fromEntries(
  SPECIES_CATALOG.map((s) => [s.id, s])
) as Record<string, SpeciesCard>;

export function getSpeciesById(id: string): SpeciesCard | undefined {
  return SPECIES_BY_ID[id];
}

/** Prefer catalog fields (esp. local imageUrl) over any stale stored sticker. */
export function resolveSpeciesCard(card: SpeciesCard): SpeciesCard {
  const fresh = getSpeciesById(card.id);
  return fresh ? { ...card, ...fresh } : card;
}

export function speciesPoints(card: SpeciesCard): number {
  return getRiskMeta(card.riskLevel).points;
}

/** Weighted random pull - rarer risk levels appear far less often. */
export function spinSpeciesWheel(rng: () => number = Math.random): SpeciesCard {
  const totalWeight = RISK_LEVELS.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng() * totalWeight;
  let chosenLevel: RiskLevel = "least_concern";
  for (const level of RISK_LEVELS) {
    roll -= level.weight;
    if (roll <= 0) {
      chosenLevel = level.id;
      break;
    }
  }
  const pool = SPECIES_CATALOG.filter((s) => s.riskLevel === chosenLevel);
  if (pool.length === 0) return SPECIES_CATALOG[0];
  return pool[Math.floor(rng() * pool.length)];
}

export function collectionPoints(speciesIds: string[]): number {
  return speciesIds.reduce((sum, id) => {
    const card = getSpeciesById(id);
    return sum + (card ? speciesPoints(card) : 0);
  }, 0);
}
