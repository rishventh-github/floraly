import { NextResponse } from "next/server";
import {
  clearPresence,
  getCommunityStats,
  heartbeatPresence,
  recordJoin,
  recordPageVisit,
  recordUpload,
  recordUserSeen,
  syncUserUploads,
  syncCollectionPoints,
} from "@/lib/communityStats";

export async function GET() {
  try {
    return NextResponse.json(getCommunityStats());
  } catch (error) {
    console.error("[stats] GET failed", error);
    return NextResponse.json(
      {
        concurrentUsers: 0,
        totalUsers: 0,
        totalUploads: 0,
        uniqueVisitors: 0,
        totalPageViews: 0,
        leaderboard: [],
        error: "Stats temporarily unavailable",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = typeof body.type === "string" ? body.type : "";

    if (type === "heartbeat") {
      const sessionId = String(body.sessionId ?? "");
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!sessionId || !userId) {
        return NextResponse.json({ error: "Missing session" }, { status: 400 });
      }
      return NextResponse.json(
        heartbeatPresence({ sessionId, userId, displayName })
      );
    }

    if (type === "leave") {
      const sessionId = String(body.sessionId ?? "");
      if (sessionId) clearPresence(sessionId);
      return NextResponse.json(getCommunityStats());
    }

    if (type === "page_view") {
      const visitorId = String(body.visitorId ?? "");
      if (!visitorId) {
        return NextResponse.json({ error: "Missing visitor" }, { status: 400 });
      }
      return NextResponse.json(recordPageVisit({ visitorId }));
    }

    if (type === "join") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!userId) {
        return NextResponse.json({ error: "Missing user" }, { status: 400 });
      }
      return NextResponse.json(recordJoin({ userId, displayName }));
    }

    if (type === "user_seen") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!userId) {
        return NextResponse.json({ error: "Missing user" }, { status: 400 });
      }
      return NextResponse.json(recordUserSeen({ userId, displayName }));
    }

    if (type === "upload") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!userId) {
        return NextResponse.json({ error: "Missing user" }, { status: 400 });
      }
      return NextResponse.json(recordUpload({ userId, displayName }));
    }

    if (type === "sync_uploads") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      const count = Number(body.count ?? 0);
      if (!userId) {
        return NextResponse.json({ error: "Missing user" }, { status: 400 });
      }
      return NextResponse.json(
        syncUserUploads({ userId, displayName, count })
      );
    }

    if (type === "sync_points") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      const points = Number(body.points ?? 0);
      if (!userId) {
        return NextResponse.json({ error: "Missing user" }, { status: 400 });
      }
      return NextResponse.json(
        syncCollectionPoints({ userId, displayName, points })
      );
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
