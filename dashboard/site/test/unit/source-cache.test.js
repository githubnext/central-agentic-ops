import { describe, expect, it, vi } from 'vitest';
import { readCachedSources, writeCachedSources } from '../../src/source-cache.js';

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
  const indexedDB = {
    open: vi.fn(() => requestFor(() => database))
  };
  return { indexedDB, database, objectStore, close, value: () => value };
}

function requestFor(readValue) {
  const request = {
    error: null,
    result: undefined,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    onblocked: null
  };
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
