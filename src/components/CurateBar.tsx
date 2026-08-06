"use client";

import { useState } from "react";
import { getCurateMessage, parseCuratePrompt } from "@/lib/curate";
import { getTagLabels } from "@/lib/natureTaxonomy";
import type { NatureTag } from "@/lib/types";

interface CurateBarProps {
  onSubmit: (prompt: string) => Promise<void>;
  message: string | null;
  loading?: boolean;
  activeTags?: string[];
  onClear: () => void;
}

export function CurateBar({
  onSubmit,
  message,
  loading = false,
  activeTags = [],
  onClear,
}: CurateBarProps) {
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setPrompt(value);
    if (value.trim()) {
      const tags = parseCuratePrompt(value);
      setPreview(getCurateMessage(tags));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    await onSubmit(prompt);
    setPrompt("");
    setPreview(null);
  };

  return (
    <div className="absolute left-0 right-0 top-0 z-20 px-4 pt-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-black/30 p-3 backdrop-blur-md">
          <input
            type="text"
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            disabled={loading}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder='Ask anything: "trees and wilflife" or "show me ocean sunsets"'
            className="w-full rounded-xl bg-white/90 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-moss-400 disabled:opacity-60 normal-case"
          />
          {preview && prompt && !loading && (
            <p className="mt-1.5 px-1 text-xs text-white/80">{preview}</p>
          )}
          {loading && (
            <p className="mt-1.5 flex items-center gap-2 px-1 text-xs text-white/80">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Curating your feed...
            </p>
          )}
          {message && !loading && (
            <div className="mt-2 rounded-lg bg-forest-600/80 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-white">{message}</p>
                  {activeTags.length > 0 && (
                    <p className="mt-1 text-[10px] text-forest-100">
                      {getTagLabels(activeTags as NatureTag[]).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClear}
                  className="shrink-0 text-xs text-white/80 underline hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
