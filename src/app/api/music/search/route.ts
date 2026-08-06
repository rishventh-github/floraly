import { NextResponse } from "next/server";
import type { ReelMusic } from "@/lib/types";

interface ItunesResult {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ results: [] as ReelMusic[] });
  }

  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", q);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "12");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] as ReelMusic[], error: "Search unavailable" });
    }

    const data = (await res.json()) as { results?: ItunesResult[] };
    const results: ReelMusic[] = (data.results ?? [])
      .filter((r) => r.trackId && r.trackName && r.artistName)
      .map((r) => ({
        id: String(r.trackId),
        title: r.trackName!,
        artist: r.artistName!,
        previewUrl: r.previewUrl,
        artworkUrl: (r.artworkUrl100 ?? r.artworkUrl60)?.replace("100x100bb", "200x200bb"),
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] as ReelMusic[], error: "Search failed" });
  }
}
