# Floraly Mobile (Expo)

Nature-themed React Native app that talks to the Floraly Next.js API for classify, community stats, music search, curate, and static images (`/nature-feed/*`, `/species/*`).

## Prerequisites

1. **Next.js API running** at the URL in `EXPO_PUBLIC_API_URL` (default `http://127.0.0.1:3000`).

   From the repo root:

   ```bash
   npm install
   npm run dev
   ```

2. Node.js 20+ and Expo CLI tooling (`npx expo`).

## Setup

```bash
cd mobile
cp .env.example .env
# Edit .env if your API is not on 127.0.0.1:3000
# On a physical device, use your machine's LAN IP, e.g. http://192.168.1.20:3000

npm install
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## Environment

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL for Next.js (`/api/classify`, `/api/stats`, `/api/music/search`, `/api/curate`, and static assets via `assetUrl()`). |

## Notes

- Auth, preferences, posts, and drafts use **AsyncStorage** (no `localStorage` / `window`).
- Mock feed images like `/nature-feed/x.jpg` are loaded through `assetUrl()` against the API host.
- Sharing sets `authorId` from the signed-in user and `commentsEnabled` from settings.
