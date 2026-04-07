import type { Value } from 'platejs';

import type { ArticleBrief, ArticleMeta } from '@/types/article';

const DB_NAME = 'rewolf-seo-history';
const STORE_NAME = 'snapshots';
const DB_VERSION = 1;

export type SnapshotKind = 'manual' | 'ai-insert' | 'ai-rewrite';

export type Snapshot = {
  id: string;
  slug: string;
  kind: SnapshotKind;
  content: Value;
  meta: ArticleMeta;
  brief: ArticleBrief;
  createdAt: string;
  label?: string;
};

function slugOrDraft(slug: string): string {
  const value = slug.trim();
  return value || '__draft__';
}

async function openDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('slugCreatedAt', ['slug', 'createdAt'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function pushSnapshot(snapshot: Omit<Snapshot, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
}): Promise<Snapshot> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const full: Snapshot = {
    ...snapshot,
    id: snapshot.id ?? crypto.randomUUID(),
    slug: slugOrDraft(snapshot.slug),
    createdAt: snapshot.createdAt ?? new Date().toISOString(),
  };
  store.put(full);
  await txDone(tx);
  return full;
}

export async function listSnapshots(slug: string): Promise<Snapshot[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  const all = await new Promise<Snapshot[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as Snapshot[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  const target = slugOrDraft(slug);
  return all
    .filter((item) => item.slug === target)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.get(id);
  const item = await new Promise<Snapshot | null>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as Snapshot | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  return item;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await txDone(tx);
}

export async function clearOld(slug: string, keep = 20): Promise<void> {
  const snapshots = await listSnapshots(slug);
  const toDelete = snapshots.slice(keep);
  await Promise.all(toDelete.map((item) => deleteSnapshot(item.id)));
}
