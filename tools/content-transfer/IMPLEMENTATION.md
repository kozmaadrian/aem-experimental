# Implementation Plan — Agent-Actionable

Companion to [PLAN.md](./PLAN.md) (design) and [REFACTOR.md](./REFACTOR.md) (analysis). This document is the execution plan: discrete tasks, file paths, acceptance criteria, verification steps.

**How to use this doc:**

- Work through phases in order. Each phase ends with verification — don't proceed if it fails.
- Tasks within a phase are sequential unless marked `[parallel-ok]`.
- Each task lists: files to touch, what to do, acceptance criteria.
- Treat "acceptance criteria" as a checklist — every box must be ticked.
- When a task says "move X → Y", that means: copy contents, update imports, delete original. Verify imports across the codebase before deleting.

**Conventions:**

- All paths in this doc are relative to the repo root (`tools/...`).
- Use existing code style (ES6, single quotes, no semicolons-at-EOL-stripping — match neighboring files).
- No new dependencies. Everything imports from existing CDN URLs or shared local modules.
- Tests run in Node (`node --test`). No JSDOM.
- Run `npm run lint` after every phase. Fix lint before proceeding.

**Branch strategy:**

- One branch per phase. Phase 0 ships first, Phase 1 second, etc.
- Each phase produces a working, deployable repo. Don't leave half-migrated state across a phase boundary.

---

## Phase 0 — Shared `tools/shared/da/` package

**Goal:** Centralize DA HTTP, endpoints, paths, search, and log helpers. Both existing tools keep working via re-exports.

**Scope:** Pure refactor — no behavior change, no tool reorganization yet.

### Task 0.1 — Scaffold the package directory

**Files to create** (empty stubs, will be filled in subsequent tasks):

```
tools/shared/da/
├── http.js
├── endpoints.js
├── paths.js
├── log-filter.js
├── search.js
├── versions.js
├── log.js
├── client.js
└── index.js
```

Also create:

```
tools/shared/utils/
└── debounce.js
```

**Acceptance:**

- All files exist.
- `tree tools/shared` shows the new layout.

---

### Task 0.2 — `shared/da/http.js`

**What to do:** Move HTTP transport helpers out of `tools/audit/utils/api.js`. Copy these functions verbatim into `tools/shared/da/http.js`:

- `fetchJSON(url, token)`
- `fetchText(url, token)`
- `authenticationErrorMessage()` (exported)
- `isAuthenticationStatus(status)`
- `isAuthenticationError(error)`
- `formatResponseForLog(payload, maxLength)`

**Exports:**

```js
export {
  fetchJSON,
  fetchText,
  authenticationErrorMessage,
  isAuthenticationError,
};
```

(`isAuthenticationStatus` and `formatResponseForLog` stay internal.)

**Acceptance:**

- File loads without errors (`node --check tools/shared/da/http.js`).
- Functions are byte-for-byte equivalent to the originals in audit (minor reformatting OK).

---

### Task 0.3 — `shared/da/endpoints.js`

**What to do:** Centralize base URLs and URL builders. Add to `tools/shared/da/endpoints.js`:

```js
export const ADMIN_HLX_BASE_URL = "https://admin.hlx.page";
export const ADMIN_DA_LIVE_URL = "https://admin.da.live"; // reads
export const ADMIN_DA_PAGE_URL = "https://admin.da.page"; // writes
export const PREVIEW_BASE_URL = "https://da.live";
export const DEFAULT_LOG_REF = "main";

export function buildListUrl(org, site, dirPath) {
  /* …/list/org/site/dir */
}
export function buildSourceReadUrl(org, site, path) {
  /* admin.da.live/source/... */
}
export function buildSourceWriteUrl(org, site, path) {
  /* admin.da.page/source/... */
}
export function buildVersionListUrl(org, site, versionPath) {
  /* admin.da.live/versionlist/... */
}
export function buildVersionSourceUrl(versionUrl) {
  /* normalize relative → absolute under admin.da.live */
}
export function buildLogUrl(org, site, ref, { from, to }) {
  /* admin.hlx.page/log/... */
}
```

Use `encodePath` and `encodeURIComponent` from `paths.js` (Task 0.4) as needed. URL builders should mirror the patterns currently in `audit/utils/api.js` and `import-sc/utils/api.js`.

**Acceptance:**

- Every URL builder, when given the same inputs as the existing inline construction in either tool, produces the identical string.
- Add a comment block at the top listing which DA admin host is used for which operation.

---

### Task 0.4 — `shared/da/paths.js`

**What to do:** Lift pure path helpers from `audit/utils/api.js`. Copy verbatim:

- `stripKnownContentExtensions(path)`
- `sanitizeAndNormalizePath(documentPath, org, site)`
- `encodePath(path)`
- `normalizeAuditContentKey(documentPath, org, site)` → rename to `normalizeContentKey` (drop "audit" — it's not audit-specific)
- `getVersionPath(documentPath, org, site)`
- `getListPath(documentPath, org, site)`
- `normalizeListResponse(payload)` (used by list/search)

Also add a new helper used by import-sc:

- `normalizeDocumentPath(documentPath)` — ensures leading slash; trims; from `import-sc/utils/api.js`.

**Exports:** All of the above.

**Acceptance:**

- `node --check tools/shared/da/paths.js`.
- No imports from `http.js` or any browser API. This file is pure.

---

### Task 0.5 — `shared/da/log-filter.js`

**What to do:** Move `tools/audit/lib/audit-log-filter.js` to `tools/shared/da/log-filter.js` verbatim. Keep all exports:

- `isLogPreviewRoute`
- `isLogLiveRoute`
- `buildLogPathIndex`
- `resultMatchesLogFilter`

**Acceptance:**

- File contents identical to the original except for the path comment at top.

---

### Task 0.6 — `shared/da/search.js`

**What to do:** Move `searchContentPaths` from `audit/utils/api.js` into `tools/shared/da/search.js`. Update its internal imports to use `./http.js`, `./endpoints.js`, `./paths.js`.

The function signature stays the same:

```js
export async function searchContentPaths(org, site, term, token, options = {}) { … }
```

Internal helpers (`matchesTerm`, `normalizeExt`) move with it.

**Acceptance:**

- Function signature unchanged.
- Behavior unchanged: given the same args, produces the same result objects in the same order.

---

### Task 0.7 — `shared/da/versions.js`

**What to do:** Move from `audit/utils/api.js`:

- `fetchVersionTimeline(org, site, documentPath, token)`
- `fetchLatestDocumentSource(org, site, documentPath, token)`
- `fetchVersionSourceByUrl(versionUrl, token)`
- `toAbsoluteVersionSourceUrl(versionUrl)` (internal helper — or move to endpoints.js as `buildVersionSourceUrl` per Task 0.3)

Update imports to use `./http.js`, `./endpoints.js`, `./paths.js`.

**Acceptance:**

- All three exported functions work with the same return shapes (`{ success, … }` or `{ success: false, error }`).

---

### Task 0.8 — `shared/da/log.js`

**What to do:** Move `fetchAdminLog` from `audit/utils/api.js` to `tools/shared/da/log.js`. Update imports.

**Exports:** `fetchAdminLog`.

**Acceptance:**

- Same return shape (`{ success, entries, from, to }` or `{ success: false, error }`).

---

### Task 0.9 — `shared/da/client.js`

**What to do:** Build the **`createDaClient({ token })`** factory. This is the new public API that core layers consume via the `io` contract.

```js
import { fetchJSON, fetchText, authenticationErrorMessage } from './http.js';
import {
  buildListUrl, buildSourceReadUrl, buildSourceWriteUrl,
  buildVersionListUrl, buildLogUrl,
} from './endpoints.js';
import {
  sanitizeAndNormalizePath, getListPath, getVersionPath,
  normalizeListResponse, encodePath,
} from './paths.js';
import { searchContentPaths } from './search.js';
import {
  fetchVersionTimeline, fetchLatestDocumentSource, fetchVersionSourceByUrl,
} from './versions.js';
import { fetchAdminLog } from './log.js';

export function createDaClient({ token }) {
  if (!token) throw new Error('createDaClient: token is required');

  return {
    // Listing
    listDirectory: (org, site, dirPath) => /* GET buildListUrl + normalize */,

    // Source read/write
    readSource:  (org, site, path) => /* fetchText buildSourceReadUrl  */,
    writeSource: (org, site, path, body, contentType) => /* POST multipart to buildSourceWriteUrl */,

    // Existence (implemented by parent-dir listing; cache one-deep)
    targetExists: (org, site, path) => /* list parent, look for filename */,

    // Search
    searchPaths: (org, site, term, options) =>
      searchContentPaths(org, site, term, token, options),

    // Versions
    fetchVersionTimeline:     (org, site, path) => fetchVersionTimeline(org, site, path, token),
    fetchLatestSource:        (org, site, path) => fetchLatestDocumentSource(org, site, path, token),
    fetchVersionSourceByUrl:  (versionUrl)      => fetchVersionSourceByUrl(versionUrl, token),

    // Helix admin log
    fetchAdminLog: (org, site, options) => fetchAdminLog(org, site, token, options),
  };
}
```

**Implementation notes:**

- `writeSource` follows the multipart pattern in `import-sc/utils/api.js`: `FormData` with a `data` Blob of the body, `Authorization: Bearer ${token}` header.
- `targetExists` caches parent listings in a `Map` keyed by `${org}/${site}/${parentDir}` for the lifetime of the client instance. Each cache entry is the resolved Promise so concurrent callers share the request.
- `listDirectory` returns the normalized array from `normalizeListResponse`.

**Acceptance:**

- All methods return Promises.
- Token is never returned or logged; it's captured in the closure.
- `targetExists` does not perform more than one HTTP request per unique `(org, site, parentDir)` within a single client instance.

---

### Task 0.10 — `shared/da/index.js`

**What to do:** Re-export the public API. This is what tools import from.

```js
// Factory (preferred)
export { createDaClient } from "./client.js";

// Pure helpers safe for core layers
export {
  sanitizeAndNormalizePath,
  normalizeContentKey,
  encodePath,
  stripKnownContentExtensions,
  normalizeDocumentPath,
  getVersionPath,
  getListPath,
} from "./paths.js";

export {
  isLogPreviewRoute,
  isLogLiveRoute,
  buildLogPathIndex,
  resultMatchesLogFilter,
} from "./log-filter.js";

// Auth error helpers
export { authenticationErrorMessage } from "./http.js";
```

**Acceptance:**

- All re-exports resolve (`node --check`).
- This is the only import path tools should use going forward; subsequent tasks reference `tools/shared/da/index.js`.

---

### Task 0.11 — `shared/utils/debounce.js`

**What to do:** Move `debounce` from `import-sc/utils/helpers.js` to `tools/shared/utils/debounce.js`. Export it as the default and named export:

```js
export function debounce(fn, ms) { … }
export default debounce;
```

**Acceptance:**

- File contents identical to the original `debounce` implementation.

---

### Task 0.12 — Backward-compat shims in existing tools

**Goal:** Existing tools keep working with no behavior change while the shared package becomes the source of truth.

**Files to update:**

`tools/audit/utils/api.js` — replace contents with re-exports:

```js
export {
  authenticationErrorMessage,
  sanitizeAndNormalizePath,
  normalizeContentKey as normalizeAuditContentKey, // preserves old name
} from "../../shared/da/index.js";

export { searchContentPaths } from "../../shared/da/search.js";
export {
  fetchVersionTimeline,
  fetchLatestDocumentSource,
  fetchVersionSourceByUrl,
} from "../../shared/da/versions.js";
export { fetchAdminLog } from "../../shared/da/log.js";
```

`tools/audit/lib/audit-log-filter.js` — replace contents with:

```js
export {
  isLogPreviewRoute,
  isLogLiveRoute,
  buildLogPathIndex,
  resultMatchesLogFilter,
} from "../../shared/da/log-filter.js";
```

`tools/import-sc/utils/api.js` — rewrite to use the shared client internally. Keep the old function signatures:

```js
import { createDaClient } from "../../shared/da/index.js";
import { normalizeDocumentPath } from "../../shared/da/paths.js";

export async function loadSchemas(org, site, token) {
  /* uses client.listDirectory */
}
export async function fetchSchema(schemaPath, token) {
  /* uses client.readSource */
}
export async function importToDA(org, site, documentPath, htmlContent, token) {
  /* uses client.writeSource; returns same { success, url } shape */
}
```

`tools/import-sc/utils/helpers.js` — replace contents:

```js
export { debounce } from "../../shared/utils/debounce.js";
```

**Acceptance:**

- `npm run lint` passes.
- Start dev server (`npx -y @adobe/aem-cli up --no-open`). Open `http://localhost:3000/tools/audit/audit` and `http://localhost:3000/tools/import-sc/import-sc`.
- Manually verify: audit search, audit timeline expand, audit diff dialog open, import-sc schema list loads.
- No console errors.

---

### Phase 0 verification

```bash
npm run lint
# Then in a separate terminal:
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

Open both tools in browser. Confirm full functionality. **Do not proceed to Phase 1 until Phase 0 is green.**

---

## Phase 1 — Build `content-transfer` against the shared package

**Goal:** Ship the new copy tool, proving the shared `da/` API by being its first new consumer. Layout follows `core / app / ui` from day one.

### Task 1.1 — Scaffold `tools/content-transfer/` tree

**Files to create** (empty stubs, will be filled):

```
tools/content-transfer/
├── content-transfer.html
├── content-transfer.css
├── content-transfer.js
├── README.md
├── core/
│   ├── index.js
│   ├── state.js
│   ├── selection.js
│   ├── target-path.js
│   ├── conflict.js
│   ├── engine.js
│   └── session.js
├── app/
│   └── copy-io.js
└── ui/
    ├── copy-panel.js
    ├── copy-search-bar.js
    ├── copy-results-list.js
    ├── copy-target-form.js
    ├── copy-progress-list.js
    └── copy-conflict-dialog.js
```

**Acceptance:** All files exist.

---

### Task 1.2 — `core/state.js`

**Define the snapshot shape and an `initialState()` factory:**

```js
export function initialState() {
  return {
    source: {
      org: "",
      site: "",
      searchTerm: "",
      fullText: false,
      isSearching: false,
      results: [], // [{ path, lastModified }]
      searchMeta: null, // { matches, scanned, durationMs } | null
      selected: new Set(), // Set<string> of source paths
    },
    target: {
      org: "",
      site: "",
      mode: "mirror", // 'mirror' | 'folder'
      folder: "", // '/imports/2026-05' etc.
      preserveSubtree: true,
      conflictPolicy: "ask", // 'ask' | 'skip' | 'overwrite'
    },
    run: {
      status: "idle", // 'idle' | 'running' | 'done' | 'cancelled'
      items: [], // [{ sourcePath, targetPath, state, error? }]
      summary: null, // { copied, skipped, failed } | null
    },
  };
}
```

**Acceptance:**

- `node --check tools/content-transfer/core/state.js`.
- Function returns a fresh object every call (no shared references).

---

### Task 1.3 — `core/selection.js` (pure)

**Implement:**

```js
export function toggleSelected(selected, path) {
  /* returns new Set */
}
export function selectAll(selected, paths) {
  /* returns new Set */
}
export function selectNone() {
  /* returns new Set */
}
export function invertSelection(selected, paths) {
  /* returns new Set */
}
export function selectedItems(selected, results) {
  // returns results.filter(r => selected.has(r.path))
}
```

All functions are pure: take inputs, return new Sets/arrays. Never mutate inputs.

**Acceptance:**

- Pure: passing the same Set twice doesn't share references in the output.
- Add Node tests at `tools/content-transfer/core/selection.test.js`:
  - `toggleSelected({}, '/a')` includes `/a`
  - `toggleSelected(set, '/a')` where `/a` is in `set` removes it
  - `invertSelection` swaps membership

---

### Task 1.4 — `core/target-path.js` (pure)

**Implement:**

```js
export function resolveTargetPath(
  sourcePath,
  { mode, folder, preserveSubtree },
) {
  // mode === 'mirror'  → returns sourcePath unchanged
  // mode === 'folder' && preserveSubtree
  //   → joinPath(folder, sourcePath)
  // mode === 'folder' && !preserveSubtree
  //   → joinPath(folder, basename(sourcePath))
}

export function deconflictFilenames(targetPaths) {
  // Given a list of resolved target paths, append -2, -3, ... to collisions.
  // Pure: returns a new array of the same length with disambiguated paths.
}
```

Reuse `sanitizeAndNormalizePath` from `shared/da/paths.js` for normalization (it's pure).

**Acceptance:**

- Add Node tests at `tools/content-transfer/core/target-path.test.js`:
  - mirror: `/a/b/c.html` → `/a/b/c.html`
  - folder + preserve: (`/a/b/c.html`, `/imports`) → `/imports/a/b/c.html`
  - folder + flatten: (`/a/b/c.html`, `/imports`) → `/imports/c.html`
  - deconflict: `['/x.html', '/x.html', '/x.html']` → `['/x.html', '/x-2.html', '/x-3.html']`

---

### Task 1.5 — `core/conflict.js` (pure state machine)

**Implement:**

```js
export function createConflictController(initialPolicy) {
  // initialPolicy: 'ask' | 'skip' | 'overwrite'
  let policy = initialPolicy;

  return {
    // Called by engine when target exists.
    // Returns 'skip' | 'overwrite'.
    async resolve({ targetPath }, askUser) {
      if (policy === "skip") return "skip";
      if (policy === "overwrite") return "overwrite";

      // policy === 'ask'
      const choice = await askUser({ targetPath });
      // choice: 'skip' | 'overwrite' | 'skip-all' | 'overwrite-all'
      if (choice === "skip-all") {
        policy = "skip";
        return "skip";
      }
      if (choice === "overwrite-all") {
        policy = "overwrite";
        return "overwrite";
      }
      return choice; // 'skip' | 'overwrite'
    },

    getPolicy: () => policy,
  };
}
```

**Acceptance:**

- Tests at `tools/content-transfer/core/conflict.test.js`:
  - `policy: 'skip'` returns `'skip'` without calling `askUser`
  - `policy: 'overwrite'` returns `'overwrite'` without calling `askUser`
  - `policy: 'ask'` calls `askUser`, returns its result
  - After `askUser` returns `'overwrite-all'`, subsequent calls return `'overwrite'` without asking

---

### Task 1.6 — `core/engine.js` (pure orchestrator)

**Implement `runCopy`** per PLAN.md §9. Signature:

```js
export async function runCopy({
  items, // [{ sourcePath, targetPath, contentType }]
  io, // { readSource, writeSource, targetExists }
  sourceOrg,
  sourceSite,
  targetOrg,
  targetSite,
  conflictController, // from createConflictController
  concurrency = 4,
  onProgress, // ({ index, sourcePath, targetPath, state, error? }) => void
  askConflict, // async ({ targetPath }) => 'skip' | 'overwrite' | 'skip-all' | 'overwrite-all'
  signal, // optional AbortSignal
}) {
  // Returns { copied, skipped, failed }
}
```

**Algorithm:**

1. Spawn `concurrency` workers reading from a shared index.
2. For each item, transition: `queued → checking → (conflict?) → fetching → writing → done | skipped | failed`. Emit `onProgress` on every transition.
3. On conflict: `await conflictController.resolve({ targetPath }, askConflict)`.
4. On `signal.aborted`, workers stop picking up new items; in-flight items finish.
5. Failures are non-fatal — log via `onProgress({ state: 'failed', error })` and continue.

**Acceptance:**

- Tests at `tools/content-transfer/core/engine.test.js`, all using a fake `io`:
  - 3 items, no conflicts → 3 `writeSource` calls
  - 3 items, all conflict, policy `'skip'` → 0 `writeSource` calls
  - 3 items, all conflict, policy `'ask'` returning `'overwrite-all'` on first → 3 `writeSource` calls, `askConflict` called exactly once
  - Failure on `readSource` for one item → other items still complete
  - `signal.abort()` after first completion → remaining items not picked up

---

### Task 1.7 — `core/session.js`

**Implement `createCopySession({ io, onChange })`:**

```js
export function createCopySession({ io, onChange }) {
  let state = initialState();
  const emit = () => onChange(state);

  function set(updater) {
    state = updater(state);
    emit();
  }

  return {
    getState: () => state,

    setSource:  ({ org, site }) => set(s => ({ ...s, source: { ...s.source, org, site, results: [], selected: new Set(), searchMeta: null } })),
    setTarget:  ({ org, site }) => set(s => ({ ...s, target: { ...s.target, org, site } })),
    setMode:    (mode)         => set(s => ({ ...s, target: { ...s.target, mode } })),
    setFolder:  (folder)       => set(s => ({ ...s, target: { ...s.target, folder } })),
    setPreserveSubtree: (b)    => set(s => ({ ...s, target: { ...s.target, preserveSubtree: b } })),
    setConflictPolicy: (p)     => set(s => ({ ...s, target: { ...s.target, conflictPolicy: p } })),
    setSearchTerm: (term)      => set(s => ({ ...s, source: { ...s.source, searchTerm: term } })),
    setFullText: (b)           => set(s => ({ ...s, source: { ...s.source, fullText: b } })),

    async search() { /* uses io.searchPaths; updates results + searchMeta + isSearching */ },

    toggleSelected: (path) => set(s => /* uses selection.toggleSelected */),
    selectAll:      ()     => set(s => /* selection.selectAll(s.source.results.map(r => r.path)) */),
    selectNone:     ()     => set(s => /* selection.selectNone */),
    invertSelection:()     => set(s => /* selection.invertSelection */),

    async run({ askConflict }) {
      // 1. Build items via target-path.resolveTargetPath + deconflictFilenames
      // 2. Build conflictController from state.target.conflictPolicy
      // 3. Call runCopy, threading onProgress into set(...)
      // 4. Update state.run.status throughout
    },

    cancel() { /* triggers AbortController */ },
  };
}
```

**Acceptance:**

- Tests at `tools/content-transfer/core/session.test.js`:
  - `setSource({ org, site })` calls `onChange` with `state.source.org` updated
  - `toggleSelected('/a')` adds `/a` to `state.source.selected`
  - With a fake `io.searchPaths`, `search()` populates `state.source.results`
  - `run({ askConflict })` transitions `state.run.status` `idle → running → done`

---

### Task 1.8 — `core/index.js`

**Re-export public surface:**

```js
export { createCopySession } from "./session.js";
export { runCopy } from "./engine.js";
export { resolveTargetPath, deconflictFilenames } from "./target-path.js";
export { createConflictController } from "./conflict.js";
export { initialState } from "./state.js";
```

**Acceptance:** All exports resolve.

---

### Task 1.9 — `app/copy-io.js`

**Adapter from the shared client to the `io` contract `core/` expects.**

```js
import { createDaClient } from "../../shared/da/index.js";

export function createCopyIo({ token }) {
  const client = createDaClient({ token });

  return {
    // Search — core hands org/site/term/options, we curry through:
    searchPaths: (org, site, term, options) =>
      client.searchPaths(org, site, term, options),

    readSource: (org, site, path) => client.readSource(org, site, path),
    writeSource: (org, site, path, body, contentType) =>
      client.writeSource(org, site, path, body, contentType),
    targetExists: (org, site, path) => client.targetExists(org, site, path),
  };
}
```

**Acceptance:**

- File imports only from `tools/shared/da/index.js`.
- Returns the four-method `io` contract used by `core/engine.js` and `core/session.js`.

---

### Task 1.10 — UI components (Lit)

**Build the six components per PLAN.md §3 (file layout) and §5 (UI/layout).** They follow the existing audit/import-sc patterns: LitElement, `createRenderRoot() { return this }` for components that share styles with the shell, shadow DOM for self-contained ones.

For each component:

- Properties are read-only inputs (no state mutation).
- User input dispatches `CustomEvent('copy-…', { detail, bubbles: true, composed: true })`.
- The shell listens for these events and calls `session.*` methods.

Components to build:

1. `ui/copy-search-bar.js` — org/site/search inputs + "Full text" toggle. Mirrors `audit-search-header.js` without the log-filter section.
2. `ui/copy-results-list.js` — checkbox list. Header row has "Select all / None / Invert". Each row is `<li><label><input type="checkbox">{path}<time>{lastModified}</time></label></li>`. Dispatches `copy-toggle` / `copy-select-all` / `copy-select-none` / `copy-invert`.
3. `ui/copy-target-form.js` — radio group for mode (mirror/folder), folder input, preserve-subtree checkbox, conflict policy radios.
4. `ui/copy-panel.js` — wraps `copy-search-bar` + `copy-results-list` (source mode) OR `copy-target-form` (target mode). Accepts `mode="source"|"target"` and the relevant slice of state.
5. `ui/copy-progress-list.js` — renders `state.run.items` with state badges (queued / checking / fetching / writing / done / skipped / failed). Inline error tooltip on failures.
6. `ui/copy-conflict-dialog.js` — `<dialog>` element. Promise-based: shell awaits the user's choice. Returns `'skip' | 'overwrite' | 'skip-all' | 'overwrite-all'`.

**Acceptance:**

- Each component registers its custom element (`if (!customElements.get(EL_NAME)) customElements.define(...)`).
- No imports from `app/` or `core/state.js`. UI imports from `core/index.js` only if it needs _types_ — but JS has no types so really UI is `core`-blind.
- Use existing tokens from `tools/shared/styles/tool-base.css`; no new design tokens.

---

### Task 1.11 — Shell: `content-transfer.js`, `content-transfer.html`, `content-transfer.css`

**`content-transfer.html`** — Bootstrap, importmap, tool-shell. Model on `tools/audit/audit.html`:

- Title: "Content Transfer"
- Subtitle: "Copy documents between org/sites"
- Includes `spectrum-tokens.css`, `tool-shell.js`, `content-transfer.css`, `content-transfer.js`.

**`content-transfer.css`** — Two-column grid layout. Mobile: stack vertically. Reuse `tool-base.css` tokens.

**`content-transfer.js`** — Thin shell (~120 LOC max):

```js
import { html, LitElement } from "https://da.live/nx/deps/lit/lit-core.min.js";
import DA_SDK from "https://da.live/nx/utils/sdk.js";
import getStyle from "https://da.live/nx/utils/styles.js";

import { createCopySession } from "./core/index.js";
import { createCopyIo } from "./app/copy-io.js";

import "./ui/copy-panel.js";
import "./ui/copy-progress-list.js";
import "./ui/copy-conflict-dialog.js";

import { showToast } from "../shared/components/toast/toast.js";

const EL_NAME = "content-transfer";
const styles = await getStyle(import.meta.url);
const baseStyles = await getStyle(
  new URL("../shared/styles/tool-base.css", import.meta.url).href,
);

class CopyDocs extends LitElement {
  static properties = { _snapshot: { state: true } };

  constructor() {
    super();
    this._snapshot = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [baseStyles, styles];
  }

  bind({ token }) {
    const io = createCopyIo({ token });
    this._session = createCopySession({
      io,
      onChange: (snapshot) => {
        this._snapshot = snapshot;
      },
    });
    this._snapshot = this._session.getState();
  }

  // Translate UI events → session calls
  handleSourceChange(e) {
    this._session.setSource(e.detail);
  }
  handleTargetChange(e) {
    this._session.setTarget(e.detail);
  }
  handleSearch() {
    this._session
      .search()
      .catch((err) => showToast({ variant: "error", message: err.message }));
  }
  handleToggleSelect(e) {
    this._session.toggleSelected(e.detail.path);
  }
  // ... etc

  async handleRun() {
    const askConflict = ({ targetPath }) =>
      this.renderRoot.querySelector("copy-conflict-dialog").ask({ targetPath });
    await this._session.run({ askConflict });
    // toast summary
  }

  render() {
    if (!this._snapshot) return html``;
    return html`
      <div class="copy-shell">
        <copy-panel
          mode="source"
          .state=${this._snapshot.source}
          @copy-source-change=${this.handleSourceChange}
          @copy-search=${this.handleSearch}
          @copy-toggle=${this.handleToggleSelect}
          ...
        ></copy-panel>
        <button
          class="btn btn-primary copy-run-btn"
          @click=${this.handleRun}
          ?disabled=${this._snapshot.source.selected.size === 0}
        >
          Copy → (${this._snapshot.source.selected.size} selected)
        </button>
        <copy-panel
          mode="target"
          .state=${this._snapshot.target}
          .run=${this._snapshot.run}
          @copy-target-change=${this.handleTargetChange}
          ...
        ></copy-panel>
        <copy-conflict-dialog></copy-conflict-dialog>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, CopyDocs);

export default async function init(el) {
  el.replaceChildren();
  const { token } = await DA_SDK;
  const cmp = document.createElement(EL_NAME);
  el.append(cmp);
  cmp.bind({ token });
}

(async () => {
  try {
    const main = document.querySelector("main");
    if (main) await init(main);
  } catch (error) {
    console.error("Failed to initialize content-transfer:", error);
  }
})();
```

**Acceptance:**

- Tool loads at `http://localhost:3000/tools/content-transfer/content-transfer`.
- No console errors.
- Search from source panel works.
- Selecting items + clicking Copy triggers `runCopy` end-to-end.

---

### Task 1.12 — Dashboard card

**File:** `tools/dashboard/dashboard.html`.

**What to do:** Add a third `<article class="spectrum-card">` after the audit card. Pick a distinct gradient/icon (suggest `var(--s2-purple-…)` family for variety). Card title: "Content Transfer". Description: "Copy documents from one organization / site to another." CTA href: `content-transfer/content-transfer`.

**Acceptance:**

- Card visible at `http://localhost:3000/tools/dashboard/dashboard`.
- Clicking "Try it" loads the copy tool.

---

### Task 1.13 — `tools/content-transfer/README.md`

**What to do:** Short user-facing doc. Mirror `tools/audit/README.md` style if it exists; otherwise: what it does, how to use it (search → select → configure target → copy), caveats from PLAN.md §11 (link rewriting, file types).

---

### Phase 1 verification

```bash
npm run lint
node --test tools/content-transfer/core/*.test.js
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

Manual test:

1. Open `/tools/content-transfer/content-transfer`.
2. Enter source org/site, search for a known path. Verify results.
3. Select 2 items.
4. Enter target org/site (use a sandbox site you can write to).
5. Choose "Into folder" mode, folder `/copy-test`, preserve subtree on.
6. Click Copy. Verify both items appear in target under `/copy-test/...`.
7. Run again with same items → conflict dialog appears.
8. Pick "Skip all" → nothing overwritten.

**Do not proceed to Phase 2 until Phase 1 is green.**

---

## Phase 2 — Refactor `tools/audit/` into `core / app / ui`

**Goal:** Audit follows the same layout as content-transfer. Shared `da/` already exists; audit's old `utils/api.js` and `lib/` get split correctly.

### Task 2.1 — Create new directories

```
tools/audit/core/
tools/audit/app/
tools/audit/ui/
```

### Task 2.2 — Move pure modules to `core/`

| From                                  | To                               |
| ------------------------------------- | -------------------------------- |
| `tools/audit/lib/audit-timeline.js`   | `tools/audit/core/timeline.js`   |
| `tools/audit/lib/audit-formatters.js` | `tools/audit/core/formatters.js` |

For each:

- Update imports inside the file (no longer reference `./audit-formatters.js`; reference `./formatters.js`).
- Grep for callers; update their imports.
- Delete the old file from `lib/`.

The old `tools/audit/lib/audit-log-filter.js` was already a shim from Phase 0 — delete it. Update callers to import from `tools/shared/da/index.js`.

**Acceptance:** `tools/audit/lib/` is empty. Delete the empty directory.

---

### Task 2.3 — Build `app/audit-io.js`

```js
import { createDaClient } from "../../shared/da/index.js";

export function createAuditIo({ token }) {
  const client = createDaClient({ token });
  return {
    searchPaths: (org, site, term, options) =>
      client.searchPaths(org, site, term, options),
    fetchAdminLog: (org, site, options) =>
      client.fetchAdminLog(org, site, options),
    fetchVersionTimeline: (org, site, path) =>
      client.fetchVersionTimeline(org, site, path),
    fetchLatestSource: (org, site, path) =>
      client.fetchLatestSource(org, site, path),
    fetchVersionSourceByUrl: (versionUrl) =>
      client.fetchVersionSourceByUrl(versionUrl),
  };
}
```

**Acceptance:** File compiles. No imports from `tools/audit/utils/api.js`.

---

### Task 2.4 — Extract `core/session.js` from `audit.js`

This is the biggest task in Phase 2. The 530-line `audit.js` mixes state + orchestration + render. Goal: extract everything that isn't render or lifecycle into `core/session.js`.

**Procedure:**

1. Create `tools/audit/core/state.js` with `initialState()` returning the current `audit.js` state shape (current properties prefixed with `_`).
2. Create `tools/audit/core/session.js`:
   ```js
   export function createAuditSession({ io, onChange }) {
     let state = initialState();
     // ... methods that match the existing audit.js state mutators:
     //   setOrg, setSite, setSearchTerm, setFullText,
     //   setLogFilterPreview, setLogFilterLive, setLogFrom, setLogTo,
     //   executeSearch (uses io.searchPaths + io.fetchAdminLog),
     //   selectResultPath (uses io.fetchVersionTimeline),
     //   openDiff, closeDiff,
     //   ...
   }
   ```
3. In `audit.js`, replace state properties with a single `_snapshot` state property. Replace all mutators with calls to `this._session.*`. Render reads from `this._snapshot`.

**Acceptance:**

- `audit.js` is ≤120 LOC.
- All search, filter, and timeline logic is in `core/session.js`.
- Tool behavior unchanged (manual verification).

---

### Task 2.5 — Move components to `ui/`

For each file in `tools/audit/components/`, move it to `tools/audit/ui/` and drop the `audit-` prefix (so `audit-search-header.js` → `ui/search-header.js`, etc.). The custom element names (`audit-search-header`) stay the same — those are tags, not file paths.

Update imports in `audit.js` and the components themselves.

Special case for `audit-diff-dialog.js`:

- Move to `tools/audit/ui/diff-dialog.js` as-is.
- The dynamic CDN imports for `diff` and `prettier` stay in this file for now (deferred extraction — see REFACTOR.md §9).

**Acceptance:**

- `tools/audit/components/` is empty. Delete it.
- Tool works (manual verification).

---

### Task 2.6 — Remove backward-compat shim in `utils/api.js`

Delete `tools/audit/utils/api.js`. Update any remaining imports to come from `tools/shared/da/index.js` directly. Delete the empty `tools/audit/utils/` directory.

**Acceptance:**

- `grep -r "audit/utils/api" tools/` returns nothing.
- `tools/audit/utils/` does not exist.

---

### Phase 2 verification

```bash
npm run lint
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

Manual test of audit: search, expand path, open diff dialog, switch diff versions. All must work.

**Do not proceed to Phase 3 until Phase 2 is green.**

---

## Phase 3 — Refactor `tools/import-sc/` into `core / app / ui`

**Goal:** Same shape as audit and content-transfer.

### Task 3.1 — Create new directories

```
tools/import-sc/core/
tools/import-sc/app/
tools/import-sc/ui/
```

### Task 3.2 — Move pure modules to `core/`

| From                                  | To                                   |
| ------------------------------------- | ------------------------------------ |
| `tools/import-sc/utils/validators.js` | `tools/import-sc/core/validators.js` |

`utils/helpers.js` is already a shim — delete it. Update `import-sc.js` to import `debounce` from `tools/shared/utils/debounce.js`.

### Task 3.3 — Build `app/import-io.js`

```js
import { createDaClient } from "../../shared/da/index.js";

const SCHEMA_PATH = "/.da/forms/schemas";

export function createImportIo({ token }) {
  const client = createDaClient({ token });

  return {
    async listSchemas(org, site) {
      const items = await client.listDirectory(org, site, SCHEMA_PATH);
      const schemas = {};
      items.forEach((item) => {
        if (item.name && item.ext === "html") {
          schemas[item.name] = {
            name: item.name,
            path: item.path,
            modified: item.lastModified,
          };
        }
      });
      return schemas;
    },

    async fetchSchemaDoc(schemaPath) {
      // GET the schema HTML, parse <pre><code>, JSON.parse the contents.
      // Pull the parsing out of utils/api.js#fetchSchema and put it here.
    },

    async importToDA(org, site, documentPath, htmlContent) {
      const normalized = normalizeDocumentPath(documentPath);
      const fullPath = normalized.endsWith(".html")
        ? normalized
        : `${normalized}.html`;
      await client.writeSource(org, site, fullPath, htmlContent, "text/html");
      return { url: `https://da.live/form#/${org}/${site}${normalized}` };
    },
  };
}
```

**Acceptance:** No imports from `import-sc/utils/api.js`.

---

### Task 3.4 — Extract `core/session.js` from `import-sc.js`

**Same procedure as audit Task 2.4.** State (schemas, schemaName, schemasLoaded, schemasLoadError, lastValidation, lastImport) and methods (loadSchemas, performValidation, handleImport, etc.) move to `core/session.js`. `import-sc.js` becomes a thin shell.

CodeMirror integration stays in `ui/editor.js` (next task) — `core/session.js` doesn't know about CodeMirror, only about a content getter/setter.

**Editor adapter:**

```js
// Shell provides this to the session:
const editor = {
  getValue: () => /* codeMirrorView.state.doc.toString() */,
  setValue: (v) => /* codeMirrorView.dispatch({ changes: { from: 0, to: …, insert: v } }) */,
};
session.setEditor(editor);
```

`core/session.js` calls `editor.getValue()` when running validation.

**Acceptance:**

- `import-sc.js` ≤ 100 LOC.
- All schema/validation/import logic is in `core/session.js`.
- Tool behavior unchanged.

---

### Task 3.5 — Move + split UI

| From                                          | To                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| (CodeMirror init/lifecycle in `import-sc.js`) | `tools/import-sc/ui/editor.js`                                                                                |
| (form rendering in `import-sc.js`)            | `tools/import-sc/ui/form.js`                                                                                  |
| (result/toast handlers)                       | `tools/import-sc/ui/result-banner.js` (if a dedicated banner is warranted; otherwise keep using shared toast) |

`ui/editor.js` owns the CodeMirror imports and the editor lifecycle. It exposes an editor adapter to the shell.

**Acceptance:**

- Tool works (manual verification).
- `import-sc.js` does not import CodeMirror.

---

### Task 3.6 — Remove `utils/`

Delete `tools/import-sc/utils/` (validators is in core/, helpers was a shim, api is replaced by app/).

---

### Phase 3 verification

```bash
npm run lint
node --test tools/content-transfer/core/*.test.js   # (regression check)
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

Manual test of import-sc: load schemas, validate JSON, import. All must work.

---

## Phase 4 — Cleanup & docs

### Task 4.1 — Verify shared package is clean

- `grep -r "tools/audit/lib" tools/` returns nothing.
- `grep -r "tools/audit/utils" tools/` returns nothing.
- `grep -r "tools/import-sc/utils" tools/` returns nothing.
- `grep -r "tools/import-sc/helpers" tools/` returns nothing.
- Backward-compat shims from Phase 0 are deleted.

### Task 4.2 — Each tool README documents its layout

Each `tools/{tool}/README.md` includes a short "Architecture" section pointing at the three directories and the shared package. Example for content-transfer is already in PLAN.md §3 — adapt for audit and import-sc.

### Task 4.3 — Optional: `tools/shared/da/README.md`

Document the `io` contract, available client methods, and the rule: "Core layers consume `io`, not this package directly."

### Task 4.4 — Optional: PR description template

Each phase PR description includes:

- Phase number + scope from this doc.
- Manual test checklist (the verification commands above).
- Acceptance criteria covered.

---

## Final state

After Phase 4:

```
tools/
├── dashboard/
├── deps/
├── shared/
│   ├── components/        ← unchanged
│   ├── styles/            ← unchanged
│   ├── da/                ← new, all DA I/O lives here
│   └── utils/             ← shared pure helpers
├── audit/
│   ├── core/  app/  ui/   ← new layout
│   ├── audit.{html,css,js}
│   └── README.md
├── import-sc/
│   ├── core/  app/  ui/   ← new layout
│   ├── import-sc.{html,css,js}
│   └── README.md
└── content-transfer/
    ├── core/  app/  ui/   ← born this way
    ├── content-transfer.{html,css,js}
    ├── README.md
    ├── PLAN.md / REFACTOR.md / IMPLEMENTATION.md  ← can stay or move to tools/docs/
    └── ...
```

All tools share `tools/shared/da/`. All tools have testable `core/` modules. UI churn is contained to `ui/`. The copy tool exists.
