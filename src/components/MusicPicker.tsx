"use client";

import { useEffect, useState } from "react";
import type { ReelMusic } from "@/lib/types";
import { searchMusicTracks } from "@/lib/communityClient";

interface MusicPickerProps {
  value: ReelMusic | null;
  onChange: (music: ReelMusic | null) => void;
  disabled?: boolean;
}

export function MusicPicker({ value, onChange, disabled }: MusicPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReelMusic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const tracks = await searchMusicTracks(q);
        if (!cancelled) {
          setResults(tracks);
          setError(tracks.length === 0 ? "No songs found - try another search." : null);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setError("Couldn't search music right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="mt-6">
      <label className="text-sm font-medium text-ink-muted">
        Music <span className="font-normal text-stone-400">(optional)</span>
      </label>
      <p className="mt-1 text-xs text-stone-500">
        Search for a song that fits the mood of this nature reel.
      </p>

      {value ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-forest-50 p-3 ring-1 ring-forest-100">
          {value.artworkUrl ? (
            <img
              src={value.artworkUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-forest-600 text-xs font-medium text-white">
              Music
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{value.title}</p>
            <p className="truncate text-xs text-stone-500">{value.artist}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <input autoCapitalize="none" autoCorrect="off" spellCheck={false}
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="mt-2 w-full rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none disabled:opacity-50"
          />
          {loading && (
            <p className="mt-2 text-xs text-stone-400">Searching...</p>
          )}
          {error && !loading && (
            <p className="mt-2 text-xs text-stone-500">{error}</p>
          )}
          {results.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-surface">
              {results.map((track) => (
                <li key={track.id} className="border-b border-stone-100 last:border-0">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(track);
                      setQuery("");
                      setResults([]);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-cream-50 disabled:opacity-50"
                  >
                    {track.artworkUrl ? (
                      <img
                        src={track.artworkUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-moss-100 text-[10px] font-medium text-ink-muted">
                        Track
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-stone-500">{track.artist}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
