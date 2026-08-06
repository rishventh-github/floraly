"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loadSession,
  loadSettings,
  loginAccount,
  registerAccount,
  saveSession,
  saveSettings,
  updateAccountProfile,
} from "@/lib/auth";
import {
  getOrCreatePresenceSessionId,
  postStatsEvent,
} from "@/lib/communityClient";
import {
  DEFAULT_SETTINGS,
  type AuthUser,
  type UserSettings,
} from "@/lib/authTypes";

interface AuthContextValue {
  user: AuthUser | null;
  settings: UserSettings;
  ready: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<string | null>;
  logout: () => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  updateDisplayName: (displayName: string) => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = loadSession();
    setUser(session);
    if (session) {
      setSettings(loadSettings(session.id));
      void postStatsEvent({
        type: "user_seen",
        userId: session.id,
        displayName: session.displayName,
      });
    }
    setReady(true);
  }, []);

  // Concurrent presence heartbeat while signed in
  useEffect(() => {
    if (!user) return;
    const sessionId = getOrCreatePresenceSessionId();
    const beat = () => {
      void postStatsEvent({
        type: "heartbeat",
        sessionId,
        userId: user.id,
        displayName: user.displayName,
      });
    };
    beat();
    const id = window.setInterval(beat, 15_000);
    const onLeave = () => {
      void postStatsEvent({ type: "leave", sessionId });
    };
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const result = loginAccount({ email, password });
    if ("error" in result) return result.error;
    setUser(result.user);
    setSettings(loadSettings(result.user.id));
    void postStatsEvent({
      type: "user_seen",
      userId: result.user.id,
      displayName: result.user.displayName,
    });
    return null;
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = registerAccount({ email, password, displayName });
      if ("error" in result) return result.error;
      setUser(result.user);
      setSettings(loadSettings(result.user.id));
      void postStatsEvent({
        type: "join",
        userId: result.user.id,
        displayName: result.user.displayName,
      });
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    const sessionId = getOrCreatePresenceSessionId();
    void postStatsEvent({ type: "leave", sessionId });
    saveSession(null);
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        if (user) saveSettings(user.id, next);
        return next;
      });
    },
    [user]
  );

  const updateDisplayName = useCallback(
    (displayName: string) => {
      if (!user) return "Not signed in.";
      if (displayName.trim().length < 2) {
        return "Display name must be at least 2 characters.";
      }
      const updated = updateAccountProfile(user.id, { displayName });
      if (!updated) return "Could not update profile.";
      setUser(updated);
      return null;
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      settings,
      ready,
      isAuthenticated: user !== null,
      login,
      signup,
      logout,
      updateSettings,
      updateDisplayName,
    }),
    [
      user,
      settings,
      ready,
      login,
      signup,
      logout,
      updateSettings,
      updateDisplayName,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
