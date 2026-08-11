"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/feed",
    label: "Feed",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Share",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "Ranks",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h7v7" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Saved",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { commentsOpen } = useUI();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;
  if (pathname === "/setup" || pathname === "/" || pathname === "/login" || commentsOpen) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-moss-200/60 bg-cream-50/95 backdrop-blur-md pointer-events-auto"
      style={{ height: "var(--nav-height)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-full max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/home"
              ? pathname === "/home"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] transition-colors pointer-events-auto sm:min-w-[64px] sm:text-xs ${
                active
                  ? "text-ink-muted bg-forest-50"
                  : "text-stone-500 hover:bg-cream-100 hover:text-forest-600"
              }`}
            >
              <span className={active ? "text-forest-600" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
