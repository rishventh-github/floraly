/**
 * Convert Nature Pics → public/nature-feed JPEGs (already done),
 * then caption/tag each photo with OpenAI Vision and write mockPosts.ts
 *
 * Usage: node --env-file=.env.local scripts/seed-nature-feed.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const feedDir = path.join(root, "public", "nature-feed");
const cachePath = path.join(root, "scripts", ".caption-cache.json");
const outPath = path.join(root, "src", "lib", "mockPosts.ts");

const TAGS = [
  "water",
  "forests",
  "mountains",
  "wildlife",
  "campfires",
  "sunsets",
  "flowers",
  "desert",
  "snow",
  "coast",
];

const REGIONS = [
  "bay_area",
  "los_angeles",
  "pacific_northwest",
  "rocky_mountains",
  "northeast",
  "southeast",
  "midwest",
  "international",
];

const AUTHORS = [
  ["Ava Morales", "A"],
  ["Noah Patel", "N"],
  ["Mia Chen", "M"],
  ["Liam Brooks", "L"],
  ["Sofia Reyes", "S"],
  ["Ethan Park", "E"],
  ["Isla Nguyen", "I"],
  ["Owen Hart", "O"],
  ["Zoe Kim", "Z"],
  ["Kai Rivera", "K"],
  ["Elena Cruz", "E"],
  ["Jordan Hale", "J"],
  ["Priya Shah", "P"],
  ["Sam Torres", "S"],
  ["Riley Quinn", "R"],
];

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const files = fs
  .readdirSync(feedDir)
  .filter((f) => f.toLowerCase().endsWith(".jpg"))
  .sort();

if (files.length === 0) {
  console.error("No JPEGs in public/nature-feed");
  process.exit(1);
}

/** @type {Record<string, { caption: string; tags: string[]; region: string }>} */
let cache = {};
if (fs.existsSync(cachePath)) {
  cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
}

function saveCache() {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function isValidTag(t) {
  return TAGS.includes(t);
}

async function captionOne(file) {
  if (cache[file]?.caption && Array.isArray(cache[file].tags)) {
    return cache[file];
  }

  const buf = fs.readFileSync(path.join(feedDir, file));
  const b64 = buf.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${b64}`;

  const system = `You write short, warm Instagram-style captions for a nature photo community called Floraly.

Return JSON only:
{"caption":"1 short sentence, max 110 chars, no hashtags","tags":["water"],"region":"bay_area"}

Rules:
- caption: evocative, specific to what you see; optional light emotion; no emojis; no quotes around the whole caption
- tags: 1-3 ids from ONLY: ${TAGS.join(", ")}
- region: best-guess outdoor region id from ONLY: ${REGIONS.join(", ")}
- If unsure of region, use "international"
- Prefer accurate scene tags over guessing`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 180,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Caption and classify this nature photo for Floraly.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${file}: ${response.status} ${errText.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${file}: empty model response`);

  const parsed = JSON.parse(content);
  const tags = (parsed.tags ?? []).filter(isValidTag).slice(0, 3);
  const region = REGIONS.includes(parsed.region) ? parsed.region : "international";
  const caption = String(parsed.caption ?? "A quiet moment outdoors.")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  const result = {
    caption: caption || "A quiet moment outdoors.",
    tags: tags.length ? tags : ["forests"],
    region,
  };
  cache[file] = result;
  return result;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  let done = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      let attempts = 0;
      for (;;) {
        try {
          results[idx] = await fn(item);
          break;
        } catch (err) {
          attempts += 1;
          if (attempts >= 3) throw err;
          await new Promise((r) => setTimeout(r, 800 * attempts));
        }
      }
      done += 1;
      if (done % 10 === 0 || done === items.length) {
        saveCache();
        console.log(`captioned ${done}/${items.length}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function dayOffset(n) {
  const d = new Date("2026-07-27T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - (n % 60));
  return d.toISOString().slice(0, 10);
}

console.log(`Seeding ${files.length} photos...`);
const metas = await mapPool(files, 6, captionOne);
saveCache();

const posts = files.map((file, index) => {
  const meta = metas[index];
  const [author, authorInitial] = AUTHORS[hash(file) % AUTHORS.length];
  const likes = 40 + (hash(file + "likes") % 520);
  const rank = Number((0.72 + (hash(file + "rank") % 280) / 1000).toFixed(3));
  const commentChance = hash(file + "c") % 5 === 0;

  return {
    id: `np-${String(index + 1).padStart(3, "0")}`,
    imageUrl: `/nature-feed/${file}`,
    caption: meta.caption,
    author,
    authorInitial,
    tags: meta.tags,
    region: meta.region,
    likes,
    rank,
    comments: commentChance
      ? [
          {
            id: `npc-${index + 1}`,
            author: AUTHORS[(hash(file + "ca") + 3) % AUTHORS.length][0].split(" ")[0],
            text: "This feels like peace.",
            createdAt: dayOffset(index + 2),
            likes: 1 + (hash(file + "cl") % 18),
          },
        ]
      : [],
    createdAt: dayOffset(index),
  };
});

const ts = `import type { NaturePost } from "./types";

/** Seeded from local Nature Pics (converted HEIC → JPEG in /public/nature-feed). */
export const MOCK_POSTS: NaturePost[] = ${JSON.stringify(posts, null, 2)};
`;

fs.writeFileSync(outPath, ts);
console.log(`Wrote ${posts.length} posts to ${path.relative(root, outPath)}`);
console.log("Sample:", posts[0].caption, posts[0].tags);
