const DB_NAME = 'openmusic-local-visual-media';
const STORE_NAME = 'background-media';
const RECORD_KEY = 'active';

export const LOCAL_BACKGROUND_MEDIA_REF = 'local-background-media:v1';

export interface LocalBackgroundMediaRecord {
  blob: Blob;
  name: string;
  type: string;
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开本机媒体库'));
  });
}

async function runStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    action(store, resolve, reject);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error || new Error('本机媒体库写入失败'));
    transaction.onabort = () => reject(transaction.error || new Error('本机媒体库操作已取消'));
  });
}

export async function saveLocalBackgroundMedia(file: File): Promise<void> {
  const record: LocalBackgroundMediaRecord = {
    blob: file,
    name: file.name,
    type: file.type,
    updatedAt: Date.now(),
  };
  await runStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(record, RECORD_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function readLocalBackgroundMedia(): Promise<LocalBackgroundMediaRecord | null> {
  return runStore<LocalBackgroundMediaRecord | null>('readonly', (store, resolve, reject) => {
    const request = store.get(RECORD_KEY);
    request.onsuccess = () => resolve((request.result as LocalBackgroundMediaRecord | undefined) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearLocalBackgroundMedia(): Promise<void> {
  await runStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(RECORD_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
