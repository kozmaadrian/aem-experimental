/**
 * Base URLs and URL builders for DA admin APIs.
 *
 * Read operations target `admin.da.live`; write operations target
 * `admin.da.page`. Helix admin log lives under `admin.hlx.page`. These hit the
 * same backend but the host names are conventional per operation.
 */

import { encodePath } from './paths.js';

export const ADMIN_HLX_BASE_URL = 'https://admin.hlx.page';
export const ADMIN_DA_LIVE_URL = 'https://admin.da.live';
export const ADMIN_DA_PAGE_URL = 'https://admin.da.page';
export const PREVIEW_BASE_URL = 'https://da.live';
export const DEFAULT_LOG_REF = 'main';

function encodeOrgSite(org, site) {
  return `${encodeURIComponent(org)}/${encodeURIComponent(site)}`;
}

export function buildListUrl(org, site, dirPath = '') {
  const suffix = dirPath ? `/${encodePath(dirPath)}` : '';
  return `${ADMIN_DA_LIVE_URL}/list/${encodeOrgSite(org, site)}${suffix}`;
}

export function buildSourceReadUrl(org, site, path) {
  return `${ADMIN_DA_LIVE_URL}/source/${encodeOrgSite(org, site)}${encodePath(path)}`;
}

export function buildSourceWriteUrl(org, site, path) {
  return `${ADMIN_DA_PAGE_URL}/source/${encodeOrgSite(org, site)}${path}`;
}

export function buildVersionListUrl(org, site, versionPath) {
  return `${ADMIN_DA_LIVE_URL}/versionlist/${encodeOrgSite(org, site)}${encodePath(versionPath)}`;
}

export function buildVersionSourceUrl(versionUrl) {
  const raw = typeof versionUrl === 'string' ? versionUrl.trim() : '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${ADMIN_DA_LIVE_URL}${raw}`;
  return `${ADMIN_DA_LIVE_URL}/${raw}`;
}

export function buildLogUrl(org, site, ref, { from, to }) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `${ADMIN_HLX_BASE_URL}/log/${encodeURIComponent(org)}/${encodeURIComponent(site)}/${encodeURIComponent(ref)}?${params}`;
}
