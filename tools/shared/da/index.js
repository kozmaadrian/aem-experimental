/**
 * Public surface of the shared DA package.
 *
 * Tools import from this module rather than reaching into individual files.
 * `core/` layers can safely import pure helpers (paths, log-filter) directly;
 * I/O lives behind `createDaClient`.
 */

export { createDaClient } from './client.js';

export { authenticationErrorMessage } from './http.js';

export {
  sanitizeAndNormalizePath,
  stripKnownContentExtensions,
  encodePath,
  normalizeContentKey,
  getVersionPath,
  getListPath,
  normalizeDocumentPath,
  normalizeListResponse,
} from './paths.js';

export {
  isLogPreviewRoute,
  isLogLiveRoute,
  buildLogPathIndex,
  resultMatchesLogFilter,
} from './log-filter.js';

// Direct re-exports for tools that need the raw functions (legacy/back-compat).
export { searchContentPaths, parseSearchQuery } from './search.js';
export {
  matchesPathScope,
  matchesPathQuery,
  matchesContentQuery,
  contentSearchNeedles,
  listSeedDirectories,
} from './search-query.js';
export {
  fetchVersionTimeline,
  fetchLatestDocumentSource,
  fetchVersionSourceByUrl,
} from './versions.js';
export { fetchAdminLog } from './log.js';
