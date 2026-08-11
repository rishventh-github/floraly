"use client";

import { useRef, useState, useCallback } from "react";
import {
  RISK_LEVELS,
  SPECIES_CATALOG,
  getRiskMeta,
  spinSpeciesWheel,
  type SpeciesCard,
} from "@/lib/speciesCatalog";

interface LuckyWheelProps {
  value: SpeciesCard | null;
  onChange: (card: SpeciesCard | null) => void;
  disabled?: boolean;
}

const CARD_SIZE = 72; // px
const GAP = 8; // px
const VISIBLE_CARDS = 5;
const TRACK_WIDTH = VISIBLE_CARDS * CARD_SIZE + (VISIBLE_CARDS - 1) * GAP;

function buildStrip(count: number): SpeciesCard[] {
  const strip: SpeciesCard[] = [];
  for (let i = 0; i < count; i++) {
    strip.push(SPECIES_CATALOG[i % SPECIES_CATALOG.length]);
  }
  for (let i = strip.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [strip[i], strip[j]] = [strip[j], strip[i]];
  }
  return strip;
}

export function LuckyWheel({ value, onChange, disabled }: LuckyWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<SpeciesCard[]>(() => buildStrip(60));
  const [offset, setOffset] = useState(0);
  const hasSpun = Boolean(value) || spinning;
  const trackRef = useRef<HTMLDivElement>(null);

  const spin = useCallback(() => {
    if (disabled || spinning || value) return;
    setSpinning(true);
    const result = spinSpeciesWheel();
    const targetIdx = 45 + Math.floor(Math.random() * 5);
    const newStrip = buildStrip(60);
    newStrip[targetIdx] = result;
    setStrip(newStrip);

    const centerOffset =
      targetIdx * (CARD_SIZE + GAP) - Math.floor(VISIBLE_CARDS / 2) * (CARD_SIZE + GAP);
    setOffset(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffset(-centerOffset);
      });
    });

    window.setTimeout(() => {
      onChange(result);
      setSpinning(false);
    }, 3000);
  }, [disabled, spinning, value, onChange]);

  return (
    <div className="mt-6 rounded-2xl bg-surface p-4 ring-1 ring-stone-200">
      <div>
        <p className="text-sm font-medium text-ink-muted">
          Lucky Slider{" "}
          <span className="font-normal text-rose-600">(required · one spin)</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          You must slide once for a flora or fauna sticker before sharing. Rarer conservation
          statuses appear far less often - Least Concern is common; Extinct is vanishingly rare.
        </p>
      </div>

      <div className="mt-4">
        <div
          className="relative mx-auto overflow-hidden rounded-xl border-2 border-forest-600 bg-cream-50"
          style={{ width: TRACK_WIDTH, height: CARD_SIZE + 16 }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-[4px] -translate-x-1/2 bg-forest-600 opacity-60" />
          <div
            ref={trackRef}
            className="absolute top-2 left-0 flex gap-2"
            style={{
              transform: `translateX(${offset}px)`,
              transition: spinning
                ? "transform 3s cubic-bezier(0.12, 0.75, 0.12, 1)"
                : "none",
            }}
          >
            {strip.map((species, i) => {
              const meta = getRiskMeta(species.riskLevel);
              return (
                <div
                  key={`${species.id}-${i}`}
                  className={`relative shrink-0 overflow-hidden rounded-lg ring-2 ${meta.badgeClass}`}
                  style={{ width: CARD_SIZE, height: CARD_SIZE }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={species.imageUrl}
                    alt={species.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[8px] leading-tight text-white">
                    {species.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {!hasSpun && (
            <button
              type="button"
              disabled={disabled || spinning}
              onClick={spin}
              className="rounded-xl bg-forest-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50"
            >
              {spinning ? "Sliding..." : "Slide for a card"}
            </button>
          )}
          {value && !spinning && (
            <p className="text-xs text-stone-500">Card locked in - one sticker per reel.</p>
          )}
          {!value && !spinning && (
            <p className="w-full text-center text-xs text-rose-600">
              Slide to unlock sharing with the community.
            </p>
          )}
        </div>

        {value && !spinning && (
          <div
            className={`mt-4 flex items-center gap-3 rounded-xl p-3 ring-1 ${getRiskMeta(value.riskLevel).badgeClass} ${getRiskMeta(value.riskLevel).glowClass}`}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.imageUrl}
                alt={value.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-medium">{value.name}</p>
              <p className="text-xs opacity-80">
                {getRiskMeta(value.riskLevel).label} · {getRiskMeta(value.riskLevel).points} pts
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {RISK_LEVELS.map((level) => (
            <div
              key={level.id}
              className={`rounded-lg px-1.5 py-1 text-center text-[9px] ring-1 ${level.badgeClass}`}
              title={`${level.label}: ${level.points} pts`}
            >
              {level.shortLabel} · {level.points}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
