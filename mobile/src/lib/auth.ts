import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";
import {
  DEFAULT_SETTINGS,
  type AuthUser,
  type StoredAccount,
  type UserSettings,
} from "./authTypes";

function hashPassword(password: string): string {
  // Demo-only obfuscation (same approach as web).
  try {
    return `demo:${btoa(unescape(encodeURIComponent(password)))}`;
  } catch {
    return `demo:${password}`;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function loadAccounts(): Promise<StoredAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.accounts);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: StoredAccount[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
}

export async function loadSession(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.authSession);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveSession(user: AuthUser | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(STORAGE_KEYS.authSession);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.authSession, JSON.stringify(user));
}

export async function loadSettings(userId: string): Promise<UserSettings> {
  try {
    const migKey = `${STORAGE_KEYS.settings}_mig_v2_${userId}`;
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.settings}_${userId}`);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const migrated = await AsyncStorage.getItem(migKey);
    if (!migrated) {
      // Stickers default off: reset once so first feed visits stay distraction-free.
      const next: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        speciesStickersEnabled: false,
      };
      await saveSettings(userId, next);
      await AsyncStorage.setItem(migKey, "1");
      return next;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  userId: string,
  settings: UserSettings
): Promise<void> {
  await AsyncStorage.setItem(
    `${STORAGE_KEYS.settings}_${userId}`,
    JSON.stringify(settings)
  );
}

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: AuthUser } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }
  if (displayName.length < 2) {
    return { error: "Display name must be at least 2 characters." };
  }
  if (input.password.length < 4) {
    return { error: "Password must be at least 4 characters." };
  }
  const accounts = await loadAccounts();
  if (accounts.some((a) => a.email === email)) {
    return { error: "An account with that email already exists." };
  }
  const user: AuthUser = {
    id: `acct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    email,
    displayName,
    createdAt: new Date().toISOString().split("T")[0],
  };
  const stored: StoredAccount = {
    ...user,
    passwordHash: hashPassword(input.password),
  };
  await saveAccounts([...accounts, stored]);
  await saveSession(user);
  await saveSettings(user.id, { ...DEFAULT_SETTINGS });
  return { user };
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const accounts = await loadAccounts();
  const found = accounts.find((a) => a.email === email);
  if (!found || !verifyPassword(input.password, found.passwordHash)) {
    return { error: "Incorrect email or password." };
  }
  const user: AuthUser = {
    id: found.id,
    email: found.email,
    displayName: found.displayName,
    createdAt: found.createdAt,
  };
  await saveSession(user);
  return { user };
}

export async function updateAccountProfile(
  userId: string,
  updates: { displayName: string }
): Promise<AuthUser | null> {
  const accounts = await loadAccounts();
  const idx = accounts.findIndex((a) => a.id === userId);
  if (idx === -1) return null;
  const displayName = updates.displayName.trim();
  accounts[idx] = { ...accounts[idx], displayName };
  await saveAccounts(accounts);
  const user: AuthUser = {
    id: accounts[idx].id,
    email: accounts[idx].email,
    displayName,
    createdAt: accounts[idx].createdAt,
  };
  await saveSession(user);
  return user;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
