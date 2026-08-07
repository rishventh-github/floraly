/**
 * IndexedDB blob store for user-uploaded videos (localStorage can't hold them).
 * URLs are persisted as `idb:<key>` and resolved to object URLs at playback time.
 */

const DB_NAME = "floraly-media";
const STORE = "blobs";
const DB_VERSION = 1;

const objectUrlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export function isIdbMediaRef(url: string): boolean {
  return url.startsWith("idb:");
}

export function mediaRefKey(url: string): string {
  return url.slice(4);
}

export async function putMediaBlob(key: string, blob: Blob): Promise<string> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Media write failed"));
    tx.objectStore(STORE).put(blob, key);
  });
  db.close();
  const ref = `idb:${key}`;
  const existing = objectUrlCache.get(ref);
  if (existing) URL.revokeObjectURL(existing);
  objectUrlCache.set(ref, URL.createObjectURL(blob));
  return ref;
}

export async function resolveMediaUrl(url: string): Promise<string> {
  if (!isIdbMediaRef(url)) return url;
  const cached = objectUrlCache.get(url);
  if (cached) return cached;

  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error ?? new Error("Media read failed"));
    const req = tx.objectStore(STORE).get(mediaRefKey(url));
    req.onsuccess = () => resolve(req.result as Blob | undefined);
  });
  db.close();

  if (!blob) {
    throw new Error("Video media is missing from local storage.");
  }
  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(url, objectUrl);
  return objectUrl;
}

export async function deleteMediaBlob(urlOrKey: string): Promise<void> {
  const key = isIdbMediaRef(urlOrKey) ? mediaRefKey(urlOrKey) : urlOrKey;
  const ref = `idb:${key}`;
  const cached = objectUrlCache.get(ref);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(ref);
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Media delete failed"));
    tx.objectStore(STORE).delete(key);
  });
  db.close();
}
