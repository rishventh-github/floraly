/**
 * Local image captioning for Floraly feed seeding (no OpenAI).
 * Usage: node scripts/caption-with-transformers.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline, env } from "@xenova/transformers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const feedDir = path.join(root, "public", "nature-feed");
const cachePath = path.join(root, "scripts", ".local-caption-cache.json");
const outPath = path.join(root, "src", "lib", "mockPosts.ts");

env.cacheDir = path.join(root, "scripts", ".transformers-cache");
env.allowLocalModels = false;

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

const KEYWORD_TAGS = [
  [/sunset|sunrise|dusk|dawn|orange sky|pink sky|golden hour/i, "sunsets"],
  [/ocean|beach|shore|sea|coast|wave|cliff by/i, "coast"],
  [/lake|river|waterfall|stream|pond|water|canal|boat/i, "water"],
  [/forest|tree|trees|jungle|woods|bamboo|canopy|palm/i, "forests"],
  [/mountain|hill|peak|ridge|valley/i, "mountains"],
  [/bird|monkey|deer|animal|wildlife|dog|cat|elephant|stork|langur/i, "wildlife"],
  [/flower|bloom|blossom|petal|lotus|rose/i, "flowers"],
  [/desert|sand|dune|arid|cactus/i, "desert"],
  [/snow|ice|frost|winter|ski/i, "snow"],
  [/campfire|fire|bonfire|embers/i, "campfires"],
  [/star|night sky|milky/i, "forests"],
  [/cloud|sky/i, "sunsets"],
];

function tagsFromCaption(text) {
  const found = [];
  for (const [re, tag] of KEYWORD_TAGS) {
    if (re.test(text) && !found.includes(tag)) found.push(tag);
  }
  if (!found.length) found.push("forests");
  return found.slice(0, 3);
}

function regionFromTags(tags, seed) {
  if (tags.includes("coast")) return ["los_angeles", "pacific_northwest", "bay_area", "international"][seed % 4];
  if (tags.includes("snow") || tags.includes("mountains"))
    return ["rocky_mountains", "pacific_northwest", "international"][seed % 3];
  if (tags.includes("desert")) return ["los_angeles", "international"][seed % 2];
  if (tags.includes("forests"))
    return ["pacific_northwest", "bay_area", "northeast", "international"][seed % 4];
  return REGIONS[seed % REGIONS.length];
}

function polishCaption(raw, seed) {
  let t = String(raw || "")
    .replace(/^a photo of\s+/i, "")
    .replace(/^an image of\s+/i, "")
    .replace(/^a picture of\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) t = "a quiet outdoor moment";

  // Capitalize
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";

  const openers = [
    "",
    "Caught this: ",
    "Still thinking about ",
    "Needed this — ",
    "Saving this view: ",
    "Out here: ",
  ];
  const opener = openers[seed % openers.length];
  if (opener.startsWith("Still thinking about") || opener.startsWith("Needed this")) {
    // lowercase after opener phrase when blending
    const body = t.charAt(0).toLowerCase() + t.slice(1);
    t = opener + body.replace(/\.$/, "") + ".";
  } else if (opener === "Caught this: " || opener === "Saving this view: " || opener === "Out here: ") {
    t = opener + t.charAt(0).toLowerCase() + t.slice(1);
  }

  // Soften generic model captions
  t = t
    .replace(/\ba group of\b/gi, "some")
    .replace(/\bvery\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (t.length > 118) t = t.slice(0, 115).replace(/\s+\S*$/, "") + ".";
  return t;
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

const files = fs
  .readdirSync(feedDir)
  .filter((f) => f.toLowerCase().endsWith(".jpg"))
  .sort();

/** @type {Record<string, string>} */
let cache = {};
if (fs.existsSync(cachePath)) {
  cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
}

console.log("Loading captioning model (first run downloads weights)...");
const captioner = await pipeline(
  "image-to-text",
  "Xenova/vit-gpt2-image-captioning"
);

console.log(`Captioning ${files.length} photos...`);
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  if (!cache[file]) {
    const abs = path.join(feedDir, file);
    const out = await captioner(abs, { max_new_tokens: 40 });
    const raw = Array.isArray(out) ? out[0]?.generated_text : out?.generated_text;
    cache[file] = String(raw || "a nature scene");
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    }
  }
  if ((i + 1) % 20 === 0 || i + 1 === files.length) {
    console.log(`captioned ${i + 1}/${files.length}`);
  }
}
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

const posts = files.map((file, index) => {
  const raw = cache[file];
  const seed = hash(file);
  const caption = polishCaption(raw, seed);
  const tags = tagsFromCaption(`${raw} ${caption}`);
  const [author, authorInitial] = AUTHORS[seed % AUTHORS.length];
  const likes = 40 + (hash(file + "likes") % 520);
  const rank = Number((0.72 + (hash(file + "rank") % 280) / 1000).toFixed(3));
  const commentChance = hash(file + "c") % 5 === 0;

  return {
    id: `np-${String(index + 1).padStart(3, "0")}`,
    imageUrl: `/nature-feed/${file}`,
    caption,
    author,
    authorInitial,
    tags,
    region: regionFromTags(tags, seed),
    likes,
    rank,
    comments: commentChance
      ? [
          {
            id: `npc-${index + 1}`,
            author: AUTHORS[(seed + 3) % AUTHORS.length][0].split(" ")[0],
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

/** Seeded from local Nature Pics (HEIC → JPEG in /public/nature-feed). */
export const MOCK_POSTS: NaturePost[] = ${JSON.stringify(posts, null, 2)};
`;

fs.writeFileSync(outPath, ts);
console.log(`Wrote ${posts.length} posts`);
console.log("Samples:");
for (const p of posts.slice(0, 5)) {
  console.log("-", p.caption, p.tags);
}
