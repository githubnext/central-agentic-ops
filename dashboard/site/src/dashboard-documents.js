/**
 * @template {object} T
 * @param {T} primary
 * @param {T[]} additions
 * @returns {T}
 */
export function composeDashboardDocuments(primary, ...additions) {
  const primaryDocument = /** @type {{ dashboard: { pages: unknown[], navigation?: unknown[] } }} */ (
    /** @type {unknown} */ (primary)
  );
  const additionalDocuments = /** @type {Array<{ dashboard: { pages: unknown[], navigation?: unknown[] } }>} */ (
    /** @type {unknown} */ (additions)
  );
  return /** @type {T} */ (/** @type {unknown} */ ({
    ...primary,
    dashboard: {
      ...primaryDocument.dashboard,
      pages: [
        ...primaryDocument.dashboard.pages,
        ...additionalDocuments.flatMap((document) => document.dashboard.pages)
      ],
      navigation: [
        ...(primaryDocument.dashboard.navigation ?? []),
        ...additionalDocuments.flatMap((document) => document.dashboard.navigation ?? [])
      ]
    }
  }));
}
