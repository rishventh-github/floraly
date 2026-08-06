import { NATURE_TAGS } from "./constants";
import { isValidNatureTag, normalizeTags } from "./natureTaxonomy";
import { curateLocally, getCurateMessage } from "./curate";
import type { NatureTag } from "./types";

const CATEGORY_LIST = NATURE_TAGS.map(
  (t) => `${t.id} (${t.label}: ${t.description})`
).join("\n");

export async function parseCurateWithLLM(
  prompt: string,
  apiKey: string
): Promise<{ tags: NatureTag[]; explanation: string } | null> {
  const systemPrompt = `You are Floraly's nature feed curator. Users ask for specific types of outdoor/nature content.

Available categories (return ONLY these exact ids):
${CATEGORY_LIST}

Rules:
- Correct spelling mistakes / typos before mapping (e.g. "forrest" → forests, "moutains" → mountains, "wilflife" → wildlife, "waterr" → water, "campfiree" → campfires).
- Map user language to the closest valid category ids (e.g. "trees" → forests, "lake" → water, "animals" → wildlife).
- If they ask for multiple types, include all matching ids.
- NEVER add categories the user did not mention or clearly imply. "snow and flower" must be ONLY ["snow","flowers"] — do not add desert, wildlife, etc.
- Ignore filler words like "and", "reels", "show me", "type".
- If the request is unrelated to nature, return an empty tags array.
- In explanation, briefly confirm what you understood (including typo fixes).
- Respond with valid JSON only: {"tags":["water","forests"],"explanation":"short friendly sentence"}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { tags?: string[]; explanation?: string };
    const tags = normalizeTags(
      (parsed.tags ?? []).filter((t): t is NatureTag => isValidNatureTag(t))
    );

    return {
      tags,
      explanation: parsed.explanation ?? "",
    };
  } catch {
    return null;
  }
}

export async function classifyImageWithLLM(
  imageUrl: string,
  caption: string | undefined,
  apiKey: string
): Promise<import("./imageModeration").ImageClassificationResult | null> {
  const { parseLlmClassification } = await import("./imageModeration");

  const systemPrompt = `You are Floraly's upload safety and scene classifier for a nature-only photo community.

Your jobs:
1) Reject clearly AI-generated / synthetic "slop" images.
2) Reject photos that are clearly NOT outdoor nature.
3) If approved, classify into Floraly nature categories.

Bias toward APPROVING real outdoor photos. When unsure whether something is nature, approve it.
Only reject when you are confident the photo is not outdoor nature or is AI-generated.

ALWAYS REJECT (isNature=false, tags=[]) examples:
- Food of any kind (burgers, pizza, fries, desserts, drinks, restaurant plates)
- Indoor rooms, memes, screenshots, product shots, fashion catalog photos
- People-only portraits with no outdoor nature focus

Usually APPROVE (even if imperfect):
- Real outdoor landscapes, trails, parks, gardens, coasts, wildlife
- Nature photos with people in frame if the outdoors is still the subject
- Night skies, cloudy days, farms/fields, harvest scenes outdoors
- Slightly blurry, dim, or phone-quality nature photos

NEVER confuse food with desert. Brown burger buns / fried food are NOT desert sand dunes.
"desert" means arid outdoor landscape (dunes, canyons, cactus wilderness) only.

Valid tag ids ONLY: water, forests, mountains, wildlife, campfires, sunsets, flowers, desert, snow, coast.

Mark isAiGenerated=true only for clearly synthetic images (unnatural smoothness, melted details, garbled text, obvious Midjourney/DALL·E look). Do not flag ordinary phone photos as AI.

Return JSON only:
{
  "isNature": true,
  "isAiGenerated": false,
  "tags": ["forests","water"],
  "confidence": 0.0-1.0,
  "reasons": ["short explanations"]
}

Rules:
- If isAiGenerated is true, tags must be [].
- If isNature is false, tags must be [].
- Prefer 1-3 tags when approved.
- Prefer false negatives over false positives for rejection (don't block real nature).`;

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    {
      type: "text",
      text: caption
        ? `Caption: "${caption}". Moderate and classify this upload for Floraly.`
        : "Moderate and classify this upload for Floraly (nature-only, no AI).",
    },
    { type: "image_url", image_url: { url: imageUrl } },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 350,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return parseLlmClassification(parsed);
  } catch {
    return null;
  }
}

export function resolveCurateResult(
  prompt: string,
  llmResult: { tags: NatureTag[]; explanation: string } | null
) {
  const local = curateLocally(prompt);

  // Prefer categories explicitly found in the user's words. Never let the LLM
  // invent extras (e.g. adding desert when the user asked for snow & flowers).
  if (local.tags.length > 0) {
    if (llmResult && llmResult.tags.length > 0) {
      const localSet = new Set(local.tags);
      const intersection = llmResult.tags.filter((t) => localSet.has(t));
      if (intersection.length > 0) {
        return {
          tags: intersection,
          explanation: llmResult.explanation || getCurateMessage(intersection),
          source: "llm" as const,
        };
      }
    }
    return local;
  }

  if (llmResult && llmResult.tags.length > 0) {
    return {
      tags: llmResult.tags,
      explanation: llmResult.explanation,
      source: "llm" as const,
    };
  }

  return local;
}
