import { STORAGE_KEYS } from "./constants";

/** Device-level appearance. Defaults to dark when unset. */
export function loadDarkModePreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.theme);
    if (raw === "light") return false;
    if (raw === "dark") return true;
    return true;
  } catch {
    return true;
  }
}

export function saveDarkModePreference(darkMode: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.theme, darkMode ? "dark" : "light");
}

export function applyDocumentTheme(darkMode: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", darkMode);
  document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
}
