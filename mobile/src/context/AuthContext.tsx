import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  loadSession,
  loadSettings,
  loginAccount,
  registerAccount,
  saveSession,
  saveSettings,
  updateAccountProfile,
} from "../lib/auth";
import {
  getOrCreatePresenceSessionId,
  postStatsEvent,
} from "../lib/communityClient";
import {
  DEFAULT_SETTINGS,
  type AuthUser,
  type UserSettings,
} from "../lib/authTypes";

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
  updateDisplayName: (displayName: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await loadSession();
      if (cancelled) return;
      setUser(session);
      if (session) {
        setSettings(await loadSettings(session.id));
        void postStatsEvent({
          type: "user_seen",
          userId: session.id,
          displayName: session.displayName,
        });
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let sessionId = "";

    const start = async () => {
      sessionId = await getOrCreatePresenceSessionId();
      const beat = () => {
        void postStatsEvent({
          type: "heartbeat",
          sessionId,
          userId: user.id,
          displayName: user.displayName,
        });
      };
      beat();
      intervalId = setInterval(beat, 15_000);
    };
    void start();

    const onAppState = (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        if (sessionId) void postStatsEvent({ type: "leave", sessionId });
      }
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      if (intervalId) clearInterval(intervalId);
      sub.remove();
      if (sessionId) void postStatsEvent({ type: "leave", sessionId });
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginAccount({ email, password });
    if ("error" in result) return result.error;
    setUser(result.user);
    setSettings(await loadSettings(result.user.id));
    void postStatsEvent({
      type: "user_seen",
      userId: result.user.id,
      displayName: result.user.displayName,
    });
    return null;
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await registerAccount({ email, password, displayName });
      if ("error" in result) return result.error;
      setUser(result.user);
      setSettings(await loadSettings(result.user.id));
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
    void (async () => {
      const sessionId = await getOrCreatePresenceSessionId();
      void postStatsEvent({ type: "leave", sessionId });
      await saveSession(null);
    })();
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        if (user) void saveSettings(user.id, next);
        return next;
      });
    },
    [user]
  );

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) return "Not signed in.";
      if (displayName.trim().length < 2) {
        return "Display name must be at least 2 characters.";
      }
      const updated = await updateAccountProfile(user.id, { displayName });
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
