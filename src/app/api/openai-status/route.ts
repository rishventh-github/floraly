import { NextResponse } from "next/server";

/** Quick check that OPENAI_API_KEY is present and accepted by OpenAI. */
export async function GET() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || key.includes("your-key-here") || !key.startsWith("sk-")) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "OPENAI_API_KEY is missing or still a placeholder in .env.local",
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({
        ok: false,
        configured: true,
        message: `OpenAI rejected the key (HTTP ${response.status}).`,
        detail: text.slice(0, 200),
      });
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      message: "OpenAI API key is working.",
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      configured: true,
      message: "Could not reach OpenAI.",
      detail: err instanceof Error ? err.message : "unknown",
    });
  }
}
