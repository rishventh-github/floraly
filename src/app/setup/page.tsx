"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useFloraly } from "@/context/FloralyContext";
import type { NatureTag, Region } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const { setOnboarding, preferences, ready } = useFloraly();
  const [selectedTags, setSelectedTags] = useState<NatureTag[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | undefined>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setSelectedTags(preferences.selectedTags);
    setSelectedRegion(preferences.region);
    setHydrated(true);
  }, [ready, preferences.selectedTags, preferences.region]);

  const toggleTag = (tag: NatureTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleContinue = () => {
    setOnboarding(selectedTags, selectedRegion);
    router.push("/feed");
  };

  if (!ready || !hydrated) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-cream-100"
        style={{ paddingBottom: "var(--nav-height)" }}
      >
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 pr-28 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <Link href="/home" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <h1 className="font-display text-2xl text-forest-800">Your interests</h1>
          <p className="mt-1 text-sm text-stone-500">
            Tell us what nature you love - we&apos;ll tailor your feed accordingly.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <CategoryPicker
          selectedTags={selectedTags}
          selectedRegion={selectedRegion}
          onToggleTag={toggleTag}
          onSelectRegion={setSelectedRegion}
          onContinue={handleContinue}
        />
      </main>
    </div>
  );
}
