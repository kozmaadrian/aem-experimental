import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseSearchQuery,
  isSearchQueryValid,
  pathStartsWithPrefix,
  matchesPathScope,
  matchesPathQuery,
  matchesFileQuery,
  matchesContentQuery,
  contentSearchNeedles,
  listSeedDirectories,
} from './search-query.js';

describe('parseSearchQuery', () => {
  it('parses path prefix', () => {
    assert.deepEqual(parseSearchQuery('/drafts'), {
      prefix: 'drafts',
      pathPatterns: [],
      contentPatterns: [],
      raw: '/drafts',
    });
  });

  it('parses bare path contains token', () => {
    assert.deepEqual(parseSearchQuery('hero'), {
      prefix: null,
      pathPatterns: ['hero'],
      contentPatterns: [],
      raw: 'hero',
    });
  });

  it('parses quoted path phrase', () => {
    assert.deepEqual(parseSearchQuery('"hero banner"'), {
      prefix: null,
      pathPatterns: ['hero banner'],
      contentPatterns: [],
      raw: '"hero banner"',
    });
  });

  it('parses body token and quoted body phrase', () => {
    const q = parseSearchQuery('~pricing ~"call to action"');
    assert.equal(q.prefix, null);
    assert.deepEqual(q.pathPatterns, []);
    assert.deepEqual(q.contentPatterns.sort(), ['call to action', 'pricing'].sort());
    assert.equal(q.raw, '~pricing ~"call to action"');
  });

  it('parses combined prefix, path, and body', () => {
    assert.deepEqual(parseSearchQuery('/drafts/blog hero ~pricing'), {
      prefix: 'drafts/blog',
      pathPatterns: ['hero'],
      contentPatterns: ['pricing'],
      raw: '/drafts/blog hero ~pricing',
    });
  });

  it('parses multiple path contains tokens as AND', () => {
    assert.deepEqual(parseSearchQuery('hero banner'), {
      prefix: null,
      pathPatterns: ['hero', 'banner'],
      contentPatterns: [],
      raw: 'hero banner',
    });
  });
});

describe('isSearchQueryValid', () => {
  it('rejects empty query', () => {
    assert.equal(isSearchQueryValid(parseSearchQuery('')), false);
  });

  it('accepts prefix-only', () => {
    assert.equal(isSearchQueryValid(parseSearchQuery('/drafts')), true);
  });

  it('accepts body-only', () => {
    assert.equal(isSearchQueryValid(parseSearchQuery('~hero')), true);
  });
});

describe('matchesPathQuery', () => {
  it('matches prefix only under folder', () => {
    const q = parseSearchQuery('/drafts');
    assert.equal(matchesPathQuery('/drafts/a.html', 'a.html', q), true);
    assert.equal(matchesPathQuery('/drafts', 'drafts', q), true);
    assert.equal(matchesPathQuery('/other/drafts.html', 'drafts.html', q), false);
  });

  it('matches bare contains anywhere in path', () => {
    const q = parseSearchQuery('drafts');
    assert.equal(matchesPathQuery('/marketing/drafts/foo.html', 'foo.html', q), true);
    assert.equal(matchesPathQuery('/pages/about.html', 'about.html', q), false);
  });

  it('matches quoted path phrase', () => {
    const q = parseSearchQuery('"hero"');
    assert.equal(matchesPathQuery('/pages/hero-banner.html', 'hero-banner.html', q), true);
    assert.equal(matchesPathQuery('/pages/about.html', 'about.html', q), false);
  });

  it('matches combined prefix and path contains', () => {
    const q = parseSearchQuery('/drafts hero');
    assert.equal(matchesPathQuery('/drafts/hero.html', 'hero.html', q), true);
    assert.equal(matchesPathQuery('/drafts/about.html', 'about.html', q), false);
    assert.equal(matchesPathQuery('/pages/hero.html', 'hero.html', q), false);
  });
});

describe('matchesFileQuery', () => {
  it('matches body needle only', () => {
    const q = parseSearchQuery('~pricing');
    assert.equal(matchesFileQuery('/any/page.html', 'page.html', '<p>Our pricing</p>', q), true);
    assert.equal(matchesFileQuery('/any/page.html', 'page.html', '<p>other</p>', q), false);
  });

  it('matches prefix, path, and body together', () => {
    const q = parseSearchQuery('/drafts hero ~pricing');
    assert.equal(
      matchesFileQuery('/drafts/hero.html', 'hero.html', '<p>pricing</p>', q),
      true,
    );
    assert.equal(
      matchesFileQuery('/drafts/hero.html', 'hero.html', '<p>nope</p>', q),
      false,
    );
    assert.equal(
      matchesFileQuery('/pages/hero.html', 'hero.html', '<p>pricing</p>', q),
      false,
    );
  });
});

describe('matchesContentQuery', () => {
  it('uses tilde patterns for body', () => {
    const q = parseSearchQuery('/drafts ~pricing');
    assert.equal(matchesContentQuery('<p>Our pricing</p>', q), true);
    assert.equal(matchesContentQuery('<p>drafts only</p>', q), false);
  });

  it('returns no body needles without tilde', () => {
    const q = parseSearchQuery('/drafts');
    assert.deepEqual(contentSearchNeedles(q), []);
  });
});

describe('listSeedDirectories', () => {
  it('scopes listing to slash prefix', () => {
    const q = parseSearchQuery('/drafts/blog');
    assert.deepEqual(listSeedDirectories(q, ['.da']), ['drafts/blog']);
  });

  it('includes hidden roots at site root when no slash prefix', () => {
    const q = parseSearchQuery('~hero');
    assert.deepEqual(listSeedDirectories(q, ['.da']), ['', '.da']);
  });
});

describe('pathStartsWithPrefix', () => {
  it('does not treat partial segment as prefix', () => {
    assert.equal(pathStartsWithPrefix('/drafts-extra/x.html', 'drafts'), false);
  });
});

describe('matchesPathScope', () => {
  it('allows any path when only a body pattern is used', () => {
    const q = parseSearchQuery('~Adrian');
    assert.equal(matchesPathScope('/pages/about.html', q), true);
  });

  it('restricts to prefix folder for combined queries', () => {
    const q = parseSearchQuery('/drafts ~Adrian');
    assert.equal(matchesPathScope('/drafts/a.html', q), true);
    assert.equal(matchesPathScope('/pages/a.html', q), false);
  });
});
