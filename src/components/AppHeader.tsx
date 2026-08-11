"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/auth";

const HIDDEN_PATHS = ["/", "/login"];

export function AppHeader() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;
  if (HIDDEN_PATHS.includes(pathname)) return null;

  const isFeedLike =
    pathname === "/feed" ||
    pathname.startsWith("/saved/watch") ||
    pathname === "/my-reels";

  return (
    <div
      className={`pointer-events-none fixed right-0 top-0 z-[90] flex items-center gap-2 px-4 pt-4 ${
        isFeedLike ? "" : ""
      }`}
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <Link
        href="/settings"
        className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
          isFeedLike
            ? "bg-black/35 text-white hover:bg-black/50"
            : "bg-surface/90 text-ink-muted shadow-sm ring-1 ring-stone-200 hover:bg-cream-50"
        }`}
        aria-label="Settings"
        title="Settings"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>

      <Link
        href="/settings"
        className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium backdrop-blur-md transition-transform hover:scale-105 ${
          isFeedLike
            ? "bg-forest-600/90 text-white ring-2 ring-white/30"
            : "bg-forest-600 text-white shadow-sm"
        }`}
        aria-label={`Account: ${user.displayName}`}
        title={user.displayName}
      >
        {getInitials(user.displayName)}
      </Link>
    </div>
  );
}
