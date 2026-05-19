/**
 * Parse and evaluate content-transfer / audit search query syntax.
 *
 *   KEY              path starts with KEY
 *   "KEY"            path contains KEY (full-text searches body for KEY)
 *   KEY1 "KEY2"      path starts with KEY1; full-text searches for KEY2 under KEY1
 *
 * Multiple quoted segments are ANDed. Whitespace in the prefix is preserved (e.g.
 * `path/to/search "keyword"`).
 */

/** Matches a double-quoted phrase (no embedded quotes). */
const QUOTED_PATTERN_RE = /"([^"]+)"/g;

/**
 * Short documentation sections for the search help popover (content-transfer + audit).
 *
 * @typedef {{ title: string, body: string, form?: string }} SearchQueryHelpSection
 */

/** @type {SearchQueryHelpSection[]} */
export const SEARCH_QUERY_HELP_SECTIONS = [
  {
    title: 'Path prefix',
    body: 'Limit results to a folder and everything beneath it. Enter a site path with or without a leading slash.',
    form: '/path/to/search',
  },
  {
    title: 'Quoted phrase',
    body: 'Match paths whose name contains the phrase. Wrap the text in double quotes.',
    form: '"keyword"',
  },
  {
    title: 'Prefix and phrase',
    body: 'Combine both to filter by folder and by name in the path. Multiple quoted phrases are all required (AND).',
    form: '/path/to/search "keyword"',
  },
  {
    title: 'Full text',
    body: 'Enable Full text to search inside page content. Quoted phrases match the document body. Add a path prefix to search only under that folder; with no prefix, the whole site is searched.',
  },
];

/**
 * @typedef {{ prefix: string | null, patterns: string[], raw: string }} SearchQuery
 */

/**
 * @param {string} raw
 * @returns {SearchQuery}
 */
export function parseSearchQuery(raw) {
  const term = (raw ?? '').trim();
  if (!term) {
    return { prefix: null, patterns: [], raw: '' };
  }

  const patterns = [];
  QUOTED_PATTERN_RE.lastIndex = 0;
  let match = QUOTED_PATTERN_RE.exec(term);
  while (match) {
    const piece = match[1].trim();
    if (piece) patterns.push(piece);
    match = QUOTED_PATTERN_RE.exec(term);
  }

  const prefixPart = term.replace(QUOTED_PATTERN_RE, ' ').trim().replace(/\s+/g, ' ');
  return {
    prefix: prefixPart || null,
    patterns,
    raw: term,
  };
}

/**
 * @param {string} prefix
 * @returns {string} Lowercase path prefix with leading slash, no trailing slash.
 */
export function normalizeSearchPrefix(prefix) {
  const trimmed = (prefix ?? '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return '';
  return `/${trimmed.toLowerCase()}`;
}

/**
 * @param {string} normalizedPath Path like `/drafts/foo.html`
 * @param {string} prefix Raw prefix from the query (e.g. `drafts` or `/drafts/blog`)
 */
export function pathStartsWithPrefix(normalizedPath, prefix) {
  const needle = normalizeSearchPrefix(prefix);
  if (!needle) return true;
  const pathLower = (normalizedPath ?? '').toLowerCase();
  return pathLower === needle || pathLower.startsWith(`${needle}/`);
}

/**
 * @param {string} haystack
 * @param {string} needle
 */
export function textContains(haystack, needle) {
  if (!needle) return true;
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * @param {string} normalizedPath
 * @param {SearchQuery} query
 */
export function matchesPathScope(normalizedPath, query) {
  if (!query.raw) return false;
  if (!query.prefix) return true;
  return pathStartsWithPrefix(normalizedPath, query.prefix);
}

/**
 * Path/filename contains all quoted patterns (used for path-only search).
 *
 * @param {string} normalizedPath
 * @param {string} filename
 * @param {SearchQuery} query
 */
export function matchesPathPatterns(normalizedPath, filename, query) {
  if (!query.patterns.length) return false;
  return query.patterns.every(
    (pattern) => textContains(normalizedPath, pattern) || textContains(filename, pattern),
  );
}

/**
 * @param {string} normalizedPath
 * @param {string} filename
 * @param {SearchQuery} query
 */
export function matchesPathQuery(normalizedPath, filename, query) {
  if (!matchesPathScope(normalizedPath, query)) return false;

  if (query.patterns.length > 0) {
    return matchesPathPatterns(normalizedPath, filename, query);
  }

  return Boolean(query.prefix);
}

/**
 * Needles used when scanning file source (full-text mode). Only quoted segments
 * are searched in document bodies; a bare prefix scopes the tree only.
 *
 * @param {SearchQuery} query
 * @returns {string[]}
 */
export function contentSearchNeedles(query) {
  return query.patterns;
}

/**
 * @param {string} sourceText
 * @param {SearchQuery} query
 */
export function matchesContentQuery(sourceText, query) {
  const needles = contentSearchNeedles(query);
  if (!needles.length) return false;
  return needles.every((needle) => textContains(sourceText, needle));
}

/**
 * BFS listing seeds: scope traversal to a path prefix when set.
 *
 * @param {SearchQuery} query
 * @param {string[]} hiddenRoots
 * @returns {string[]}
 */
export function listSeedDirectories(query, hiddenRoots = []) {
  const prefixDir = query.prefix
    ? normalizeSearchPrefix(query.prefix).replace(/^\/+/, '')
    : '';

  if (prefixDir) return [prefixDir];

  const seeds = [''];
  hiddenRoots.forEach((root) => {
    const trimmed = (root ?? '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (trimmed && !seeds.includes(trimmed)) seeds.push(trimmed);
  });
  return seeds;
}
