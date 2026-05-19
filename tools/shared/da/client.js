/**
 * DA client factory. Returns an `io` object that captures the auth token in a
 * closure so callers don't have to thread it through every call.
 *
 * This is the public surface for the `app/` layer of every tool. Core layers
 * receive this object as injected I/O and never see the token.
 */

import { fetchJSON, fetchText } from './http.js';
import {
  buildListUrl,
  buildSourceReadUrl,
  buildSourceWriteUrl,
} from './endpoints.js';
import {
  sanitizeAndNormalizePath,
  normalizeDocumentPath,
  normalizeListResponse,
} from './paths.js';
import { searchContentPaths } from './search.js';
import {
  fetchVersionTimeline,
  fetchLatestDocumentSource,
  fetchVersionSourceByUrl,
} from './versions.js';
import { fetchAdminLog } from './log.js';

function parentDir(path) {
  const trimmed = (path || '').replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return '/';
  return trimmed.slice(0, idx);
}

function basename(path) {
  const trimmed = (path || '').replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

export function createDaClient({ token }) {
  if (!token) throw new Error('createDaClient: token is required');

  // Cache parent-directory listings for the lifetime of the client so
  // existence checks for sibling items don't repeat the same /list call.
  const listingCache = new Map();

  async function listDirectory(org, site, dirPath = '') {
    const url = buildListUrl(org, site, dirPath);
    const payload = await fetchJSON(url, token);
    return normalizeListResponse(payload);
  }

  function cachedParentListing(org, site, parent) {
    const key = `${org}/${site}${parent}`;
    if (!listingCache.has(key)) {
      const stripped = parent.replace(/^\/+/, '');
      listingCache.set(key, listDirectory(org, site, stripped).catch((err) => {
        listingCache.delete(key);
        throw err;
      }));
    }
    return listingCache.get(key);
  }

  return {
    listDirectory,

    async readSource(org, site, path) {
      const normalizedPath = sanitizeAndNormalizePath(path, org, site);
      const url = buildSourceReadUrl(org, site, normalizedPath);
      const body = await fetchText(url, token);
      return { body, contentType: 'text/html' };
    },

    async writeSource(org, site, path, body, contentType = 'text/html') {
      const normalized = normalizeDocumentPath(path);
      const url = buildSourceWriteUrl(org, site, normalized);

      const formData = new FormData();
      const blob = new Blob([body], { type: contentType });
      formData.append('data', blob, basename(normalized) || 'content.html');

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Write failed: ${response.status} ${response.statusText}`);
      }

      // Invalidate the parent directory's cached listing so a subsequent
      // existence check picks up this freshly-written file.
      listingCache.delete(`${org}/${site}${parentDir(normalized)}`);
    },

    async targetExists(org, site, path) {
      const normalized = sanitizeAndNormalizePath(path, org, site);
      if (!normalized) return false;
      const parent = parentDir(normalized);
      const target = basename(normalized);

      try {
        const items = await cachedParentListing(org, site, parent);
        return items.some((item) => {
          const itemPath = sanitizeAndNormalizePath(item?.path || '', org, site);
          return basename(itemPath) === target;
        });
      } catch {
        // Treat lookup failure as "unknown" → no — caller can retry write.
        return false;
      }
    },

    /**
     * Drops any cached directory listings. Call this before re-checking
     * existence (e.g. at the start of a copy run) so previously cached
     * snapshots don't mask files that were written meanwhile.
     */
    clearListingCache: () => { listingCache.clear(); },

    searchPaths: (org, site, term, options) => searchContentPaths(org, site, term, token, options),

    fetchVersionTimeline: (org, site, path) => fetchVersionTimeline(org, site, path, token),
    fetchLatestSource: (org, site, path) => fetchLatestDocumentSource(org, site, path, token),
    fetchVersionSourceByUrl: (versionUrl) => fetchVersionSourceByUrl(versionUrl, token),

    fetchAdminLog: (org, site, options) => fetchAdminLog(org, site, token, options),
  };
}
