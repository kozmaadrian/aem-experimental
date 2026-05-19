/**
 * Helix admin log fetch.
 * @see https://www.aem.live/docs/admin.html#tag/log
 */

import { fetchJSON } from './http.js';
import { buildLogUrl, DEFAULT_LOG_REF } from './endpoints.js';

/**
 * Fetches Helix admin log entries for a time range (`from` / `to`, ISO-8601).
 */
export async function fetchAdminLog(org, site, token, options = {}) {
  if (!org?.trim()) return { success: false, error: 'Organization is required' };
  if (!site?.trim()) return { success: false, error: 'Site is required' };

  const from = typeof options.from === 'string' ? options.from.trim() : '';
  const to = typeof options.to === 'string' ? options.to.trim() : '';
  if (!from || !to) {
    return { success: false, error: 'Log request requires both from and to.' };
  }

  const ref = typeof options.ref === 'string' && options.ref.trim()
    ? options.ref.trim()
    : DEFAULT_LOG_REF;

  try {
    const logUrl = buildLogUrl(org, site, ref, { from, to });
    const payload = await fetchJSON(logUrl, token);
    let entries = [];
    if (Array.isArray(payload?.entries)) entries = payload.entries;
    else if (Array.isArray(payload)) entries = payload;
    return {
      success: true,
      entries,
      from: payload?.from,
      to: payload?.to,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Log request failed.',
    };
  }
}
