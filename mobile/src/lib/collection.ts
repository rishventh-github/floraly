import { STORAGE_KEYS } from "./constants";
import { readAccountJson, writeAccountJson } from "./accountStorage";
import { collectionPoints, getSpeciesById } from "./speciesCatalog";

export async function loadCollectedSpeciesIds(
  accountId: string
): Promise<string[]> {
  try {
    const parsed = await readAccountJson<string[]>(
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

export async function saveCollectedSpeciesIds(
  accountId: string,
  ids: string[]
): Promise<void> {
  await writeAccountJson(STORAGE_KEYS.speciesCollection, accountId, ids);
}

export async function addSpeciesToCollection(
  accountId: string,
  speciesId: string
): Promise<{ ids: string[]; added: boolean; points: number }> {
  const ids = await loadCollectedSpeciesIds(accountId);
  if (ids.includes(speciesId) || !getSpeciesById(speciesId)) {
    return { ids, added: false, points: collectionPoints(ids) };
  }
  const next = [...ids, speciesId];
  await saveCollectedSpeciesIds(accountId, next);
  return { ids: next, added: true, points: collectionPoints(next) };
}

export async function getCollectionPoints(accountId: string): Promise<number> {
  return collectionPoints(await loadCollectedSpeciesIds(accountId));
}
