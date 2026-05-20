/**
 * Inspect-document session: search + load HTML source for a selected path.
 */

import { formatDocumentSource } from '../../shared/utils/format-html.js';

function initialState() {
  return {
    org: '',
    site: '',
    searchTerm: '',
    isSearching: false,
    results: [],
    meta: null,
    selectedPath: '',
    document: {
      isLoading: false,
      body: '',
      contentType: '',
      error: '',
    },
  };
}

export function createInspectSession({
  io,
  onChange = () => {},
  notify = () => {},
}) {
  let current = initialState();
  const s = () => current;
  const set = (patch) => { current = { ...current, ...patch }; onChange(current); };
  const setDocument = (patch) => set({ document: { ...current.document, ...patch } });
  let activeSearchRequest = 0;
  let activeSourceRequest = 0;

  function setField(field, value) {
    if (field === 'org' || field === 'site') {
      const next = typeof value === 'string' ? value.trim() : '';
      if (next === current[field]) return;
      set({
        [field]: next,
        results: [],
        meta: null,
        selectedPath: '',
        document: initialState().document,
      });
      return;
    }
    if (field === 'searchTerm') {
      set({ searchTerm: typeof value === 'string' ? value : '' });
      return;
    }
  }

  function canSearch() {
    const state = current;
    return Boolean(
      state.org?.trim()
      && state.site?.trim()
      && state.searchTerm?.trim()
      && !state.isSearching,
    );
  }

  async function loadSourceForPath(path) {
    const { org, site } = current;
    if (!path || !org?.trim() || !site?.trim()) return;

    activeSourceRequest += 1;
    const requestId = activeSourceRequest;
    setDocument({
      isLoading: true,
      body: '',
      contentType: '',
      error: '',
    });

    try {
      const { body, contentType } = await io.readSource(org, site, path);
      if (requestId !== activeSourceRequest) return;
      const raw = typeof body === 'string' ? body : '';
      const formatted = await formatDocumentSource(raw, path);
      if (requestId !== activeSourceRequest) return;
      setDocument({
        isLoading: false,
        body: formatted,
        contentType: contentType || 'text/html',
        error: '',
      });
    } catch (error) {
      if (requestId !== activeSourceRequest) return;
      setDocument({
        isLoading: false,
        body: '',
        contentType: '',
        error: error?.message || 'Failed to load document source.',
      });
    }
  }

  async function selectPath(path) {
    if (!path) return;
    if (path === current.selectedPath && !current.document.error && current.document.body) {
      return;
    }
    set({ selectedPath: path });
    await loadSourceForPath(path);
  }

  async function search() {
    const {
      org, site, searchTerm,
    } = current;
    if (!org?.trim() || !site?.trim() || !searchTerm?.trim()) return;

    activeSearchRequest += 1;
    const requestId = activeSearchRequest;
    const start = performance.now();
    set({
      isSearching: true,
      results: [],
      meta: null,
      selectedPath: '',
      document: initialState().document,
    });

    let result;
    try {
      result = await io.searchPaths(org, site, searchTerm, {
        maxResults: 150,
        maxFiles: 1000,
        concurrency: 8,
        hiddenRoots: ['.da'],
      });
    } catch (error) {
      result = { success: false, error: error.message || 'Search failed.' };
    }

    if (requestId !== activeSearchRequest) return;

    if (!result.success) {
      set({ isSearching: false });
      notify({ variant: 'error', message: result.error });
      return;
    }

    const durationMs = performance.now() - start;
    const { results } = result;
    set({
      isSearching: false,
      results,
      meta: { matches: results.length, scanned: result.scanned, durationMs },
    });

    if (results.length === 1 && results[0]?.path) {
      await selectPath(results[0].path);
    }
  }

  return {
    getState: s,
    canSearch,
    setField,
    search,
    selectPath,
    reloadSelected: () => loadSourceForPath(current.selectedPath),
  };
}
