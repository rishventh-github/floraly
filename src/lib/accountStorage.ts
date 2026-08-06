import { loadAccounts } from "./auth";

/** Build a per-account localStorage key. */
export function accountKey(base: string, accountId: string): string {
  return `${base}_${accountId}`;
}

/**
 * Claim legacy (pre-account) data only for the oldest account on this device,
 * so the first user keeps their history and newer accounts start blank.
 */
export function claimLegacyStorage(
  legacyKey: string,
  accountId: string
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const claimKey = `${legacyKey}__claimed_by`;
    const claimedBy = localStorage.getItem(claimKey);
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) return null;

    if (claimedBy && claimedBy !== accountId) {
      return null;
    }

    const accounts = loadAccounts();
    if (accounts.length === 0) return null;
    const oldest = [...accounts].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )[0];
    if (!oldest || oldest.id !== accountId) {
      return null;
    }

    if (!claimedBy) {
      localStorage.setItem(claimKey, accountId);
    }

    const scoped = accountKey(legacyKey, accountId);
    if (!localStorage.getItem(scoped)) {
      localStorage.setItem(scoped, legacy);
    }
    return localStorage.getItem(scoped);
  } catch {
    return null;
  }
}

export function readAccountJson<T>(
  baseKey: string,
  accountId: string,
  fallback: T,
  migrateLegacy = true
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const scoped = accountKey(baseKey, accountId);
    let raw = localStorage.getItem(scoped);
    if (!raw && migrateLegacy) {
      raw = claimLegacyStorage(baseKey, accountId);
    }
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeAccountJson(
  baseKey: string,
  accountId: string,
  value: unknown
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(accountKey(baseKey, accountId), JSON.stringify(value));
}
