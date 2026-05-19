/**
 * Client-side content search across `/list` + `/source`.
 *
 * Walks directories breadth-first up to `maxFiles`, then runs concurrent
 * workers matching the query against path/filename and (optionally) source text.
 *
 * Query syntax (see `search-query.js`):
 *   KEY              → path starts with KEY
 *   "KEY"            → path contains KEY (or body when full-text is on)
 *   KEY1 "KEY2"      → path starts with KEY1; body/path match for KEY2
 */

import {
  fetchJSON, fetchText, isAuthenticationError, authenticationErrorMessage,
} from './http.js';
import { ADMIN_DA_LIVE_URL, buildListUrl } from './endpoints.js';
import {
  sanitizeAndNormalizePath,
  getListPath,
  normalizeListResponse,
} from './paths.js';
import {
  parseSearchQuery,
  matchesPathScope,
  matchesPathQuery,
  matchesContentQuery,
  contentSearchNeedles,
  listSeedDirectories,
} from './search-query.js';

const SEARCHABLE_FILE_EXTENSIONS = new Set(['html', 'json', 'svg', 'md']);

function normalizeExt(item) {
  const ext = item?.ext || '';
  return ext.toLowerCase();
}

/**
 * Searches content by filename/path and (optionally) source contents.
 *
 * @returns {Promise<{ success: true, results: Array, scanned: number } | { success: false, error: string }>}
 */
export async function searchContentPaths(org, site, term, token, options = {}) {
  if (!org?.trim()) return { success: false, error: 'Organization is required' };
  if (!site?.trim()) return { success: false, error: 'Site is required' };
  if (!term?.trim()) return { success: false, error: 'Search term is required' };

  const query = parseSearchQuery(term);
  if (!query.prefix && query.patterns.length === 0) {
    return { success: false, error: 'Search term is required' };
  }

  const fullTextSearch = options.fullTextSearch !== false;
  const maxResults = Number.isFinite(options.maxResults) ? options.maxResults : 100;
  const maxFiles = Number.isFinite(options.maxFiles) ? options.maxFiles : 500;
  const concurrency = Number.isFinite(options.concurrency) ? options.concurrency : 8;
  const hiddenRoots = Array.isArray(options.hiddenRoots) ? options.hiddenRoots : [];
  const contentNeedles = contentSearchNeedles(query);
  const searchSourceText = fullTextSearch && contentNeedles.length > 0;

  const directories = listSeedDirectories(query, hiddenRoots);
  const visitedDirectories = new Set(directories);
  const searchableFiles = [];
  let authFailed = false;

  while (directories.length > 0 && searchableFiles.length < maxFiles) {
    const directory = directories.shift();
    const listUrl = buildListUrl(org, site, directory);

    let items;
    try {
      const itemsPayload = await fetchJSON(listUrl, token);
      items = normalizeListResponse(itemsPayload);
    } catch (error) {
      if (isAuthenticationError(error)) { authFailed = true; break; }
      // eslint-disable-next-line no-continue
      continue;
    }

    for (const item of items) {
      if (!item?.path) continue;

      if (!item.ext) {
        const relativeDirectory = getListPath(item.path, org, site);
        if (relativeDirectory && !visitedDirectories.has(relativeDirectory)) {
          visitedDirectories.add(relativeDirectory);
          directories.push(relativeDirectory);
        }
        continue;
      }

      const ext = normalizeExt(item);
      if (!SEARCHABLE_FILE_EXTENSIONS.has(ext)) continue;

      searchableFiles.push(item);
      if (searchableFiles.length >= maxFiles) break;
    }
  }

  if (authFailed) {
    return { success: false, error: authenticationErrorMessage() };
  }

  const dedupedPaths = new Set();
  const results = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < searchableFiles.length && results.length < maxResults) {
      const file = searchableFiles[cursor];
      cursor += 1;

      const filePath = file.path || '';
      const normalizedPath = sanitizeAndNormalizePath(filePath, org, site);
      if (!normalizedPath) continue;
      if (dedupedPaths.has(normalizedPath)) continue;

      const filename = filePath.split('/').pop() || '';
      if (!matchesPathScope(normalizedPath, query)) continue;

      let matched = false;
      if (searchSourceText) {
        try {
          const sourceText = await fetchText(`${ADMIN_DA_LIVE_URL}/source${filePath}`, token);
          matched = matchesContentQuery(sourceText, query);
        } catch {
          matched = false;
        }
      } else {
        matched = matchesPathQuery(normalizedPath, filename, query);
      }

      if (matched) {
        dedupedPaths.add(normalizedPath);
        results.push({
          path: normalizedPath,
          lastModified: file.lastModified || null,
        });
      }
    }
  };

  try {
    const workers = [];
    const workerCount = Math.max(1, Math.min(concurrency, searchableFiles.length || 1));
    for (let i = 0; i < workerCount; i += 1) {
      workers.push(worker());
    }
    await Promise.all(workers);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: authenticationErrorMessage() };
    }
    return { success: false, error: `Search failed: ${error.message}` };
  }

  results.sort((left, right) => (left.path > right.path ? 1 : -1));
  return {
    success: true,
    results,
    scanned: searchableFiles.length,
  };
}

export { parseSearchQuery } from './search-query.js';
