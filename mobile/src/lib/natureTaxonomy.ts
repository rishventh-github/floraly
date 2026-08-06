import { NATURE_TAGS } from "./constants";
import type { NatureTag } from "./types";

/** Maps colloquial terms and synonyms to canonical nature tags. */
export const TAG_SYNONYMS: Record<string, NatureTag> = {
  water: "water",
  lake: "water",
  lakes: "water",
  river: "water",
  rivers: "water",
  waterfall: "water",
  waterfalls: "water",
  stream: "water",
  streams: "water",
  pond: "water",
  ponds: "water",
  // Common misspellings
  watter: "water",
  waterr: "water",
  forrest: "forests",
  forrests: "forests",
  forst: "forests",
  moutain: "mountains",
  moutains: "mountains",
  mountian: "mountains",
  mountians: "mountains",
  wilflife: "wildlife",
  wildife: "wildlife",
  wildllife: "wildlife",
  campfiree: "campfires",
  campfir: "campfires",
  sunsett: "sunsets",
  floweres: "flowers",
  desrt: "desert",
  snoww: "snow",
  costal: "coast",
  coastl: "coast",
  ocean: "coast",
  sea: "coast",
  beach: "coast",
  beaches: "coast",
  coastal: "coast",
  shore: "coast",
  shoreline: "coast",
  cliff: "coast",
  cliffs: "coast",
  forest: "forests",
  forests: "forests",
  tree: "forests",
  trees: "forests",
  woods: "forests",
  woodland: "forests",
  woodlands: "forests",
  redwood: "forests",
  redwoods: "forests",
  jungle: "forests",
  canopy: "forests",
  trail: "forests",
  trails: "forests",
  mountain: "mountains",
  mountains: "mountains",
  peak: "mountains",
  peaks: "mountains",
  alpine: "mountains",
  valley: "mountains",
  valleys: "mountains",
  summit: "mountains",
  summits: "mountains",
  hike: "mountains",
  hiking: "mountains",
  wildlife: "wildlife",
  animal: "wildlife",
  animals: "wildlife",
  deer: "wildlife",
  bird: "wildlife",
  birds: "wildlife",
  bear: "wildlife",
  bears: "wildlife",
  moose: "wildlife",
  elk: "wildlife",
  campfire: "campfires",
  campfires: "campfires",
  camping: "campfires",
  campsite: "campfires",
  campsites: "campfires",
  fire: "campfires",
  bonfire: "campfires",
  sunset: "sunsets",
  sunsets: "sunsets",
  sunrise: "sunsets",
  "golden hour": "sunsets",
  dusk: "sunsets",
  dawn: "sunsets",
  sky: "sunsets",
  flower: "flowers",
  flowers: "flowers",
  bloom: "flowers",
  blooms: "flowers",
  meadow: "flowers",
  meadows: "flowers",
  wildflower: "flowers",
  wildflowers: "flowers",
  blossom: "flowers",
  desert: "desert",
  deserts: "desert",
  dune: "desert",
  dunes: "desert",
  arid: "desert",
  sand: "desert",
  canyon: "desert",
  snow: "snow",
  snowy: "snow",
  winter: "snow",
  frost: "snow",
  icy: "snow",
  glacier: "snow",
  glaciers: "snow",
  snowcap: "snow",
  snowcaps: "snow",
  coast: "coast",
};

export const VALID_TAGS = NATURE_TAGS.map((t) => t.id) as NatureTag[];

export function isValidNatureTag(value: string): value is NatureTag {
  return VALID_TAGS.includes(value as NatureTag);
}

export function normalizeTags(tags: string[]): NatureTag[] {
  const seen = new Set<NatureTag>();
  for (const tag of tags) {
    if (isValidNatureTag(tag)) seen.add(tag);
  }
  return Array.from(seen);
}

/** Edit distance for typo-tolerant matching (e.g. "forrest" → forests). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j]
          ? row[j]
          : 1 + Math.min(row[j], row[j + 1], prev);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function fuzzyMatchSynonym(word: string): NatureTag | null {
  // Skip tiny / filler words — "and" was matching "sand" → desert.
  if (word.length < 4) return null;
  if (
    [
      "and",
      "with",
      "from",
      "that",
      "this",
      "have",
      "want",
      "show",
      "give",
      "type",
      "reel",
      "reels",
      "feed",
      "just",
      "only",
      "some",
      "more",
      "like",
      "also",
    ].includes(word)
  ) {
    return null;
  }

  if (TAG_SYNONYMS[word]) return TAG_SYNONYMS[word];

  // Keep fuzzy matching strict so typos work without inventing categories.
  const maxDist = word.length <= 5 ? 1 : 2;
  let best: { tag: NatureTag; dist: number } | null = null;

  for (const [key, tag] of Object.entries(TAG_SYNONYMS)) {
    if (key.includes(" ")) continue;
    if (Math.abs(key.length - word.length) > maxDist) continue;
    const dist = levenshtein(word, key);
    if (dist <= maxDist && (!best || dist < best.dist)) {
      best = { tag, dist };
    }
  }

  for (const tag of NATURE_TAGS) {
    const label = tag.label.toLowerCase();
    const id = tag.id;
    for (const candidate of [label, id]) {
      if (Math.abs(candidate.length - word.length) > maxDist) continue;
      const dist = levenshtein(word, candidate);
      if (dist <= maxDist && (!best || dist < best.dist)) {
        best = { tag: tag.id, dist };
      }
    }
  }

  return best?.tag ?? null;
}

export function extractTagsFromText(text: string): NatureTag[] {
  const lower = text.toLowerCase();
  const found = new Set<NatureTag>();

  for (const tag of NATURE_TAGS) {
    if (lower.includes(tag.id) || lower.includes(tag.label.toLowerCase())) {
      found.add(tag.id);
    }
  }

  const words = lower.split(/[^a-z]+/).filter(Boolean);
  for (const word of words) {
    const mapped = TAG_SYNONYMS[word] ?? fuzzyMatchSynonym(word);
    if (mapped) found.add(mapped);
  }

  for (const [phrase, tag] of Object.entries(TAG_SYNONYMS)) {
    if (phrase.includes(" ") && lower.includes(phrase)) {
      found.add(tag);
    }
  }

  return Array.from(found);
}

export function getTagLabels(tags: NatureTag[]): string[] {
  return tags.map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label ?? t);
}
