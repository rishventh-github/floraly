import { NextResponse } from "next/server";
import {
  classifyLocally,
  type ImageClassificationResult,
} from "@/lib/imageModeration";
import { normalizeTags } from "@/lib/natureTaxonomy";

/**
 * Local-only moderation. OpenAI vision is intentionally not used so uploads
 * are never blocked by API quota — users always confirm nature authenticity.
 */
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

    return NextResponse.json(localResult);
  } catch {
    return NextResponse.json(
      {
        verdict: "approved",
        tags: [],
        isNature: true,
        isAiGenerated: false,
        confidence: 0.4,
        reasons: [
          "Local check was unavailable. Please confirm this is a real outdoor nature photo.",
        ],
        source: "local",
      } satisfies ImageClassificationResult,
      { status: 200 }
    );
  }
}
