/**
 * Audit session: state machine + orchestration. Pure JS, no Lit, no DOM.
 *
 * The shell creates one session with an `io` adapter (browser fetches) and a
 * `notify` callback (toasts), and re-renders whenever `onChange` fires.
 *
 * Convention: methods read state via `s()` and mutate via `set(patch)`. There
 * is no other write path — `state` is closure-private, never returned.
 */

import {
  authenticationErrorMessage,
  buildLogPathIndex,
  resultMatchesLogFilter,
  normalizeContentKey,
} from '../../shared/da/index.js';
import {
  buildAuditPayload,
  createLoadingAuditState,
} from './timeline.js';

/** Default Helix log window when Preview/Live filtering is on and dates are empty. */
const DEFAULT_LOG_FILTER_RANGE_MS = 24 * 60 * 60 * 1000;

function datetimeLocalToIso(value) {
  if (!value || typeof value !== 'string') return '';
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function formatDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Past 24h window in local time for `datetime-local` inputs (matches default log filter). */
function defaultLogDatetimeRangeLocal() {
  const to = new Date();
  const from = new Date(to.getTime() - DEFAULT_LOG_FILTER_RANGE_MS);
  return { from: formatDatetimeLocal(from), to: formatDatetimeLocal(to) };
}

function initialState() {
  const logRange = defaultLogDatetimeRangeLocal();
  return {
    org: '',
    site: '',
    searchTerm: '',
    searchResults: [],
    searchMeta: null,
    expandedPath: '',
    auditByPath: {},
    isSearching: false,
    fullTextSearch: false,
    logFrom: logRange.from,
    logTo: logRange.to,
    logFilterPreview: false,
    logFilterLive: false,
    isDiffOpen: false,
    diffPath: '',
    diffVersions: [],
    requestedDiffVersionId: '',
  };
}

export function createAuditSession({ io, onChange = () => {}, notify = () => {} }) {
  let current = initialState();
  const s = () => current;
  const set = (patch) => { current = { ...current, ...patch }; onChange(current); };
  let activeSearchRequest = 0;

  function resetSearchResults() {
    activeSearchRequest += 1;
    set({
      isSearching: false,
      searchResults: [],
      searchMeta: null,
      expandedPath: '',
      auditByPath: {},
      isDiffOpen: false,
      diffPath: '',
      diffVersions: [],
      requestedDiffVersionId: '',
    });
  }

  function setField(field, value) {
    if (field === 'org' || field === 'site') {
      const next = typeof value === 'string' ? value.trim() : '';
      if (next === s()[field]) return;
      set({ [field]: next });
      resetSearchResults();
      return;
    }
    if (field === 'searchTerm') {
      set({ searchTerm: typeof value === 'string' ? value : '' });
      return;
    }
    if (field === 'logFrom' || field === 'logTo') {
      set({ [field]: typeof value === 'string' ? value : '' });
      return;
    }
    if (field === 'logFilterPreview' || field === 'logFilterLive' || field === 'fullTextSearch') {
      set({ [field]: Boolean(value) });
    }
  }

  function canSearch() {
    const state = s();
    return Boolean(
      state.org?.trim()
      && state.site?.trim()
      && state.searchTerm?.trim()
      && !state.isSearching,
    );
  }

  async function executeSearch(searchTermArg) {
    const state = s();
    const term = (searchTermArg ?? state.searchTerm)?.trim() || '';
    if (!state.org?.trim() || !state.site?.trim() || !term) return;

    const fromRaw = state.logFrom?.trim() || '';
    const toRaw = state.logTo?.trim() || '';
    const useLogFilter = Boolean(state.logFilterPreview || state.logFilterLive);
    // Capture identity fields once; they don't change during a search.
    const {
      org, site, fullTextSearch, logFilterPreview, logFilterLive,
    } = state;

    if (useLogFilter) {
      if ((fromRaw && !toRaw) || (!fromRaw && toRaw)) {
        notify({
          variant: 'error',
          message: 'Log filter needs both From and To, or leave both empty for the last 24 hours.',
        });
        return;
      }
      if (fromRaw && toRaw) {
        const fromMs = new Date(fromRaw).getTime();
        const toMs = new Date(toRaw).getTime();
        if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
          notify({ variant: 'error', message: 'Log from must be before Log to.' });
          return;
        }
      }
    }

    activeSearchRequest += 1;
    const requestId = activeSearchRequest;
    const start = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    set({
      isSearching: true,
      searchResults: [],
      searchMeta: null,
      expandedPath: '',
      auditByPath: {},
    });

    let result;
    try {
      result = await io.searchPaths(org, site, term, {
        fullTextSearch,
        maxResults: 150,
        maxFiles: 1000,
        concurrency: 8,
      });
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed unexpectedly.',
      };
    }

    if (requestId !== activeSearchRequest) return;

    if (!result.success) {
      set({ isSearching: false });
      notify({ variant: 'error', message: result.error });
      return;
    }

    let { results } = result;

    if (useLogFilter) {
      let fromIso;
      let toIso;
      if (!fromRaw && !toRaw) {
        const to = new Date();
        const from = new Date(to.getTime() - DEFAULT_LOG_FILTER_RANGE_MS);
        fromIso = from.toISOString();
        toIso = to.toISOString();
      } else {
        fromIso = datetimeLocalToIso(fromRaw);
        toIso = datetimeLocalToIso(toRaw);
      }

      const logResult = await io.fetchAdminLog(org, site, { from: fromIso, to: toIso });
      if (requestId !== activeSearchRequest) return;

      if (!logResult.success) {
        const err = typeof logResult.error === 'string' ? logResult.error.trim() : '';
        const isAuth = err === authenticationErrorMessage();
        notify({
          variant: 'warning',
          message: isAuth
            ? `${authenticationErrorMessage()} Preview and Published filters were not applied; showing all path matches.`
            : `Log filter not applied: ${err}. Showing all path matches.`,
        });
      } else {
        const normalizeKey = (raw) => normalizeContentKey(raw, org, site);
        const { previewKeys, liveKeys } = buildLogPathIndex(logResult.entries, normalizeKey);
        results = results.filter((row) => resultMatchesLogFilter(
          row,
          previewKeys,
          liveKeys,
          { matchPreview: logFilterPreview, matchLive: logFilterLive },
          (path) => normalizeContentKey(path, org, site),
        ));
      }
    }

    if (requestId !== activeSearchRequest) return;

    const durationMs = ((typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now()) - start;

    set({
      isSearching: false,
      searchResults: results,
      searchMeta: { matches: results.length, scanned: result.scanned, durationMs },
    });

    if (results.length === 1 && results[0]?.path) {
      // eslint-disable-next-line no-use-before-define
      void selectResultPath(results[0].path);
    }
  }

  async function loadTimelineForPath(path) {
    const state = s();
    if (!path || !state.org?.trim() || !state.site?.trim()) return;

    set({
      auditByPath: { ...state.auditByPath, [path]: createLoadingAuditState() },
    });

    const versionResult = await io.fetchVersionTimeline(state.org, state.site, path);

    set({
      auditByPath: { ...s().auditByPath, [path]: buildAuditPayload(versionResult) },
    });
  }

  async function selectResultPath(path) {
    if (!path) return;

    if (s().expandedPath === path) {
      set({
        expandedPath: '',
        isDiffOpen: false,
        diffVersions: [],
        requestedDiffVersionId: '',
        diffPath: '',
      });
      return;
    }

    set({
      expandedPath: path,
      isDiffOpen: false,
      diffVersions: [],
      requestedDiffVersionId: '',
      diffPath: '',
    });

    const existing = s().auditByPath[path];
    if (existing && !existing.loading) return;

    await loadTimelineForPath(path);
  }

  function closeDiffDialog({ resetPath = false } = {}) {
    set({
      isDiffOpen: false,
      diffVersions: [],
      requestedDiffVersionId: '',
      ...(resetPath ? { diffPath: '' } : {}),
    });
  }

  function selectedAudit() {
    const state = s();
    if (!state.expandedPath) return null;
    return state.auditByPath[state.expandedPath] || null;
  }

  /**
   * Diff-source fetchers for the dialog. Bound to the session so the UI
   * never sees org/site/token.
   */
  function fetchDiffLatest(path) {
    const { org, site } = s();
    return io.fetchLatestSource(org, site, path);
  }

  function fetchDiffVersion(versionUrl) {
    return io.fetchVersionSourceByUrl(versionUrl);
  }

  function openDiff({ versionId = '' } = {}) {
    const state = s();
    if (!state.expandedPath) return;
    const audit = selectedAudit();
    const versions = Array.isArray(audit?.versions) ? audit.versions : [];
    const hasVersionCandidates = versions.some((entry) => {
      const vId = typeof entry?.versionId === 'string' ? entry.versionId.trim() : '';
      const vUrl = typeof entry?.url === 'string' ? entry.url.trim() : '';
      return Boolean(vId && vUrl);
    });

    if (!hasVersionCandidates) {
      notify({
        variant: 'warning',
        message: 'No saved versions are available for this path.',
      });
      return;
    }

    set({
      diffPath: state.expandedPath,
      diffVersions: versions,
      requestedDiffVersionId: typeof versionId === 'string' ? versionId.trim() : '',
      isDiffOpen: true,
    });
  }

  return {
    getState: s,
    canSearch,
    setField,
    executeSearch,
    selectResultPath,
    loadTimelineForPath,
    closeDiffDialog,
    openDiff,
    selectedAudit,
    fetchDiffLatest,
    fetchDiffVersion,
  };
}
