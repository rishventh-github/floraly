"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { STORAGE_KEYS } from "@/lib/constants";

export function CollectionHint() {
  const { settings, updateSettings } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (settings.speciesStickersEnabled) return;
    try {
      setDismissed(
        localStorage.getItem(STORAGE_KEYS.collectionHintDismissed) === "1"
      );
    } catch {
      setDismissed(false);
    }
  }, [settings.speciesStickersEnabled]);

  if (settings.speciesStickersEnabled || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEYS.collectionHintDismissed, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-forest-50 p-4 ring-1 ring-moss-200">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden>
          🍀
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            Try pop-up collection
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            Turn it on for fun: hunt flora and fauna stickers on reels, and use
            the lucky spinner when you share.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ speciesStickersEnabled: true })}
              className="rounded-xl bg-forest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-700"
            >
              Turn on
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-cream-100 hover:text-ink"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
