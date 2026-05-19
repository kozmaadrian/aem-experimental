/**
 * Pure path normalization helpers for DA content paths.
 *
 * No fetch, no DOM, no globals beyond `URL` / `decodeURIComponent`. Safe to
 * import from core/ layers.
 */

export function stripKnownContentExtensions(path) {
  return path
    .replace(/\.plain\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/\.md$/i, '')
    .replace(/\.json$/i, '');
}

export function sanitizeAndNormalizePath(documentPath, org = '', site = '') {
  const trimmedPath = documentPath?.trim() || '';
  if (!trimmedPath) return '';

  let normalizedPath = trimmedPath;

  // Accept full URLs from preview/live/editor and keep only the pathname.
  if (/^https?:\/\//i.test(normalizedPath)) {
    try {
      normalizedPath = new URL(normalizedPath).pathname;
    } catch {
      // Keep the original input if URL parsing fails.
    }
  }

  try {
    normalizedPath = decodeURIComponent(normalizedPath);
  } catch {
    // Keep the raw path when URI decoding fails.
  }
  normalizedPath = normalizedPath.replace(/\/+/g, '/');
  normalizedPath = normalizedPath.replace(/\/+$/, '');
  if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`;
  if (normalizedPath === '/') return '';

  const segments = normalizedPath.split('/').filter(Boolean);
  const orgLower = org.toLowerCase();
  const siteLower = site.toLowerCase();

  if (segments.length >= 2
    && segments[0].toLowerCase() === orgLower
    && segments[1].toLowerCase() === siteLower) {
    const strippedPath = `/${segments.slice(2).join('/')}`;
    return strippedPath === '/' ? '' : strippedPath;
  }

  if (segments.length >= 1 && segments[0].toLowerCase() === siteLower) {
    const strippedPath = `/${segments.slice(1).join('/')}`;
    return strippedPath === '/' ? '' : strippedPath;
  }

  return normalizedPath;
}

export function encodePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Canonical content path key for matching list/search paths to Helix log
 * `path` / `paths` values. Strips known file extensions.
 */
export function normalizeContentKey(documentPath, org, site) {
  const normalizedPath = sanitizeAndNormalizePath(documentPath, org, site);
  if (!normalizedPath) return '';
  const stripped = stripKnownContentExtensions(normalizedPath);
  if (!stripped || stripped === '/') return '';
  return stripped;
}

/**
 * Resolves the canonical version path (always with an extension).
 */
export function getVersionPath(documentPath, org, site) {
  const normalizedPath = sanitizeAndNormalizePath(documentPath, org, site);
  if (!normalizedPath) return '';
  const normalizedWithKnownHtml = normalizedPath.replace(/\.plain\.html$/i, '.html');
  if (/\.[^/]+$/i.test(normalizedWithKnownHtml)) {
    return normalizedWithKnownHtml;
  }
  const basePath = stripKnownContentExtensions(normalizedWithKnownHtml);
  if (!basePath || basePath === '/') return '';
  return `${basePath}.html`;
}

/**
 * Strips the leading slash for `/list/...` URLs.
 */
export function getListPath(documentPath, org, site) {
  const normalizedPath = sanitizeAndNormalizePath(documentPath, org, site);
  return normalizedPath.replace(/^\/+/, '');
}

/**
 * Ensures a documentPath has a leading slash. Simpler variant used when writing
 * content (no org/site stripping).
 */
export function normalizeDocumentPath(documentPath) {
  const trimmedPath = documentPath?.trim() || '';
  if (!trimmedPath) return '';
  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

/**
 * Lifts list/search/version responses to a plain array regardless of envelope.
 */
export function normalizeListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
