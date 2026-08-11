"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  applyDocumentTheme,
  loadDarkModePreference,
  saveDarkModePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, settings, updateSettings, ready } = useAuth();
  const [darkMode, setDarkModeState] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const next = user ? settings.darkMode : loadDarkModePreference();
    setDarkModeState(next);
    applyDocumentTheme(next);
    saveDarkModePreference(next);
  }, [ready, user, settings.darkMode]);

  const setDarkMode = useCallback(
    (next: boolean) => {
      setDarkModeState(next);
      applyDocumentTheme(next);
      saveDarkModePreference(next);
      if (user) updateSettings({ darkMode: next });
    },
    [user, updateSettings]
  );

  const value = useMemo(
    () => ({ darkMode, setDarkMode }),
    [darkMode, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
