import { getTagLabels, extractTagsFromText, normalizeTags } from "./natureTaxonomy";
import type { NatureTag } from "./types";

export interface CurateResult {
  tags: NatureTag[];
  explanation: string;
  source: "llm" | "local";
}

const CURATE_PATTERNS = [
  /curate\s+(.+?)(?:\s+type|\s+reels|\s+for|\s+to|\s+today|$)/i,
  /show\s+(?:me\s+)?(.+?)(?:\s+type|\s+reels|\s+for|\s+today|$)/i,
  /(?:i\s+)?want\s+(?:to\s+see\s+)?(.+)/i,
  /give\s+me\s+(.+)/i,
  /feed\s+(?:of|with)\s+(.+)/i,
];

export function parseCuratePrompt(prompt: string): NatureTag[] {
  const found = new Set(extractTagsFromText(prompt));

  if (found.size > 0) return Array.from(found);

  for (const pattern of CURATE_PATTERNS) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      for (const tag of extractTagsFromText(match[1])) {
        found.add(tag);
      }
    }
  }

  return Array.from(found);
}

export function curateLocally(prompt: string): CurateResult {
  const tags = parseCuratePrompt(prompt);
  return {
    tags,
    explanation: getCurateMessage(tags),
    source: "local",
  };
}

export function getCurateMessage(tags: NatureTag[]): string {
  if (tags.length === 0) {
    return 'Could not match nature categories. Try: "water and forest reels" or "show me wildlife and mountains"';
  }
  const labels = getTagLabels(tags);
  return `Showing ${labels.join(" & ")} reels`;
}

export async function curateFeedPrompt(prompt: string): Promise<CurateResult> {
  const local = curateLocally(prompt);
  try {
    const response = await fetch("/api/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      return local;
    }

    const data = (await response.json()) as CurateResult;
    const tags = normalizeTags(data.tags ?? []);
    if (tags.length === 0) return local;

    // Prefer categories found in the user's words; never keep LLM extras.
    if (local.tags.length > 0) {
      const localSet = new Set(local.tags);
      const intersection = tags.filter((t) => localSet.has(t));
      if (intersection.length > 0) {
        return {
          tags: intersection,
          explanation: data.explanation || getCurateMessage(intersection),
          source: data.source ?? "llm",
        };
      }
      return local;
    }

    return {
      tags,
      explanation: data.explanation || getCurateMessage(tags),
      source: data.source ?? "llm",
    };
  } catch {
    return local;
  }
}
