"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_PATHS = ["/", "/login"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
  );

  useEffect(() => {
    if (!ready) return;

    // Signed out on a protected page → return to the promo/home landing
    // (not login), so sign-out always lands on the overall home page.
    if (!isAuthenticated && !isPublic) {
      router.replace("/");
      return;
    }

    // Already signed in - skip promo/login and enter the app
    if (isAuthenticated && pathname === "/login") {
      router.replace("/home");
    }
  }, [ready, isAuthenticated, isPublic, pathname, router]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-100">
        <div className="text-center">
          <span className="text-4xl">🌿</span>
          <p className="mt-3 font-display text-xl text-ink-muted">Floraly</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublic) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-100">
        <p className="text-sm text-stone-500">Returning to Floraly...</p>
      </div>
    );
  }

  if (isAuthenticated && pathname === "/login") {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-100">
        <p className="text-sm text-stone-500">Entering Floraly...</p>
      </div>
    );
  }

  return <>{children}</>;
}
