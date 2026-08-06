import { extractTagsFromText, normalizeTags } from "./natureTaxonomy";
import type { NatureTag } from "./types";

/** Scene keywords inferred from common nature photography subjects. */
const SCENE_KEYWORDS: Record<NatureTag, string[]> = {
  water: [
    "lake", "river", "waterfall", "stream", "pond", "mirror", "reflection",
    "creek", "wetland", "marsh", "foggy water", "tide pool",
  ],
  forests: [
    "forest", "tree", "redwood", "pine", "canopy", "woods", "trail",
    "fern", "moss", "grove", "old-growth", "woodland",
  ],
  mountains: [
    "mountain", "peak", "summit", "alpine", "valley", "ridge", "14er",
    "elevation", "hills", "canyon rim",
  ],
  wildlife: [
    "deer", "bear", "bird", "elk", "moose", "fox", "animal", "wildlife",
    "squirrel", "eagle", "owl", "bison",
  ],
  campfires: [
    "campfire", "camping", "campsite", "fire", "bonfire", "tent", "embers",
    "stars", "night camp",
  ],
  sunsets: [
    "sunset", "sunrise", "golden hour", "dusk", "dawn", "sky", "glow",
    "horizon", "evening light",
  ],
  flowers: [
    "flower", "wildflower", "meadow", "bloom", "blossom", "petal", "garden",
    "spring", "poppy", "lavender",
  ],
  desert: [
    "desert", "dune", "sand", "arid", "cactus", "saguaro", "badlands",
    "dry", "mesa",
  ],
  snow: [
    "snow", "winter", "frost", "ice", "glacier", "snowcap", "blizzard",
    "frozen", "ski",
  ],
  coast: [
    "ocean", "beach", "coast", "shore", "wave", "cliff", "sea", "tide",
    "pacific", "atlantic", "bioluminescent",
  ],
};

export function classifyCaption(caption: string): NatureTag[] {
  return extractTagsFromText(caption);
}

export function classifySceneFromText(...parts: (string | undefined)[]): NatureTag[] {
  const combined = parts.filter(Boolean).join(" ").toLowerCase();
  if (!combined.trim()) return [];

  const fromSynonyms = extractTagsFromText(combined);
  const scores = new Map<NatureTag, number>();

  for (const tag of fromSynonyms) {
    scores.set(tag, (scores.get(tag) ?? 0) + 3);
  }

  for (const [tag, keywords] of Object.entries(SCENE_KEYWORDS) as [NatureTag, string[]][]) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        scores.set(tag, (scores.get(tag) ?? 0) + 1);
      }
    }
  }

  if (scores.size === 0) return [];

  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0);

  const topScore = ranked[0]?.[1] ?? 0;
  return ranked
    .filter(([, score]) => score >= Math.max(1, topScore - 1))
    .map(([tag]) => tag)
    .slice(0, 3);
}

export function postMatchesTags(
  postTags: NatureTag[],
  requiredTags: NatureTag[]
): boolean {
  if (requiredTags.length === 0) return true;
  return postTags.some((tag) => requiredTags.includes(tag));
}

export function countMatchingTags(
  postTags: NatureTag[],
  requiredTags: NatureTag[]
): number {
  return postTags.filter((tag) => requiredTags.includes(tag)).length;
}

export function mergeClassification(
  manualTags: NatureTag[],
  inferredTags: NatureTag[]
): NatureTag[] {
  return normalizeTags([...manualTags, ...inferredTags]);
}
