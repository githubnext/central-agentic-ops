const DATABASE_NAME = 'central-agentic-ops-dashboard';
const DATABASE_VERSION = 1;
const STORE_NAME = 'sources';

/**
 * @param {IDBRequest} request
 * @returns {Promise<unknown>}
 */
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * @param {IDBFactory | undefined} indexedDB
 * @returns {Promise<IDBDatabase | null>}
 */
async function openSourcesDatabase(indexedDB) {
  if (!indexedDB) return null;

  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME);
    }
  };
  request.onblocked = () => request.onerror?.(new Event('error'));
  return /** @type {Promise<IDBDatabase>} */ (requestResult(request));
}

/**
 * @param {IDBFactory | undefined} indexedDB
 * @param {string} key
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function readCachedSources(indexedDB, key) {
  const database = await openSourcesDatabase(indexedDB);
  if (!database) return null;

  try {
    const value = await requestResult(database.transaction(STORE_NAME).objectStore(STORE_NAME).get(key));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? /** @type {Record<string, unknown>} */ (value)
      : null;
  } finally {
    database.close();
  }
}

/**
 * @param {IDBFactory | undefined} indexedDB
 * @param {string} key
 * @param {Record<string, unknown>} sources
 * @returns {Promise<void>}
 */
export async function writeCachedSources(indexedDB, key, sources) {
  const database = await openSourcesDatabase(indexedDB);
  if (!database) return;

  try {
    await requestResult(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(sources, key));
  } finally {
    database.close();
  }
}
