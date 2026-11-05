// ============================================================
// EDUMO — Local-First IndexedDB Storage Layer
// Directive Section 2: Local-First Database Architecture
// Provides fast, durable local persistence for tenant records,
// offline queues, and pre-aggregated summaries.
// ============================================================

const DB_NAME = 'edumo_local_db';
const DB_VERSION = 1;

export interface OfflineQueueItem {
  id: string;
  orgId: string;
  schoolId: string;
  entityType: 'attendance' | 'marks' | 'pledge' | 'voucher' | 'invoice' | 'resource' | 'setting';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store for local tenant records & summaries
      if (!db.objectStoreNames.contains('tenant_cache')) {
        const store = db.createObjectStore('tenant_cache', { keyPath: 'key' });
        store.createIndex('tenantIdx', ['orgId', 'schoolId', 'entityType'], { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // 2. Store for offline mutations queue
      if (!db.objectStoreNames.contains('offline_queue')) {
        const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
        queueStore.createIndex('statusIdx', 'status', { unique: false });
        queueStore.createIndex('tenantIdx', ['orgId', 'schoolId'], { unique: false });
      }

      // 3. Technical usage & cost metrics store
      if (!db.objectStoreNames.contains('efficiency_metrics')) {
        db.createObjectStore('efficiency_metrics', { keyPath: 'date' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Cache an item locally with tenant isolation and TTL
 */
export async function cacheLocalItem<T>(
  orgId: string,
  schoolId: string,
  entityType: string,
  id: string,
  data: T,
  ttlMs: number = 30 * 60 * 1000 // default 30 min
): Promise<void> {
  try {
    const db = await getDB();
    const key = `${orgId}:${schoolId}:${entityType}:${id}`;
    const tx = db.transaction('tenant_cache', 'readwrite');
    const store = tx.objectStore('tenant_cache');

    store.put({
      key,
      orgId,
      schoolId,
      entityType,
      id,
      data,
      savedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  } catch (err) {
    console.warn('[LocalCache] Failed to write cache:', err);
  }
}

/**
 * Read cached item locally if valid and not expired
 */
export async function getLocalItem<T>(
  orgId: string,
  schoolId: string,
  entityType: string,
  id: string
): Promise<T | null> {
  try {
    const db = await getDB();
    const key = `${orgId}:${schoolId}:${entityType}:${id}`;
    const tx = db.transaction('tenant_cache', 'readonly');
    const store = tx.objectStore('tenant_cache');

    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) {
          resolve(null);
          return;
        }
        if (record.expiresAt && Date.now() > record.expiresAt) {
          // Expired
          resolve(null);
        } else {
          resolve(record.data as T);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear local cache for a specific tenant (used on school switch / logout)
 */
export async function clearTenantCache(orgId: string, schoolId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('tenant_cache', 'readwrite');
    const store = tx.objectStore('tenant_cache');
    const index = store.index('tenantIdx');

    const range = IDBKeyRange.bound([orgId, schoolId, ''], [orgId, schoolId, '\uffff']);
    const cursorReq = index.openCursor(range);

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('[LocalCache] Failed to clear tenant cache:', err);
  }
}

/**
 * Enqueue an offline mutation
 */
export async function enqueueOfflineAction(action: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<OfflineQueueItem> {
  const db = await getDB();
  const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: OfflineQueueItem = {
    ...action,
    id,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  const tx = db.transaction('offline_queue', 'readwrite');
  tx.objectStore('offline_queue').put(item);
  return item;
}

/**
 * Get all pending offline actions
 */
export async function getPendingOfflineActions(): Promise<OfflineQueueItem[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('offline_queue', 'readonly');
    const index = tx.objectStore('offline_queue').index('statusIdx');
    return new Promise((resolve) => {
      const req = index.getAll('pending');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Update offline queue item status
 */
export async function updateOfflineActionStatus(
  id: string,
  status: OfflineQueueItem['status'],
  error?: string
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('offline_queue', 'readwrite');
    const store = tx.objectStore('offline_queue');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as OfflineQueueItem | undefined;
      if (item) {
        item.status = status;
        if (status === 'failed') {
          item.retryCount += 1;
          item.lastError = error;
        }
        store.put(item);
      }
    };
  } catch (err) {
    console.warn('[OfflineQueue] Failed to update action status:', err);
  }
}

/**
 * Delete synced action from queue
 */
export async function removeOfflineAction(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('offline_queue', 'readwrite');
    tx.objectStore('offline_queue').delete(id);
  } catch (err) {
    console.warn('[OfflineQueue] Failed to delete action:', err);
  }
}

