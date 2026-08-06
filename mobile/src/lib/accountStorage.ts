import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadAccounts } from "./auth";

export function accountKey(base: string, accountId: string): string {
  return `${base}_${accountId}`;
}

export async function claimLegacyStorage(
  legacyKey: string,
  accountId: string
): Promise<string | null> {
  try {
    const claimKey = `${legacyKey}__claimed_by`;
    const claimedBy = await AsyncStorage.getItem(claimKey);
    const legacy = await AsyncStorage.getItem(legacyKey);
    if (!legacy) return null;
    if (claimedBy && claimedBy !== accountId) return null;

    const accounts = await loadAccounts();
    if (accounts.length === 0) return null;
    const oldest = [...accounts].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )[0];
    if (!oldest || oldest.id !== accountId) return null;

    if (!claimedBy) await AsyncStorage.setItem(claimKey, accountId);
    const scoped = accountKey(legacyKey, accountId);
    if (!(await AsyncStorage.getItem(scoped))) {
      await AsyncStorage.setItem(scoped, legacy);
    }
    return AsyncStorage.getItem(scoped);
  } catch {
    return null;
  }
}

export async function readAccountJson<T>(
  baseKey: string,
  accountId: string,
  fallback: T,
  migrateLegacy = true
): Promise<T> {
  try {
    const scoped = accountKey(baseKey, accountId);
    let raw = await AsyncStorage.getItem(scoped);
    if (!raw && migrateLegacy) {
      raw = await claimLegacyStorage(baseKey, accountId);
    }
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeAccountJson(
  baseKey: string,
  accountId: string,
  value: unknown
): Promise<void> {
  await AsyncStorage.setItem(
    accountKey(baseKey, accountId),
    JSON.stringify(value)
  );
}
