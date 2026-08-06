"use client";

import { NATURE_TAGS, REGIONS } from "@/lib/constants";
import type { NatureTag, Region } from "@/lib/types";

interface CategoryPickerProps {
  selectedTags: NatureTag[];
  selectedRegion?: Region;
  onToggleTag: (tag: NatureTag) => void;
  onSelectRegion: (region?: Region) => void;
  onContinue: () => void;
}

export function CategoryPicker({
  selectedTags,
  selectedRegion,
  onToggleTag,
  onSelectRegion,
  onContinue,
}: CategoryPickerProps) {
  const canContinue = selectedTags.length >= 1;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl text-forest-800">
          What nature speaks to you?
        </h2>
        <p className="mt-2 text-stone-600">
        Pick at least 1 category. We&apos;ll tailor your feed to what you love.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NATURE_TAGS.map((tag) => {
          const selected = selectedTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTag(tag.id)}
              className={`rounded-2xl border-2 p-4 text-left ring-1 transition-all ${
                selected
                  ? `${tag.chipSelectedClass} border-transparent shadow-sm`
                  : `${tag.chipClass} border-transparent hover:brightness-95`
              }`}
            >
              <p className="font-medium">{tag.label}</p>
              <p className={`mt-0.5 text-xs ${selected ? "text-white/80" : "opacity-70"}`}>
                {tag.description}
              </p>
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="font-display text-lg text-forest-800">
          Your region <span className="text-sm font-normal text-stone-500">(optional)</span>
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          We only use broad regions, never your exact location.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const selected = selectedRegion === region.id;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => onSelectRegion(selected ? undefined : region.id)}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  selected
                    ? "bg-forest-600 text-white"
                    : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-forest-300"
                }`}
              >
                {region.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="w-full rounded-2xl bg-forest-600 py-4 font-medium text-white transition-all hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {canContinue ? "Start exploring" : "Select at least 1 interest"}
      </button>
    </div>
  );
}
