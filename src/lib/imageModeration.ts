import type { NatureTag } from "./types";
import { isValidNatureTag, normalizeTags } from "./natureTaxonomy";
import { classifySceneFromText } from "./sceneClassifier";

export type ModerationVerdict = "approved" | "rejected";

export type RejectionReason =
  | "ai_generated"
  | "not_nature"
  | "inappropriate"
  | "unclear";

export interface ImageClassificationResult {
  verdict: ModerationVerdict;
  tags: NatureTag[];
  isNature: boolean;
  isAiGenerated: boolean;
  confidence: number;
  reasons: string[];
  rejectionCode?: RejectionReason;
  source: "llm" | "local";
}

const AI_FILENAME_HINTS = [
  "midjourney",
  "dalle",
  "dall-e",
  "stable.?diffusion",
  "sdxl",
  "flux",
  "ai.?gen",
  "generated",
  "chatgpt",
  "openai",
  "leonardo.?ai",
  "firefly",
  "synthetic",
];

const NON_NATURE_CAPTION_HINTS = [
  "selfie",
  "mirror pic",
  "gym",
  "party",
  "concert",
  "meme",
  "screenshot",
  "food porn",
  "restaurant",
  "burger",
  "pizza",
  "fries",
  "sandwich",
  "hot dog",
  "taco",
  "sushi",
  "dessert",
  "cake",
  "coffee",
  "brunch",
  "dinner",
  "lunch",
  "breakfast",
  "car show",
  "shopping",
  "mall",
  "office",
  "classroom",
  "bedroom",
  "living room",
];

const AI_CAPTION_HINTS = [
  "ai generated",
  "ai art",
  "midjourney",
  "dall-e",
  "dalle",
  "stable diffusion",
  "made with ai",
  "chatgpt",
  "not a real photo",
  "synthetic",
];

export function detectAiFromFilename(filename?: string): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return AI_FILENAME_HINTS.some((hint) => new RegExp(hint, "i").test(lower));
}

export function detectAiFromCaption(caption?: string): boolean {
  if (!caption) return false;
  const lower = caption.toLowerCase();
  return AI_CAPTION_HINTS.some((hint) => lower.includes(hint));
}

export function detectNonNatureFromCaption(caption?: string): boolean {
  if (!caption) return false;
  const lower = caption.toLowerCase();
  return NON_NATURE_CAPTION_HINTS.some((hint) => lower.includes(hint));
}

/**
 * Lightweight canvas-based heuristics when no vision LLM is available.
 * Scores nature-likeness from color palette and flags overly smooth "AI-like" images.
 */
export async function analyzeImageLocally(
  imageDataUrl: string
): Promise<{
  natureScore: number;
  aiArtifactScore: number;
  foodScore: number;
  dominantHints: NatureTag[];
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve({
            natureScore: 0.5,
            aiArtifactScore: 0.3,
            foodScore: 0,
            dominantHints: [],
          });
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let greenish = 0;
        let blueish = 0;
        let earthy = 0;
        let skinish = 0;
        let grayish = 0;
        let neon = 0;
        let foodish = 0;
        let total = 0;

        const luminances: number[] = [];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          total++;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          luminances.push(lum);

          if (g > r + 15 && g > b + 10) greenish++;
          if (b > r + 10 && b > g - 5) blueish++;
          if (r > 80 && g > 50 && b < 90 && r >= g && g >= b) earthy++;
          if (r > 140 && g > 90 && g < 180 && b > 70 && b < 150 && r > b + 20) skinish++;
          if (sat < 0.12 && lum > 40 && lum < 220) grayish++;
          if (sat > 0.75 && (r > 200 || g > 200 || b > 200)) neon++;
          // Warm bun/meat/cheese tones common in food photos (not desert sand)
          if (
            r > 130 &&
            g > 70 &&
            g < 170 &&
            b < 100 &&
            r > g + 15 &&
            g > b + 10 &&
            sat > 0.25
          ) {
            foodish++;
          }
        }

        if (total === 0) {
          resolve({
            natureScore: 0.4,
            aiArtifactScore: 0.4,
            foodScore: 0,
            dominantHints: [],
          });
          return;
        }

        const greenRatio = greenish / total;
        const blueRatio = blueish / total;
        const earthRatio = earthy / total;
        const skinRatio = skinish / total;
        const grayRatio = grayish / total;
        const neonRatio = neon / total;
        const foodRatio = foodish / total;

        let smoothPairs = 0;
        let pairCount = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size - 1; x++) {
            const i = (y * size + x) * 4;
            const j = i + 4;
            const dr = Math.abs(data[i] - data[j]);
            const dg = Math.abs(data[i + 1] - data[j + 1]);
            const db = Math.abs(data[i + 2] - data[j + 2]);
            if (dr + dg + db < 12) smoothPairs++;
            pairCount++;
          }
        }
        const smoothRatio = pairCount > 0 ? smoothPairs / pairCount : 0;

        let natureScore =
          greenRatio * 0.45 +
          blueRatio * 0.3 +
          earthRatio * 0.18 +
          Math.min(blueRatio + greenRatio, 0.5) * 0.2 +
          0.12; // slight prior toward real outdoor photos

        natureScore -= skinRatio * 0.35;
        natureScore -= grayRatio * 0.12;
        natureScore -= neonRatio * 0.3;
        natureScore -= foodRatio * 0.55;
        natureScore = Math.max(0, Math.min(1, natureScore));

        let aiArtifactScore = 0;
        // Only flag strongly synthetic-looking images
        if (smoothRatio > 0.82) aiArtifactScore += 0.28;
        if (neonRatio > 0.14) aiArtifactScore += 0.2;
        if (natureScore > 0.55 && smoothRatio > 0.8) aiArtifactScore += 0.15;
        const mid = luminances.filter((l) => l > 60 && l < 200).length / luminances.length;
        if (mid > 0.92 && smoothRatio > 0.78) aiArtifactScore += 0.12;
        aiArtifactScore = Math.max(0, Math.min(1, aiArtifactScore));

        const dominantHints: NatureTag[] = [];
        // Assign scene tags when the image is plausibly nature-like
        if (natureScore >= 0.28 && foodRatio < 0.22) {
          if (greenRatio > 0.14) dominantHints.push("forests");
          if (blueRatio > 0.16 && greenRatio < 0.28) dominantHints.push("water");
          if (blueRatio > 0.12 && earthRatio > 0.08) dominantHints.push("coast");
          // Desert needs sand + open sky cues, not just brown food tones
          if (
            earthRatio > 0.28 &&
            greenRatio < 0.08 &&
            blueRatio > 0.12 &&
            foodRatio < 0.12
          ) {
            dominantHints.push("desert");
          }
          if (greenRatio > 0.1 && blueRatio > 0.12) dominantHints.push("mountains");
        }

        resolve({
          natureScore,
          aiArtifactScore,
          foodScore: foodRatio,
          dominantHints: normalizeTags(dominantHints).slice(0, 3),
        });
      } catch {
        resolve({
          natureScore: 0.5,
          aiArtifactScore: 0.3,
          foodScore: 0,
          dominantHints: [],
        });
      }
    };
    img.onerror = () =>
      resolve({
        natureScore: 0.4,
        aiArtifactScore: 0.4,
        foodScore: 0,
        dominantHints: [],
      });
    img.src = imageDataUrl;
  });
}

export function classifyLocally(input: {
  natureScore: number;
  aiArtifactScore: number;
  foodScore?: number;
  dominantHints: NatureTag[];
  caption?: string;
  filename?: string;
}): ImageClassificationResult {
  const foodScore = input.foodScore ?? 0;
  const captionTags = classifySceneFromText(input.caption);
  // Color hints alone must not approve clear food (e.g. burger → desert)
  const tags =
    input.natureScore >= 0.28 && foodScore < 0.22
      ? normalizeTags([...input.dominantHints, ...captionTags]).slice(0, 3)
      : normalizeTags(captionTags).slice(0, 3);

  const reasons: string[] = [];
  let isAiGenerated =
    detectAiFromFilename(input.filename) || detectAiFromCaption(input.caption);
  // Lenient defaults - only reject clear non-nature / AI
  let isNature = input.natureScore >= 0.28 && foodScore < 0.22;

  if (foodScore >= 0.22) {
    isNature = false;
    reasons.push("This looks like food or an indoor plate - not outdoor nature.");
  }

  if (detectNonNatureFromCaption(input.caption)) {
    isNature = false;
    reasons.push("Caption suggests this is not outdoor/nature content.");
  }

  if (input.aiArtifactScore >= 0.72) {
    isAiGenerated = true;
    reasons.push("Image patterns look like AI-generated or heavily synthetic media.");
  }

  if (detectAiFromFilename(input.filename)) {
    reasons.push("Filename suggests AI-generated content.");
  }
  if (detectAiFromCaption(input.caption)) {
    reasons.push("Caption mentions AI-generated content.");
  }

  if (input.natureScore < 0.28) {
    isNature = false;
    if (!reasons.some((r) => r.includes("food"))) {
      reasons.push("We're not sure this looks like outdoor nature photography.");
    }
  }

  if (isAiGenerated) {
    return {
      verdict: "rejected",
      tags: [],
      isNature,
      isAiGenerated: true,
      confidence: Math.min(0.95, 0.55 + input.aiArtifactScore * 0.4),
      reasons:
        reasons.length > 0
          ? reasons
          : ["This looks like AI-generated content, which isn't allowed on Floraly."],
      rejectionCode: "ai_generated",
      source: "local",
    };
  }

  if (!isNature) {
    return {
      verdict: "rejected",
      tags: [],
      isNature: false,
      isAiGenerated: false,
      confidence: Math.min(0.9, 0.5 + (1 - input.natureScore) * 0.4),
      reasons:
        reasons.length > 0
          ? reasons
          : ["Floraly only accepts real outdoor and nature photos."],
      rejectionCode: "not_nature",
      source: "local",
    };
  }

  return {
    verdict: "approved",
    tags,
    isNature: true,
    isAiGenerated: false,
    confidence: Math.min(0.92, 0.45 + input.natureScore * 0.5),
    reasons:
      tags.length > 0
        ? [`Detected nature categories: ${tags.join(", ")}.`]
        : ["Looks like a real nature photo."],
    source: "local",
  };
}

export function parseLlmClassification(raw: unknown): ImageClassificationResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const tags = normalizeTags(
    Array.isArray(data.tags)
      ? data.tags.filter((t): t is NatureTag => typeof t === "string" && isValidNatureTag(t))
      : []
  );

  const isNature = Boolean(data.isNature);
  const isAiGenerated = Boolean(data.isAiGenerated);
  const confidence =
    typeof data.confidence === "number"
      ? Math.max(0, Math.min(1, data.confidence))
      : 0.7;
  const reasons = Array.isArray(data.reasons)
    ? data.reasons.filter((r): r is string => typeof r === "string").slice(0, 4)
    : [];

  if (isAiGenerated) {
    return {
      verdict: "rejected",
      tags: [],
      isNature,
      isAiGenerated: true,
      confidence,
      reasons:
        reasons.length > 0
          ? reasons
          : ["This appears to be AI-generated content."],
      rejectionCode: "ai_generated",
      source: "llm",
    };
  }

  if (!isNature) {
    return {
      verdict: "rejected",
      tags: [],
      isNature: false,
      isAiGenerated: false,
      confidence,
      reasons:
        reasons.length > 0
          ? reasons
          : ["This does not appear to be outdoor/nature content."],
      rejectionCode: "not_nature",
      source: "llm",
    };
  }

  return {
    verdict: "approved",
    tags: tags.slice(0, 3),
    isNature: true,
    isAiGenerated: false,
    confidence,
    reasons:
      reasons.length > 0
        ? reasons
        : tags.length > 0
          ? [`Classified as: ${tags.join(", ")}.`]
          : ["Approved as nature content."],
    source: "llm",
  };
}

export function rejectionMessage(result: ImageClassificationResult): string {
  if (result.rejectionCode === "ai_generated") {
    return "This might be AI-generated. Floraly is meant for real outdoor memories - you can continue if this was flagged by mistake.";
  }
  if (result.rejectionCode === "not_nature") {
    return "We're not sure this is outdoor nature. You can continue if this is a real nature photo that was flagged by mistake.";
  }
  return result.reasons[0] ?? "This photo didn't clearly pass Floraly's nature check.";
}
