/**
 * Copy-docs session: state machine + orchestration. Pure JS, no Lit, no DOM.
 *
 * Source side runs a search like audit's; selected results are the items to
 * copy. Target side is just configuration: org / site / folder / two toggles.
 * The run state tracks per-item progress so the right panel can show a status
 * list of created documents.
 *
 * Convention: methods read state via `s()` and mutate via `set(patch)`. There
 * is no other write path — `state` is closure-private, never returned.
 */

import { sanitizeAndNormalizePath } from '../../shared/da/index.js';
import { runCopy } from './engine.js';

/**
 * Compute target path: place each source under the configured target folder.
 *
 * - preserveSubtree: `/abc/test.html` + `/xyz` → `/xyz/abc/test.html`
 * - flatten:         `/abc/test.html` + `/xyz` → `/xyz/test.html`
 * - empty/root folder: returns the source path as-is.
 */
export function resolveTargetPath(sourcePath, { folder, preserveSubtree }) {
  const normalized = sanitizeAndNormalizePath(folder || '');
  if (!normalized || normalized === '/') return sourcePath;
  if (preserveSubtree) return `${normalized}${sourcePath}`;
  const basename = sourcePath.split('/').filter(Boolean).pop() || '';
  return basename ? `${normalized}/${basename}` : sourcePath;
}

function initialState() {
  return {
    source: {
      org: '',
      site: '',
      searchTerm: '',
      isSearching: false,
      results: [], // [{ path, lastModified }]
      meta: null, // { matches, scanned, durationMs }
      selected: [], // string[] of selected paths
    },
    target: {
      org: '',
      site: '',
      folder: '/',
      preserveSubtree: true,
      overwrite: false,
    },
    run: {
      status: 'idle', // 'idle' | 'running' | 'done'
      items: [], // [{ sourcePath, targetPath, state, error? }]
      summary: null, // { copied, skipped, failed }
    },
  };
}

export function createCopySession({
  io,
  onChange = () => {},
  notify = () => {},
}) {
  let current = initialState();
  const s = () => current;
  const set = (patch) => { current = { ...current, ...patch }; onChange(current); };
  const setSource = (patch) => set({ source: { ...current.source, ...patch } });
  const setTarget = (patch) => set({ target: { ...current.target, ...patch } });
  const setRun = (patch) => set({ run: { ...current.run, ...patch } });
  let activeSearchRequest = 0;

  /* --- Source --------------------------------------------------------- */

  function setSourceField(field, value) {
    if (field === 'org' || field === 'site') {
      const next = typeof value === 'string' ? value.trim() : '';
      if (next === current.source[field]) return;
      setSource({
        [field]: next,
        results: [],
        meta: null,
        selected: [],
      });
      return;
    }
    if (field === 'searchTerm') {
      setSource({ searchTerm: typeof value === 'string' ? value : '' });
      return;
    }
  }

  function canSearch() {
    const src = current.source;
    return Boolean(
      src.org?.trim()
      && src.site?.trim()
      && src.searchTerm?.trim()
      && !src.isSearching,
    );
  }

  async function search() {
    const {
      org, site, searchTerm,
    } = current.source;
    if (!org?.trim() || !site?.trim() || !searchTerm?.trim()) return;

    activeSearchRequest += 1;
    const requestId = activeSearchRequest;
    const start = performance.now();
    setSource({ isSearching: true, results: [], meta: null });

    let result;
    try {
      result = await io.searchPaths(org, site, searchTerm, {
        maxResults: 150,
        maxFiles: 1000,
        concurrency: 8,
        // Probe DA system folders so users can copy schemas / forms /
        // anything stored under `.da/...`.
        hiddenRoots: ['.da'],
      });
    } catch (error) {
      result = { success: false, error: error.message || 'Search failed.' };
    }

    if (requestId !== activeSearchRequest) return;

    if (!result.success) {
      setSource({ isSearching: false });
      notify({ variant: 'error', message: result.error });
      return;
    }

    const durationMs = performance.now() - start;
    setSource({
      isSearching: false,
      results: result.results,
      meta: { matches: result.results.length, scanned: result.scanned, durationMs },
    });
  }

  function toggleSelected(path) {
    const { selected } = current.source;
    const next = selected.includes(path)
      ? selected.filter((p) => p !== path)
      : [...selected, path];
    setSource({ selected: next });
  }

  function selectAll() {
    setSource({ selected: current.source.results.map((r) => r.path) });
  }

  function selectNone() {
    setSource({ selected: [] });
  }

  /* --- Target --------------------------------------------------------- */

  function setTargetField(field, value) {
    if (field === 'org' || field === 'site') {
      setTarget({ [field]: typeof value === 'string' ? value : '' });
      return;
    }
    if (field === 'folder') {
      // Always store the folder with a leading slash; empty input becomes '/'.
      const raw = typeof value === 'string' ? value : '';
      let normalized = raw;
      if (raw === '') normalized = '/';
      else if (!raw.startsWith('/')) normalized = `/${raw}`;
      setTarget({ folder: normalized });
      return;
    }
    if (field === 'preserveSubtree') {
      setTarget({ preserveSubtree: Boolean(value) });
      return;
    }
    if (field === 'overwrite') {
      setTarget({ overwrite: Boolean(value) });
    }
  }

  /* --- Run ------------------------------------------------------------ */

  function canRun() {
    const { source, target, run: r } = current;
    return Boolean(
      source.selected.length
      && target.org?.trim()
      && target.site?.trim()
      && r.status !== 'running',
    );
  }

  async function run() {
    if (!canRun()) return;

    const { source, target } = current;
    const items = source.selected.map((sourcePath) => ({
      sourcePath,
      targetPath: resolveTargetPath(sourcePath, {
        folder: target.folder,
        preserveSubtree: target.preserveSubtree,
      }),
      state: 'queued',
    }));

    // Discard cached parent listings so each run sees the current state of
    // the target — otherwise a stale snapshot can wrongly report "doesn't
    // exist" and overwrite files even when overwrite is off.
    io.clearListingCache?.();

    setRun({ status: 'running', items, summary: null });

    const summary = await runCopy({
      items,
      io,
      sourceOrg: source.org,
      sourceSite: source.site,
      targetOrg: target.org,
      targetSite: target.site,
      conflictPolicy: target.overwrite ? 'overwrite' : 'skip',
      concurrency: 3,
      onProgress: ({ index, state, error }) => {
        const updated = current.run.items.map((item, i) => (
          i === index ? { ...item, state, ...(error ? { error } : {}) } : item
        ));
        setRun({ items: updated });
      },
    });

    setRun({ status: 'done', summary });

    const { copied, skipped, failed } = summary;
    const total = items.length;
    if (failed === 0 && skipped === 0) {
      notify({ variant: 'success', message: `Copied ${copied} of ${total} documents.` });
    } else {
      notify({
        variant: failed ? 'warning' : 'info',
        message: `Copied ${copied} of ${total}. ${skipped} skipped, ${failed} failed.`,
      });
    }
  }

  return {
    getState: s,
    canSearch,
    canRun,
    setSourceField,
    setTargetField,
    search,
    toggleSelected,
    selectAll,
    selectNone,
    run,
  };
}
