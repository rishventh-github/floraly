"use client";

import { getRiskMeta, resolveSpeciesCard, type SpeciesCard } from "@/lib/speciesCatalog";
import { addSpeciesToCollection, loadCollectedSpeciesIds } from "@/lib/collection";
import { postStatsEvent } from "@/lib/communityClient";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

interface SpeciesDetailModalProps {
  species: SpeciesCard;
  onClose: () => void;
  onCollected?: (ids: string[]) => void;
}

export function SpeciesDetailModal({
  species: speciesProp,
  onClose,
  onCollected,
}: SpeciesDetailModalProps) {
  const species = resolveSpeciesCard(speciesProp);
  const { user } = useAuth();
  const risk = getRiskMeta(species.riskLevel);
  const [owned, setOwned] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOwned(false);
      return;
    }
    setOwned(loadCollectedSpeciesIds(user.id).includes(species.id));
  }, [user, species.id]);

  const collect = () => {
    if (!user) {
      setMessage("Sign in to add species to your collection.");
      return;
    }
    const result = addSpeciesToCollection(user.id, species.id);
    setOwned(true);
    setMessage(
      result.added
        ? `Added to your collection! (+${risk.points} pts)`
        : "Already in your collection."
    );
    onCollected?.(result.ids);
    void postStatsEvent({
      type: "sync_points",
      userId: user.id,
      displayName: user.displayName,
      points: result.points,
    });
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-xl ring-1 ring-stone-200 ${risk.glowClass}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={species.imageUrl} alt={species.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl text-forest-800">{species.name}</h2>
            <p className="mt-1 text-xs capitalize text-stone-500">
              {species.type} · {species.habitat}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ring-1 ${risk.badgeClass}`}
            >
              {risk.label} · {risk.points} pts
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-stone-600">{species.blurb}</p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">{risk.description}</p>

        {message && (
          <p className="mt-3 text-sm font-medium text-forest-700">{message}</p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={collect}
            disabled={owned && !message}
            className="rounded-xl bg-forest-600 px-4 py-3 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60"
          >
            {owned ? "In your collection" : "Add to collection"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-forest-800 ring-1 ring-stone-200 hover:bg-cream-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
