/**
 * Optional durable stats persistence for Vercel via Upstash Redis REST.
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN so visitor/join
 * counts survive serverless cold starts.
 */

const REDIS_KEY = "floraly:community-stats";

function redisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: unknown };
  return data.result ?? null;
}

export async function loadRemoteStatsJson(): Promise<string | null> {
  if (!redisConfigured()) return null;
  try {
    const result = await redisCommand(["GET", REDIS_KEY]);
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

export async function saveRemoteStatsJson(json: string): Promise<void> {
  if (!redisConfigured()) return;
  try {
    await redisCommand(["SET", REDIS_KEY, json]);
  } catch {
    /* ignore remote write failures */
  }
}

export function hasRemoteStatsStore(): boolean {
  return redisConfigured();
}
