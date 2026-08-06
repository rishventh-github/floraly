import { STORAGE_KEYS } from "./constants";
import {
  DEFAULT_SETTINGS,
  type AuthUser,
  type StoredAccount,
  type UserSettings,
} from "./authTypes";

function hashPassword(password: string): string {
  // Lightweight demo hash only - replace with real auth for production.
  if (typeof btoa === "undefined") return `demo:${password}`;
  return `demo:${btoa(unescape(encodeURIComponent(password)))}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function loadAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.accounts);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
}

export function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authSession);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.authSession);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.authSession, JSON.stringify(user));
}

export function loadSettings(userId: string): UserSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const migKey = `${STORAGE_KEYS.settings}_mig_v2_${userId}`;
    const raw = localStorage.getItem(`${STORAGE_KEYS.settings}_${userId}`);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const migrated = localStorage.getItem(migKey);
    if (!migrated) {
      // Stickers default off: reset once so first feed visits stay distraction-free.
      const next: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        speciesStickersEnabled: false,
      };
      saveSettings(userId, next);
      localStorage.setItem(migKey, "1");
      return next;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(userId: string, settings: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${STORAGE_KEYS.settings}_${userId}`,
    JSON.stringify(settings)
  );
}

export function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): { user: AuthUser } | { error: string } {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (input.password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (displayName.length < 2) {
    return { error: "Display name must be at least 2 characters." };
  }

  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === email)) {
    return { error: "An account with this email already exists." };
  }

  const account: StoredAccount = {
    id: `acct_${Date.now().toString(36)}`,
    email,
    displayName,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString().split("T")[0],
  };
  saveAccounts([...accounts, account]);

  const user: AuthUser = {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
  saveSession(user);
  return { user };
}

export function loginAccount(input: {
  email: string;
  password: string;
}): { user: AuthUser } | { error: string } {
  const email = input.email.trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email === email);
  if (!account || !verifyPassword(input.password, account.passwordHash)) {
    return { error: "Incorrect email or password." };
  }
  const user: AuthUser = {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
  saveSession(user);
  return { user };
}

export function updateAccountProfile(
  userId: string,
  updates: { displayName?: string }
): AuthUser | null {
  const accounts = loadAccounts();
  const index = accounts.findIndex((a) => a.id === userId);
  if (index === -1) return null;
  if (updates.displayName) {
    accounts[index] = {
      ...accounts[index],
      displayName: updates.displayName.trim(),
    };
  }
  saveAccounts(accounts);
  const user: AuthUser = {
    id: accounts[index].id,
    email: accounts[index].email,
    displayName: accounts[index].displayName,
    createdAt: accounts[index].createdAt,
  };
  saveSession(user);
  return user;
}

export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
