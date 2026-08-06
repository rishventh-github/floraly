"""
Seed Floraly feed posts from public/nature-feed JPEGs.
Uses local model captions when available, otherwise unique template captions.
"""
from __future__ import annotations

import json
import random
import re
from datetime import date, timedelta
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "public" / "nature-feed"
OUT = ROOT / "src" / "lib" / "mockPosts.ts"
CACHE = ROOT / "scripts" / ".local-caption-cache.json"

AUTHORS = [
    ("Ava Morales", "A"),
    ("Noah Patel", "N"),
    ("Mia Chen", "M"),
    ("Liam Brooks", "L"),
    ("Sofia Reyes", "S"),
    ("Ethan Park", "E"),
    ("Isla Nguyen", "I"),
    ("Owen Hart", "O"),
    ("Zoe Kim", "Z"),
    ("Kai Rivera", "K"),
    ("Elena Cruz", "E"),
    ("Jordan Hale", "J"),
    ("Priya Shah", "P"),
    ("Sam Torres", "S"),
    ("Riley Quinn", "R"),
]

KEYWORD_TAGS = [
    (re.compile(r"sunset|sunrise|dusk|dawn|orange sky|pink|golden|plane|flying|cloud", re.I), "sunsets"),
    (re.compile(r"ocean|beach|shore|sea|coast|wave", re.I), "coast"),
    (re.compile(r"lake|river|waterfall|stream|pond|water|canal|boat|hose", re.I), "water"),
    (re.compile(r"forest|tree|trees|jungle|woods|bamboo|canopy|palm|grass|field|hill", re.I), "forests"),
    (re.compile(r"mountain|peak|ridge|valley", re.I), "mountains"),
    (re.compile(r"bird|monkey|deer|animal|wildlife|elephant|stork|dog|cat|standing on a branch", re.I), "wildlife"),
    (re.compile(r"flower|bloom|blossom|petal|lotus|rose", re.I), "flowers"),
    (re.compile(r"desert|sand|dune|arid|cactus|dirt", re.I), "desert"),
    (re.compile(r"snow|ice|frost|winter", re.I), "snow"),
    (re.compile(r"campfire|fire|bonfire|embers|night sky|star", re.I), "campfires"),
]

OPENERS = [
    "Caught this",
    "Still thinking about",
    "Needed",
    "Saving",
    "Out here for",
    "Paused for",
    "Lucky to find",
    "Keeping",
    "Savoring",
    "Wandering into",
]

MOMENTS = {
    "water": [
        "the soft pull of moving water",
        "a quiet stretch of blue",
        "ripples catching the light",
        "water carving its own path",
        "a calm riverside pause",
        "the hush beside the current",
        "clear water over dark stone",
        "a shoreline that slows you down",
    ],
    "forests": [
        "deep green shade",
        "a pocket of canopy light",
        "trees holding the afternoon still",
        "leafy quiet on the trail",
        "mossy green everywhere you look",
        "a forest corner worth remembering",
        "filtered light between trunks",
        "that cool air under the trees",
    ],
    "mountains": [
        "ridges folding into haze",
        "high ground and bigger sky",
        "stone stacked against the horizon",
        "a climb that paid off",
        "mountain air clearing the noise",
        "peaks waiting in the distance",
        "elevation and an easy exhale",
        "wide views after the hard miles",
    ],
    "wildlife": [
        "a wild neighbor mid-pause",
        "eye contact with the outdoors",
        "wildlife doing its own thing",
        "a creature perfectly at home",
        "a brief wild cameo",
        "nature showing up unscripted",
        "patience rewarded with wildlife",
        "a living detail in the landscape",
    ],
    "campfires": [
        "warm light after a long day",
        "embers under open sky",
        "fireglow and slow conversation",
        "that orange camp quiet",
        "woodsmoke settling the night",
        "a circle of soft firelight",
    ],
    "sunsets": [
        "the sky putting on color",
        "golden hour doing its thing",
        "last light spilling everywhere",
        "a pink-and-orange fade",
        "sunset settling the whole mood",
        "warm light worth chasing",
        "the day ending in soft fire",
        "horizon glow and nowhere to rush",
    ],
    "flowers": [
        "color showing up close",
        "petals catching soft light",
        "a bloom that stopped me",
        "wild color on the path",
        "small flowers, big joy",
        "nature's detail work",
        "a bright patch of blooms",
    ],
    "desert": [
        "dry light and open quiet",
        "warm earth under a hard sky",
        "sparse land, full feeling",
        "heat shimmer on the horizon",
        "desert textures in clear air",
        "wide arid calm",
    ],
    "snow": [
        "cold air and clean quiet",
        "snow softening every edge",
        "bright winter hush",
        "frosted ground under pale light",
        "crisp air after snowfall",
        "white quiet that resets you",
    ],
    "coast": [
        "salt air and long horizons",
        "waves rewriting the shore",
        "coastal light with no hurry",
        "tide sounds replacing everything",
        "sea breeze clearing the mind",
        "where land meets endless blue",
        "ocean calm after a long week",
    ],
}

CLOSERS = [
    "",
    " Felt lucky.",
    " Pure peace.",
    " Worth the stop.",
    " No filter needed.",
    " Taking this with me.",
    " Nature therapy.",
    " Exactly what I needed.",
]


def tags_from_text(text: str) -> list[str]:
    found = []
    for re_pat, tag in KEYWORD_TAGS:
        if re_pat.search(text) and tag not in found:
            found.append(tag)
    return found[:3]


def analyze_colors(path: Path) -> list[str]:
    im = Image.open(path).convert("RGB")
    small = im.resize((80, 80), Image.Resampling.BILINEAR)
    pixels = list(small.getdata())
    n = len(pixels)
    mean_r = sum(p[0] for p in pixels) / n
    mean_g = sum(p[1] for p in pixels) / n
    mean_b = sum(p[2] for p in pixels) / n
    mean = (mean_r + mean_g + mean_b) / 3
    warm = greenish = bluish = bright = dark = sat_sum = top_warm = top_blue = 0
    for i, (r, g, b) in enumerate(pixels):
        mx, mn = max(r, g, b), min(r, g, b)
        sat = 0 if mx == 0 else (mx - mn) / mx
        sat_sum += sat
        y = i // 80
        lum = (r + g + b) / 3
        if lum > 200:
            bright += 1
        if lum < 40:
            dark += 1
        if r > g + 12 and r > b + 8:
            warm += 1
            if y < 35:
                top_warm += 1
        if b >= g and b > r + 8:
            bluish += 1
            if y < 35:
                top_blue += 1
        if g > r + 8 and g > b + 8:
            greenish += 1
    sat = sat_sum / n
    scores = {
        "sunsets": top_warm / n * 2.2 + warm / n * 0.8 + (mean_r > mean_b + 25) * 0.5,
        "water": bluish / n * 1.3 + (mean_b > mean_r) * 0.4,
        "coast": top_blue / n * 1.4 + bluish / n * 0.7,
        "forests": greenish / n * 1.6,
        "flowers": (sat > 0.35) * 0.7 + warm / n * 0.4 + greenish / n * 0.3,
        "snow": (bright / n) * 1.1 + (sat < 0.15 and mean > 170) * 1.0 - greenish / n,
        "desert": warm / n * 0.8 + (greenish / n < 0.12) * 0.5 + (sat > 0.2) * 0.2,
        "mountains": (sat < 0.3) * 0.3 + top_blue / n * 0.4 + (mean < 150) * 0.2,
        "wildlife": greenish / n * 0.5 + (sat > 0.2) * 0.25,
        "campfires": warm / n * 0.9 + (dark / n > 0.35) * 0.7 + (mean < 100) * 0.4,
    }
    if dark / n > 0.55 and mean < 70:
        scores["forests"] += 0.4
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    tags = [t for t, s in ranked if s > 0.22][:3] or [ranked[0][0]]
    if "snow" in tags and greenish / n > 0.12:
        tags = [t for t in tags if t != "snow"] or ["forests"]
    return tags


def polish_model_caption(raw: str, seed: int) -> str:
    t = re.sub(r"^(a photo of|an image of|a picture of)\s+", "", raw.strip(), flags=re.I)
    t = re.sub(r"\s+", " ", t).strip(" .")
    if not t:
        return ""
    # rewrite a few awkward model phrases into feed-friendly lines
    replacements = [
        (r"^a pile of dirt.*", "Harvest laid out to dry under open sky"),
        (r"^a plane is flying.*", "Above the clouds as the sky turns color"),
        (r"^a bird standing.*", "A bird pausing long enough for the frame"),
        (r"^a river with.*", "Following the river through green banks"),
        (r"^a grassy hill.*", "Green hills rolling into soft distance"),
    ]
    for pat, rep in replacements:
        if re.match(pat, t, flags=re.I):
            t = rep
            break
    else:
        t = t[0].upper() + t[1:]
    if not t.endswith((".", "!", "?")):
        t += "."
    closers = ["", " Felt lucky.", " Pure peace.", " Worth the stop.", " Taking this with me."]
    closer = closers[seed % len(closers)]
    out = t.rstrip(".!") + "." + closer if closer else t
    return out[:120]


def template_caption(tags: list[str], seed: int) -> str:
    primary = tags[0]
    opener = OPENERS[seed % len(OPENERS)]
    moment = MOMENTS[primary][seed % len(MOMENTS[primary])]
    if len(tags) > 1 and seed % 3 == 0:
        secondary = MOMENTS[tags[1]][(seed // 7) % len(MOMENTS[tags[1]])]
        moment = f"{moment} and {secondary}"
    closer = CLOSERS[(seed // 11) % len(CLOSERS)]
    caption = f"{opener} {moment}.{closer}"
    caption = " ".join(caption.split())
    if seed % 17 == 0 and len(caption) < 100:
        caption = caption.rstrip(".") + ". Reminds me why I go outside."
    return caption[:120]


def region_for(tags: list[str], seed: int) -> str:
    if "coast" in tags:
        return ["los_angeles", "pacific_northwest", "bay_area", "international"][seed % 4]
    if "snow" in tags or "mountains" in tags:
        return ["rocky_mountains", "pacific_northwest", "international"][seed % 3]
    if "desert" in tags:
        return ["los_angeles", "international"][seed % 2]
    if "forests" in tags or "wildlife" in tags:
        return ["pacific_northwest", "bay_area", "northeast", "international"][seed % 4]
    return ["bay_area", "los_angeles", "international", "southeast"][seed % 4]


def main() -> None:
    files = sorted(FEED.glob("*.jpg"))
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    posts = []
    used: set[str] = set()

    for i, path in enumerate(files):
        seed = sum(path.name.encode()) ^ (i * 9973)
        raw = cache.get(path.name, "")
        color_tags = analyze_colors(path)
        text_tags = tags_from_text(raw) if raw else []
        # Prefer text tags when model saw something useful, else colors
        tags = text_tags or color_tags
        # Merge one color tag if helpful
        for t in color_tags:
            if t not in tags and len(tags) < 3:
                tags.append(t)

        if raw:
            caption = polish_model_caption(raw, seed) or template_caption(tags, seed)
        else:
            caption = template_caption(tags, seed)

        n = 0
        while caption in used and n < 50:
            caption = template_caption(tags, seed + 31 * (n + 1))
            n += 1
        used.add(caption)

        author, initial = AUTHORS[sum(path.stem.encode()) % len(AUTHORS)]
        posts.append(
            {
                "id": f"np-{i + 1:03d}",
                "imageUrl": f"/nature-feed/{path.name}",
                "author": author,
                "authorInitial": initial,
                "tags": tags,
                "region": region_for(tags, seed),
                "likes": 40 + (sum(path.name.encode()) % 520),
                "rank": round(0.72 + ((sum(path.stem.encode()) % 280) / 1000), 3),
                "comments": (
                    [
                        {
                            "id": f"npc-{i + 1}",
                            "author": AUTHORS[(sum(path.stem.encode()) + 3) % len(AUTHORS)][0].split()[0],
                            "text": "This feels like peace.",
                            "createdAt": (date(2026, 7, 27) - timedelta(days=((i + 2) % 60))).isoformat(),
                            "likes": 1 + (sum(path.name.encode()) % 18),
                        }
                    ]
                    if sum(path.name.encode()) % 5 == 0
                    else []
                ),
                "createdAt": (date(2026, 7, 27) - timedelta(days=(i % 60))).isoformat(),
            }
        )
        if (i + 1) % 50 == 0 or i + 1 == len(files):
            print(f"seeded {i + 1}/{len(files)}")

    OUT.write_text(
        'import type { NaturePost } from "./types";\n\n'
        "/** Seeded from Nature Pics → /public/nature-feed (HEIC converted to JPEG). */\n"
        f"export const MOCK_POSTS: NaturePost[] = {json.dumps(posts, indent=2)};\n"
    )
    print(f"Wrote {len(posts)} posts (no captions), model-assisted={sum(1 for f in files if f.name in cache)}")
    for p in posts[:5]:
        print("-", p["id"], p["tags"])


if __name__ == "__main__":
    main()
