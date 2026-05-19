import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseSearchQuery,
  pathStartsWithPrefix,
  matchesPathScope,
  matchesPathQuery,
  matchesContentQuery,
  contentSearchNeedles,
  listSeedDirectories,
} from './search-query.js';

describe('parseSearchQuery', () => {
  it('parses starts-with term', () => {
    assert.deepEqual(parseSearchQuery('drafts'), {
      prefix: 'drafts',
      patterns: [],
      raw: 'drafts',
    });
  });

  it('parses quoted contains pattern', () => {
    assert.deepEqual(parseSearchQuery('"hero"'), {
      prefix: null,
      patterns: ['hero'],
      raw: '"hero"',
    });
  });

  it('parses combined prefix and quoted pattern', () => {
    assert.deepEqual(parseSearchQuery('drafts "hero"'), {
      prefix: 'drafts',
      patterns: ['hero'],
      raw: 'drafts "hero"',
    });
  });

  it('parses multi-segment prefix with quoted pattern', () => {
    assert.deepEqual(parseSearchQuery('drafts/blog "hero"'), {
      prefix: 'drafts/blog',
      patterns: ['hero'],
      raw: 'drafts/blog "hero"',
    });
  });

  it('parses multiple quoted patterns', () => {
    assert.deepEqual(parseSearchQuery('"foo" "bar"'), {
      prefix: null,
      patterns: ['foo', 'bar'],
      raw: '"foo" "bar"',
    });
  });
});

describe('matchesPathQuery', () => {
  it('matches starts-with only', () => {
    const q = parseSearchQuery('drafts');
    assert.equal(matchesPathQuery('/drafts/a.html', 'a.html', q), true);
    assert.equal(matchesPathQuery('/drafts', 'drafts', q), true);
    assert.equal(matchesPathQuery('/other/drafts.html', 'drafts.html', q), false);
  });

  it('matches quoted contains pattern only', () => {
    const q = parseSearchQuery('"hero"');
    assert.equal(matchesPathQuery('/pages/hero-banner.html', 'hero-banner.html', q), true);
    assert.equal(matchesPathQuery('/pages/about.html', 'about.html', q), false);
  });

  it('matches combined prefix and quoted pattern', () => {
    const q = parseSearchQuery('drafts "hero"');
    assert.equal(matchesPathQuery('/drafts/hero.html', 'hero.html', q), true);
    assert.equal(matchesPathQuery('/drafts/about.html', 'about.html', q), false);
    assert.equal(matchesPathQuery('/pages/hero.html', 'hero.html', q), false);
  });
});

describe('matchesContentQuery', () => {
  it('uses quoted pattern for full text when combined', () => {
    const q = parseSearchQuery('drafts "pricing"');
    assert.equal(matchesContentQuery('<p>Our pricing</p>', q), true);
    assert.equal(matchesContentQuery('<p>drafts only</p>', q), false);
  });

  it('does not search body without a quoted segment', () => {
    const q = parseSearchQuery('drafts');
    assert.deepEqual(contentSearchNeedles(q), []);
  });
});

describe('listSeedDirectories', () => {
  it('scopes listing to prefix directory', () => {
    const q = parseSearchQuery('drafts/blog');
    assert.deepEqual(listSeedDirectories(q, ['.da']), ['drafts/blog']);
  });

  it('includes hidden roots at site root when no prefix', () => {
    const q = parseSearchQuery('"hero"');
    assert.deepEqual(listSeedDirectories(q, ['.da']), ['', '.da']);
  });
});

describe('pathStartsWithPrefix', () => {
  it('does not treat partial segment as prefix', () => {
    assert.equal(pathStartsWithPrefix('/drafts-extra/x.html', 'drafts'), false);
  });
});

describe('matchesPathScope', () => {
  it('allows any path when only a quoted pattern is used (full-text scope)', () => {
    const q = parseSearchQuery('"Adrian"');
    assert.equal(matchesPathScope('/pages/about.html', q), true);
  });

  it('restricts to prefix folder for combined queries', () => {
    const q = parseSearchQuery('drafts "Adrian"');
    assert.equal(matchesPathScope('/drafts/a.html', q), true);
    assert.equal(matchesPathScope('/pages/a.html', q), false);
  });
});
