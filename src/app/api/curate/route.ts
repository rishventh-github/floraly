import { NextResponse } from "next/server";
import { getCurateMessage } from "@/lib/curate";
import { parseCurateWithLLM, resolveCurateResult } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required", tags: [], explanation: "" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let result;

    if (apiKey) {
      const llmResult = await parseCurateWithLLM(prompt, apiKey);
      result = resolveCurateResult(prompt, llmResult);
    } else {
      result = resolveCurateResult(prompt, null);
    }

    return NextResponse.json({
      tags: result.tags,
      explanation: result.explanation || getCurateMessage(result.tags),
      source: result.source,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to curate feed", tags: [], explanation: "" },
      { status: 500 }
    );
  }
}
