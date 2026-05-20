/**
 * Parse and evaluate audit / content-transfer / inspect search query syntax.
 *
 *   /path/to        path starts with this prefix (folder scope)
 *   keyword         path or filename contains keyword (AND if several)
 *   "phrase"        path contains phrase (spaces allowed)
 *   ~keyword        document body contains keyword
 *   ~"phrase"       document body contains phrase
 *
 * Examples: `/drafts`, `hero`, `/drafts ~pricing`, `~"call to action"`.
 */

/** Path phrase in double quotes. */
const QUOTED_PATH_RE = /"([^"]+)"/g;

/** Body phrase: ~"…" */
const TILDE_QUOTED_RE = /~"([^"]+)"/g;

/** Body token: ~word */
const TILDE_WORD_RE = /~(\S+)/g;

/** Folder prefix token (starts with /). */
const PREFIX_TOKEN_RE = /(?:^|\s)(\/\S+)/;

/**
 * Short documentation sections for the search help popover.
 *
 * @typedef {{ title: string, body: string, form?: string }} SearchQueryHelpSection
 */

/** @type {SearchQueryHelpSection[]} */
export const SEARCH_QUERY_HELP_SECTIONS = [
  {
    title: 'Path prefix',
    body: 'Limit results to a folder and everything beneath it. Start the token with a slash.',
    form: '/drafts/blog',
  },
  {
    title: 'Path contains',
    body: 'Match any part of the path or filename. Separate words are all required (AND).',
    form: 'hero',
  },
  {
    title: 'Path phrase',
    body: 'Match a phrase inside the path or filename. Use quotes when the text has spaces.',
    form: '"hero banner"',
  },
  {
    title: 'Body contains',
    body: 'Search inside page source (HTML, JSON, etc.). Prefix with tilde. Use quotes for phrases with spaces.',
    form: '~pricing',
  },
  {
    title: 'Combine',
    body: 'Mix prefix, path filters, and body filters. Example: search under /drafts for paths with "banner" and body text "free trial".',
    form: '/drafts "banner" ~"free trial"',
  },
];

/**
 * @typedef {{
 *   prefix: string | null,
 *   pathPatterns: string[],
 *   contentPatterns: string[],
 *   raw: string,
 * }} SearchQuery
 */

/**
 * @param {RegExp} pattern
 * @param {string} text
 * @param {string[]} bucket
 * @returns {string}
 */
function extractAll(pattern, text, bucket) {
  let remainder = text;
  pattern.lastIndex = 0;
  let match = pattern.exec(remainder);
  while (match) {
    const piece = (match[1] ?? '').trim();
    if (piece) bucket.push(piece);
    remainder = `${remainder.slice(0, match.index)} ${remainder.slice(match.index + match[0].length)}`;
    pattern.lastIndex = 0;
    match = pattern.exec(remainder);
  }
  return remainder.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} raw
 * @returns {SearchQuery}
 */
export function parseSearchQuery(raw) {
  const term = (raw ?? '').trim();
  if (!term) {
    return {
      prefix: null,
      pathPatterns: [],
      contentPatterns: [],
      raw: '',
    };
  }

  const pathPatterns = [];
  const contentPatterns = [];

  let remainder = extractAll(TILDE_QUOTED_RE, term, contentPatterns);
  remainder = extractAll(QUOTED_PATH_RE, remainder, pathPatterns);
  remainder = extractAll(TILDE_WORD_RE, remainder, contentPatterns);

  let prefix = null;
  const prefixMatch = remainder.match(PREFIX_TOKEN_RE);
  if (prefixMatch) {
    const rawPrefix = prefixMatch[1].replace(/^\/+/, '').replace(/\/+$/, '');
    prefix = rawPrefix || null;
    remainder = remainder.replace(prefixMatch[1], ' ').replace(/\s+/g, ' ').trim();
  }

  if (remainder) {
    remainder.split(/\s+/).forEach((token) => {
      const piece = token.trim();
      if (piece) pathPatterns.push(piece);
    });
  }

  return {
    prefix,
    pathPatterns,
    contentPatterns,
    raw: term,
  };
}

/**
 * @param {SearchQuery} query
 * @returns {boolean}
 */
export function isSearchQueryValid(query) {
  return Boolean(
    query?.raw?.trim()
    && (
      query.prefix
      || query.pathPatterns.length > 0
      || query.contentPatterns.length > 0
    ),
  );
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
 * @param {string} normalizedPath
 * @param {string} filename
 * @param {SearchQuery} query
 */
export function matchesPathPatterns(normalizedPath, filename, query) {
  if (!query.pathPatterns.length) return false;
  return query.pathPatterns.every(
    (pattern) => textContains(normalizedPath, pattern) || textContains(filename, pattern),
  );
}

/**
 * @param {SearchQuery} query
 * @returns {string[]}
 */
export function contentSearchNeedles(query) {
  return query.contentPatterns;
}

/**
 * @param {string} sourceText
 * @param {SearchQuery} query
 */
export function matchesContentQuery(sourceText, query) {
  const needles = contentSearchNeedles(query);
  if (!needles.length) return false;
  const src = typeof sourceText === 'string' ? sourceText : '';
  return needles.every((needle) => textContains(src, needle));
}

/**
 * @param {string} normalizedPath
 * @param {string} filename
 * @param {string} sourceText
 * @param {SearchQuery} query
 */
export function matchesFileQuery(normalizedPath, filename, sourceText, query) {
  if (!query.raw) return false;
  if (!matchesPathScope(normalizedPath, query)) return false;

  const hasPath = query.pathPatterns.length > 0;
  const hasContent = query.contentPatterns.length > 0;
  const prefixOnly = Boolean(query.prefix) && !hasPath && !hasContent;

  if (hasContent && !matchesContentQuery(sourceText, query)) return false;
  if (hasPath && !matchesPathPatterns(normalizedPath, filename, query)) return false;

  return prefixOnly || hasPath || hasContent;
}

/**
 * @param {string} normalizedPath
 * @param {string} filename
 * @param {SearchQuery} query
 */
export function matchesPathQuery(normalizedPath, filename, query) {
  return matchesFileQuery(normalizedPath, filename, '', query);
}

/**
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
