"use client";

import type { FormEvent } from "react";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup } = useAuth();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const nextPath = searchParams.get("next") || "/home";

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const result =
      mode === "login"
        ? await login(email, password)
        : await signup(email, password, displayName);

    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    router.replace(nextPath.startsWith("/") ? nextPath : "/home");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cream-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 0%, #c8d9c4 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, #eef3ee 0%, transparent 45%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 self-start">
          <span className="text-2xl">🌿</span>
          <span className="font-display text-2xl text-ink">Floraly</span>
        </Link>

        <h1 className="font-display text-3xl text-ink">
          {mode === "login" ? "Welcome back" : "Join Floraly"}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {mode === "login"
            ? "Sign in to reopen your nature feed, saved reels, and outdoor memories."
            : "Create an account to curate outdoor moments and share your own."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium text-ink-muted">Display name</label>
              <input autoCapitalize="none" autoCorrect="off" spellCheck={false}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Trailwalker"
                required
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink-muted">Email</label>
            <input autoCapitalize="none" autoCorrect="off" spellCheck={false}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink-muted">Password</label>
            <input autoCapitalize="none" autoCorrect="off" spellCheck={false}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-forest-600 py-3.5 text-sm font-medium text-white transition hover:bg-forest-700 disabled:opacity-50"
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-medium text-ink-muted underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-medium text-ink-muted underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="mt-8 text-center text-[11px] text-stone-400">
          Demo auth is stored on this device only. Use a password you don&apos;t reuse elsewhere.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-cream-100">
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
