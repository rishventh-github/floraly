import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { STORAGE_KEYS } from "../lib/constants";
import {
  darkColors,
  lightColors,
  type AppColors,
} from "../theme/colors";

interface ThemeContextValue {
  darkMode: boolean;
  colors: AppColors;
  setDarkMode: (darkMode: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function loadGuestDarkMode(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.theme);
    if (raw === "light") return false;
    return true;
  } catch {
    return true;
  }
}

async function saveGuestDarkMode(darkMode: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.theme, darkMode ? "dark" : "light");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, settings, updateSettings, ready } = useAuth();
  const [darkMode, setDarkModeState] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const next = user ? settings.darkMode : await loadGuestDarkMode();
      if (cancelled) return;
      setDarkModeState(next);
      await saveGuestDarkMode(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, settings.darkMode]);

  const setDarkMode = useCallback(
    (next: boolean) => {
      setDarkModeState(next);
      void saveGuestDarkMode(next);
      if (user) updateSettings({ darkMode: next });
    },
    [user, updateSettings]
  );

  const palette = darkMode ? darkColors : lightColors;

  const value = useMemo(
    () => ({ darkMode, colors: palette, setDarkMode }),
    [darkMode, palette, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
