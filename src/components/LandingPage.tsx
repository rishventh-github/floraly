"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { SampleReelPreview } from "@/components/SampleReelPreview";
import { LandingStats } from "@/components/LandingStats";

const PILLARS = [
  {
    title: "Real outdoor memories",
    body: "Explore nature reels from real trails, coasts, and campfires.",
  },
  {
    title: "Curate your calm",
    body: "Feel free to tell Floraly what you want, whether it's water, forests, wildlife.",
  },
  {
    title: "Safe by design",
    body: "AI-generated and off-topic uploads are filtered in order to keep the experience as pure as possible.",
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-dvh bg-forest-950 text-white">
      {/* Full-bleed hero */}
      <section className="relative min-h-dvh overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1800&q=80"
          alt="Sunlight through a forest canopy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/50 via-forest-950/35 to-forest-950/90" />

        <div className="relative z-10 flex min-h-dvh flex-col">
          <header className="flex items-center justify-between px-6 py-5 sm:px-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                🌿
              </span>
              <span className="font-display text-2xl tracking-tight">Floraly</span>
            </div>
            {isAuthenticated ? (
              <Link
                href="/home"
                className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-md transition hover:bg-white/25"
              >
                Open app
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-md transition hover:bg-white/25"
              >
                Sign back in
              </Link>
            )}
          </header>

          <div className="mx-auto flex max-w-3xl flex-1 flex-col justify-end px-6 pb-16 pt-10 sm:px-10 sm:pb-20">
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Floraly
            </h1>
            <p className="mt-4 max-w-xl text-xl font-medium text-moss-300 sm:text-2xl">
              Join the community of nature enthusiasts today.
            </p>
            <p className="mt-4 max-w-xl text-lg text-white/85 sm:text-xl">
              Nature memories, shared. A calm place to scroll outdoor adventures and
              reconnect with the world beyond the screen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={isAuthenticated ? "/home" : "/login?mode=signup"}
                className="rounded-2xl bg-moss-400 px-6 py-3.5 text-sm font-medium text-forest-950 transition hover:bg-moss-300"
              >
                {isAuthenticated ? "Continue exploring" : "Join Floraly"}
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/20"
                >
                  Sign back in
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  href="/feed"
                  className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/20"
                >
                  Go to feed
                </Link>
              )}
            </div>
            <LandingStats />
            {!isAuthenticated && (
              <a
                href="#sample-feed"
                className="mt-6 inline-flex items-center gap-1 text-sm text-white/75 underline decoration-white/30 underline-offset-4 hover:text-white"
              >
                Try a sample reel scroll
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Sample reel experience */}
      <section
        id="sample-feed"
        className="bg-cream-100 px-6 py-16 text-forest-800 sm:px-10 sm:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-moss-400">
            Preview the experience
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">
            Scroll a sample nature feed
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-stone-600">
            Swipe through real outdoor moments the way Floraly feels inside the app -
            no account needed for this preview.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-md">
          <SampleReelPreview />
        </div>
        {!isAuthenticated && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-forest-600 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-forest-700"
            >
              Sign back in
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-2xl border border-forest-200 bg-white px-6 py-3.5 text-sm font-medium text-forest-800 transition hover:bg-cream-50"
            >
              Create an account
            </Link>
          </div>
        )}
      </section>

      {/* What it is */}
      <section className="border-t border-moss-200/50 bg-cream-50 px-6 py-20 text-forest-800 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl sm:text-4xl">Why Floraly exists</h2>
          <p className="mt-4 text-lg leading-relaxed text-stone-600">
            The current digital age often contains a bundle of stress and noise. Floraly aims
            to connect people through nature, the world's universal stress reliever. Share photos from your trips,
            discover places that feel like peace, and find peace in the outdoors.
          </p>
        </div>
      </section>

      <section className="border-t border-moss-200/40 bg-cream-100 px-6 py-20 sm:px-10">
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title}>
              <h3 className="font-display text-xl text-forest-800">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-forest-800 px-6 py-16 text-center sm:px-10">
        <h2 className="font-display text-3xl text-white">
          Join the community of nature enthusiasts today.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-forest-100">
          Start with what you love, and build a feed that feels like fresh air.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/home"
              className="inline-block rounded-2xl bg-cream-50 px-6 py-3.5 text-sm font-medium text-forest-800 transition hover:bg-white"
            >
              Enter Floraly
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-block rounded-2xl bg-cream-50 px-6 py-3.5 text-sm font-medium text-forest-800 transition hover:bg-white"
              >
                Sign back in
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-block rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Create your free account
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className="bg-forest-950 px-6 py-8 text-center text-xs text-white/40">
        Floraly: Connecting the world through nature memories
      </footer>
    </div>
  );
}
