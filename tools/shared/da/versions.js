/**
 * Version list / version source operations on DA admin.
 */

import { fetchJSON, fetchText } from './http.js';
import {
  buildVersionListUrl,
  buildVersionSourceUrl,
  buildSourceReadUrl,
} from './endpoints.js';
import { getVersionPath } from './paths.js';

/**
 * Fetches version history for a specific content path.
 */
export async function fetchVersionTimeline(org, site, documentPath, token) {
  const versionPath = getVersionPath(documentPath, org, site);

  if (!org?.trim()) return { success: false, error: 'Organization is required' };
  if (!site?.trim()) return { success: false, error: 'Site is required' };
  if (!versionPath) return { success: false, error: 'Path is required' };

  try {
    const versionUrl = buildVersionListUrl(org, site, versionPath);
    const versionsPayload = await fetchJSON(versionUrl, token);
    const versions = Array.isArray(versionsPayload)
      ? versionsPayload
      : versionsPayload?.data || versionsPayload?.versions || versionsPayload?.items || [];
    return { success: true, versions: Array.isArray(versions) ? versions : [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches latest source content for a path.
 */
export async function fetchLatestDocumentSource(org, site, documentPath, token) {
  const versionPath = getVersionPath(documentPath, org, site);
  if (!org?.trim()) return { success: false, error: 'Organization is required' };
  if (!site?.trim()) return { success: false, error: 'Site is required' };
  if (!versionPath) return { success: false, error: 'Path is required' };

  try {
    const sourceUrl = buildSourceReadUrl(org, site, versionPath);
    const source = await fetchText(sourceUrl, token);
    return { success: true, source };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load latest source.',
    };
  }
}

/**
 * Fetches content for a specific version URL from versionlist entries.
 */
export async function fetchVersionSourceByUrl(versionUrl, token) {
  const resolvedUrl = buildVersionSourceUrl(versionUrl);
  if (!resolvedUrl) return { success: false, error: 'Version source URL is required' };

  try {
    const source = await fetchText(resolvedUrl, token);
    return { success: true, source };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load version source.',
    };
  }
}
