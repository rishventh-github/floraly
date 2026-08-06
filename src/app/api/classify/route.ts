import { NextResponse } from "next/server";
import { classifyImageWithLLM } from "@/lib/llm";
import {
  classifyLocally,
  type ImageClassificationResult,
} from "@/lib/imageModeration";
import { normalizeTags } from "@/lib/natureTaxonomy";

function hasUsableApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed.includes("your-key-here")) return false;
  return trimmed.startsWith("sk-");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const caption = typeof body.caption === "string" ? body.caption : undefined;
    const filename = typeof body.filename === "string" ? body.filename : undefined;

    if (!imageUrl) {
      return NextResponse.json(
        {
          verdict: "rejected",
          tags: [],
          isNature: false,
          isAiGenerated: false,
          confidence: 1,
          reasons: ["No image provided."],
          rejectionCode: "unclear",
          source: "local",
        } satisfies ImageClassificationResult,
        { status: 400 }
      );
    }

    const la =
      typeof body.localAnalysis === "object" && body.localAnalysis !== null
        ? (body.localAnalysis as {
            natureScore?: number;
            aiArtifactScore?: number;
            foodScore?: number;
            dominantHints?: string[];
          })
        : null;

    const localResult = classifyLocally({
      natureScore: typeof la?.natureScore === "number" ? la.natureScore : 0.4,
      aiArtifactScore:
        typeof la?.aiArtifactScore === "number" ? la.aiArtifactScore : 0.2,
      foodScore: typeof la?.foodScore === "number" ? la.foodScore : 0,
      dominantHints: normalizeTags(la?.dominantHints ?? []),
      caption,
      filename,
    });

    // Only short-circuit on very clear local food/AI signals
    if (
      localResult.verdict === "rejected" &&
      ((localResult.rejectionCode === "not_nature" &&
        (la?.foodScore ?? 0) >= 0.22 &&
        localResult.confidence >= 0.8) ||
        (localResult.rejectionCode === "ai_generated" &&
          localResult.confidence >= 0.9))
    ) {
      return NextResponse.json(localResult);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (hasUsableApiKey(apiKey)) {
      const llmResult = await classifyImageWithLLM(imageUrl, caption, apiKey!);
      if (llmResult) {
        if (
          localResult.rejectionCode === "ai_generated" &&
          localResult.confidence >= 0.92
        ) {
          return NextResponse.json(localResult);
        }
        // Local food detection can veto a mistaken LLM desert label (high confidence only)
        if (
          (la?.foodScore ?? 0) >= 0.25 &&
          llmResult.verdict === "approved"
        ) {
          return NextResponse.json({
            ...localResult,
            verdict: "rejected" as const,
            isNature: false,
            tags: [],
            rejectionCode: "not_nature" as const,
            reasons: [
              "This looks like food, not outdoor nature.",
              ...llmResult.reasons.slice(0, 1),
            ],
            source: "local" as const,
          });
        }
        // Prefer LLM, but if local was unsure and LLM rejects weakly, soften by
        // keeping LLM result (user can override in UI).
        return NextResponse.json(llmResult);
      }

      // LLM failed - still return local, but mark that vision AI did not run
      return NextResponse.json({
        ...localResult,
        reasons: [
          ...localResult.reasons,
          "Vision AI was unavailable for this upload; used local checks only.",
        ],
      });
    }

    return NextResponse.json({
      ...localResult,
      reasons: [
        ...localResult.reasons,
        "Add a valid OPENAI_API_KEY in .env.local for stronger vision checks.",
      ],
    });
  } catch {
    return NextResponse.json(
      {
        verdict: "rejected",
        tags: [],
        isNature: false,
        isAiGenerated: false,
        confidence: 0.5,
        reasons: ["Classification failed. Please try another photo."],
        rejectionCode: "unclear",
        source: "local",
      } satisfies ImageClassificationResult,
      { status: 500 }
    );
  }
}
