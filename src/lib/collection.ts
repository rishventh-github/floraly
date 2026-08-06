import { STORAGE_KEYS } from "./constants";
import { readAccountJson, writeAccountJson } from "./accountStorage";
import { collectionPoints, getSpeciesById } from "./speciesCatalog";

export function loadCollectedSpeciesIds(accountId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = readAccountJson<string[]>(
      STORAGE_KEYS.speciesCollection,
      accountId,
      [],
      true
    );
    return Array.isArray(parsed)
      ? parsed.filter((id) => !!getSpeciesById(id))
      : [];
  } catch {
    return [];
  }
}

export function saveCollectedSpeciesIds(
  accountId: string,
  ids: string[]
): void {
  if (typeof window === "undefined") return;
  writeAccountJson(STORAGE_KEYS.speciesCollection, accountId, ids);
}

export function addSpeciesToCollection(
  accountId: string,
  speciesId: string
): {
  ids: string[];
  added: boolean;
  points: number;
} {
  const ids = loadCollectedSpeciesIds(accountId);
  if (ids.includes(speciesId) || !getSpeciesById(speciesId)) {
    return { ids, added: false, points: collectionPoints(ids) };
  }
  const next = [...ids, speciesId];
  saveCollectedSpeciesIds(accountId, next);
  return { ids: next, added: true, points: collectionPoints(next) };
}

export function getCollectionPoints(accountId: string): number {
  return collectionPoints(loadCollectedSpeciesIds(accountId));
}
