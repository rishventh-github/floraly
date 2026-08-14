"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFloraly } from "@/context/FloralyContext";
import { useTheme } from "@/context/ThemeContext";
import { getInitials } from "@/lib/auth";
import type { UserSettings } from "@/lib/authTypes";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-stone-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-forest-600" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, settings, updateSettings, updateDisplayName, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { syncMyPostsCommentsEnabled } = useFloraly();
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.displayName ?? "");
  }, [user?.displayName]);

  if (!user) return null;

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    updateSettings({ [key]: value });
  };

  const handleSaveName = () => {
    const err = updateDisplayName(name);
    setNameMsg(err ?? "Display name updated.");
  };

  const handleLogout = () => {
    // Clear session first, then land on the public promo page.
    logout();
    router.replace("/");
  };

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 pr-28 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Link
            href="/home"
            className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <h1 className="font-display text-2xl text-ink">Settings</h1>
          <p className="mt-1 text-sm text-stone-500">Account and experience preferences</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-6 py-6">
        {/* Account card */}
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-stone-200">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-lg font-medium text-white">
              {getInitials(user.displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{user.displayName}</p>
              <p className="truncate text-sm text-stone-500">{user.email}</p>
              <p className="mt-0.5 text-xs text-stone-400">Joined {user.createdAt}</p>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-ink-muted">Display name</label>
            <div className="mt-1.5 flex gap-2">
              <input autoCapitalize="none" autoCorrect="off" spellCheck={false}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-stone-200 bg-cream-50 px-4 py-2.5 text-sm focus:border-forest-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-700"
              >
                Save
              </button>
            </div>
            {nameMsg && (
              <p className="mt-2 text-xs text-stone-500">{nameMsg}</p>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl bg-surface px-5 ring-1 ring-stone-200">
          <h2 className="pt-4 font-display text-lg text-ink">Appearance</h2>
          <div className="divide-y divide-stone-100">
            <ToggleRow
              label="Dark mode"
              description="Use a darker forest palette. Turn off for the classic light look."
              checked={darkMode}
              onChange={setDarkMode}
            />
          </div>
        </section>

        {/* Experience */}
        <section className="rounded-2xl bg-surface px-5 ring-1 ring-stone-200">
          <h2 className="pt-4 font-display text-lg text-ink">Experience</h2>
          <div className="divide-y divide-stone-100">
            <ToggleRow
              label="Prefer nearby nature"
              description="Weight your feed toward your chosen region when available."
              checked={settings.preferLocalNature}
              onChange={(v) => set("preferLocalNature", v)}
            />
            <ToggleRow
              label="Curate bar on feed"
              description="Show the natural-language feed curator at the top of reels."
              checked={settings.showCurateBar}
              onChange={(v) => set("showCurateBar", v)}
            />
            <ToggleRow
              label="Pop-up collection"
              description="Off by default. Turn on to hunt flora/fauna stickers on reels and use the lucky spinner when sharing."
              checked={settings.speciesStickersEnabled}
              onChange={(v) => set("speciesStickersEnabled", v)}
            />
            <ToggleRow
              label="Auto-save liked reels"
              description="Hearts also add reels to your Saved collection."
              checked={settings.autoSaveLikes}
              onChange={(v) => set("autoSaveLikes", v)}
            />
          </div>
        </section>

        {/* Privacy & community */}
        <section className="rounded-2xl bg-surface px-5 ring-1 ring-stone-200">
          <h2 className="pt-4 font-display text-lg text-ink">Privacy & community</h2>
          <div className="divide-y divide-stone-100">
            <ToggleRow
              label="Allow comments"
              description="Let others leave comments on your shared reels."
              checked={settings.allowComments}
              onChange={(v) => {
                set("allowComments", v);
                if (user) syncMyPostsCommentsEnabled(user.id, v);
              }}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-5 ring-1 ring-stone-200">
          <h2 className="font-display text-lg text-ink">Shortcuts</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/setup"
              className="rounded-xl bg-forest-50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-forest-100"
            >
              Edit nature interests
            </Link>
            <Link
              href="/my-reels"
              className="rounded-xl bg-forest-50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-forest-100"
            >
              My reels
            </Link>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
        >
          Sign out
        </button>

        <p className="pb-4 text-center text-[11px] text-stone-400">
          Location is always optional and stored only as a broad region.
        </p>
      </main>
    </div>
  );
}
