import { NextResponse } from "next/server";
import {
  clearPresence,
  ensureStatsReady,
  getCommunityStats,
  heartbeatPresence,
  hydrateFromSnapshot,
  recordJoin,
  recordPageVisit,
  recordUpload,
  recordUserSeen,
  syncUserUploads,
  syncCollectionPoints,
} from "@/lib/communityStats";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export async function GET() {
  try {
    await ensureStatsReady();
    return json(getCommunityStats());
  } catch (error) {
    console.error("[stats] GET failed", error);
    return json(
      {
        concurrentUsers: 0,
        totalUsers: 0,
        totalUploads: 0,
        uniqueVisitors: 0,
        totalPageViews: 0,
        leaderboard: [],
        error: "Stats temporarily unavailable",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureStatsReady();
    const body = await request.json();
    const type = typeof body.type === "string" ? body.type : "";

    if (type === "heartbeat") {
      const sessionId = String(body.sessionId ?? "");
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!sessionId || !userId) {
        return json({ error: "Missing session" }, 400);
      }
      return json(heartbeatPresence({ sessionId, userId, displayName }));
    }

    if (type === "leave") {
      const sessionId = String(body.sessionId ?? "");
      if (sessionId) clearPresence(sessionId);
      return json(getCommunityStats());
    }

    if (type === "page_view") {
      const visitorId = String(body.visitorId ?? "");
      if (!visitorId) {
        return json({ error: "Missing visitor" }, 400);
      }
      return json(
        recordPageVisit({
          visitorId,
          uniqueVisitorsFloor: Number(body.uniqueVisitorsFloor ?? 0),
          totalPageViewsFloor: Number(body.totalPageViewsFloor ?? 0),
        })
      );
    }

    if (type === "join") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!userId) {
        return json({ error: "Missing user" }, 400);
      }
      return json(recordJoin({ userId, displayName }));
    }

    if (type === "user_seen") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!userId) {
        return json({ error: "Missing user" }, 400);
      }
      return json(recordUserSeen({ userId, displayName }));
    }

    if (type === "upload") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      if (!userId) {
        return json({ error: "Missing user" }, 400);
      }
      return json(recordUpload({ userId, displayName }));
    }

    if (type === "sync_uploads") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      const count = Number(body.count ?? 0);
      if (!userId) {
        return json({ error: "Missing user" }, 400);
      }
      return json(syncUserUploads({ userId, displayName, count }));
    }

    if (type === "sync_points") {
      const userId = String(body.userId ?? "");
      const displayName = String(body.displayName ?? "Explorer");
      const points = Number(body.points ?? 0);
      if (!userId) {
        return json({ error: "Missing user" }, 400);
      }
      return json(syncCollectionPoints({ userId, displayName, points }));
    }

    if (type === "hydrate") {
      const leaderboard = Array.isArray(body.leaderboard) ? body.leaderboard : [];
      return json(
        hydrateFromSnapshot({
          uniqueVisitors: Number(body.uniqueVisitors ?? 0),
          totalPageViews: Number(body.totalPageViews ?? 0),
          leaderboard: leaderboard.map(
            (row: {
              userId?: string;
              displayName?: string;
              uploadCount?: number;
              collectionPoints?: number;
            }) => ({
              userId: String(row?.userId ?? ""),
              displayName: String(row?.displayName ?? "Explorer"),
              uploadCount: Number(row?.uploadCount ?? 0),
              collectionPoints: Number(row?.collectionPoints ?? 0),
            })
          ),
        })
      );
    }

    return json({ error: "Unknown type" }, 400);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
}
