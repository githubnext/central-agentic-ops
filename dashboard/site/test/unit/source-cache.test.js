import { describe, expect, it, vi } from 'vitest';
import { readCachedSources, writeCachedSources } from '../../src/source-cache.js';

/** @param {unknown} initialValue */
function indexedDbWithValue(initialValue) {
  let value = initialValue;
  const close = vi.fn();
  const createObjectStore = vi.fn();
  const objectStore = {
    get: vi.fn(() => requestFor(() => value)),
    put: vi.fn((nextValue) => requestFor(() => {
      value = nextValue;
      return undefined;
    }))
  };
  const database = {
    close,
    createObjectStore,
    objectStoreNames: { contains: () => true },
    transaction: vi.fn(() => ({ objectStore: () => objectStore }))
  };
  const indexedDB = /** @type {IDBFactory} */ (/** @type {unknown} */ ({
    open: vi.fn(() => requestFor(() => database))
  }));
  return { indexedDB, database, objectStore, close, value: () => value };
}

function blockedIndexedDb() {
  return /** @type {IDBFactory} */ (/** @type {unknown} */ ({
    open: () => {
      const request = /** @type {any} */ ({
        error: null,
        result: undefined,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null
      });
      queueMicrotask(() => request.onblocked?.());
      return request;
    }
  }));
}

/** @param {() => unknown} readValue */
function requestFor(readValue) {
  const request = /** @type {any} */ ({
    error: null,
    result: undefined,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    onblocked: null
  });
  queueMicrotask(() => {
    request.result = readValue();
    request.onsuccess?.();
  });
  return request;
}

describe('dashboard source cache', () => {
  it('returns null when IndexedDB is unavailable', async () => {
    await expect(readCachedSources(undefined, '/cao/sources.json')).resolves.toBeNull();
    await expect(writeCachedSources(undefined, '/cao/sources.json', {})).resolves.toBeUndefined();
  });

  it('rejects instead of stalling when opening the cache is blocked', async () => {
    await expect(readCachedSources(blockedIndexedDb(), '/cao/sources.json')).rejects.toThrow(
      'Opening the dashboard source cache was blocked'
    );
  });

  it('reads and closes a cached source document', async () => {
    const sources = { runs: { rows: [] } };
    const fake = indexedDbWithValue(sources);

    await expect(readCachedSources(fake.indexedDB, '/cao/sources.json')).resolves.toBe(sources);
    expect(fake.objectStore.get).toHaveBeenCalledWith('/cao/sources.json');
    expect(fake.close).toHaveBeenCalledOnce();
  });

  it('writes and closes a live source document', async () => {
    const fake = indexedDbWithValue(null);
    const sources = { workflows: { rows: [] } };

    await writeCachedSources(fake.indexedDB, '/cao/sources.json', sources);

    expect(fake.objectStore.put).toHaveBeenCalledWith(sources, '/cao/sources.json');
    expect(fake.value()).toBe(sources);
    expect(fake.close).toHaveBeenCalledOnce();
  });
});
