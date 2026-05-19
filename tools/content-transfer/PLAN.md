# Content Transfer — Plan

A new experimental tool that lets a user copy documents from one DA org/site (source) into another DA org/site (target).

The UI is a two-panel layout:

- **Left panel** = source (search + multi-select).
- **Right panel** = target (destination configuration + copy progress).
- A center action lets the user copy the selected items from source → target.
- Direction is one-way (source → target). No reverse copy in this iteration.

This plan covers scope, architecture, file layout, API behavior, UI, copy semantics, error handling, and a few open questions / ideas for later.

---

## 1. Goals & non-goals

### In scope (v1)
- Two side-by-side panels (source / target), each with its own `org` + `site`.
- Path / full-text search in the **source** panel, identical to the audit tool's search (path segment or full text).
- Multi-select of search results in the source panel with checkboxes + "select all / none / inverse".
- Copy action with two modes:
  - **Mirror structure** — recreate each selected path under the target site at the same path.
  - **Target folder** — place all selected items under a specified folder on the target (flattened by source filename, optionally preserving relative subtree — see §7).
- Per-item progress (queued / copying / done / failed) and a summary toast at the end.
- Conflict handling: detect if the target path already exists, prompt for "skip / overwrite / overwrite all / skip all".

### Out of scope (v1)
- Reverse direction (target → source).
- Cross-account auth (assumes the signed-in DA user has access to both org/sites).
- Recursive folder copy (only the items the user explicitly selected from search are copied; if the user wants a folder, they search for it and select all matches).
- Copying versions / history — only the current source is copied.
- Copying media/assets referenced by the docs (links inside the HTML are copied verbatim and may still point at the source site — see §11 open questions).

---

## 2. How it fits into `tools/`

Current architecture (from `tools/`):

```
tools/
├── audit/            ← LitElement app, /source + /list + /versionlist
├── dashboard/        ← landing page with cards
├── deps/
├── import-sc/        ← POSTs HTML to admin.da.page /source
└── shared/
    ├── components/   ← tool-shell, toast, alert-banner, icons
    └── styles/       ← spectrum-tokens.css, tool-base.css
```

The new tool follows the same shell conventions:
- Web component (`LitElement`) registered as `<content-transfer>`.
- Hosted under `tools/content-transfer/` with `content-transfer.html` / `.css` / `.js`.
- Uses `tool-shell` chrome, `spectrum-tokens.css`, `tool-base.css`, `showToast`, and icons from `shared/components`.
- Auth comes from `DA_SDK` (same as audit and import-sc) — single token used for both source and target sites (they share the same DA backend).
- Registered as a card in `tools/dashboard/dashboard.html`.

The internal structure follows the same **core / app / ui** isolation pattern used by [da-nx's form block](https://github.com/adobe/da-nx/blob/form-v2/nx/blocks/form/docs/architecture.md) (see §3 for layering rules).

---

## 3. Layering: `core/`, `app/`, `ui/`

To keep logic testable and reusable (CLI scripts, MCP servers, AI agents, future tools), the implementation splits into three layers with a strict dependency direction.

### Allowed dependency flow

```
content-transfer.js (shell) → core/   (state, orchestration, pure logic)
content-transfer.js (shell) → app/    (DA I/O, browser-only adapters)
content-transfer.js (shell) → ui/     (Lit components)
ui/                  → core/   (read state, dispatch intents)
app/                 → core/   (only for shared types/helpers)
```

### Rules (mirrors da-nx form-v2)

- **NEVER** let `ui/` import from `app/`. UI components don't know about `fetch`, tokens, or DA endpoints.
- **NEVER** let `ui/` mutate state directly. UI calls `session.*` methods on `core/`; `core/` calls its `onChange` callback after every transition; the shell re-renders.
- **NEVER** let `core/` import from `ui/` or `app/`. `core/` has no Lit, no DOM, no `fetch`, no browser globals. It must run in plain Node and be testable standalone.
- **ALWAYS** keep I/O injectable. `core/` receives `readSource`, `writeSource`, `listDirectory`, `targetExists` as constructor arguments (`createCopySession({ io, ... })`). `app/` provides the real implementations; tests provide mocks.

### What lives where

| Layer    | Concerns                                                                          | Allowed to use                |
|----------|-----------------------------------------------------------------------------------|-------------------------------|
| `core/`  | Selection model, target-path resolution, conflict state machine, copy queue/engine, validation, immutable state snapshots, `onChange` emission | Plain JS only. No Lit, no DOM, no `fetch`, no `window`. |
| `app/`   | DA API calls (`/list`, `/source` read/write), token plumbing, response normalization, browser path/URL helpers | `fetch`, `URL`, `FormData`, etc. Imports types/helpers from `core/`. |
| `ui/`    | Lit components, rendering, user-input handlers that translate events → core intents | Lit, DOM, shared components, `core/` (read-only + intents). Never imports from `app/`. |
| shell (`content-transfer.js`) | Wires `app/` adapters into `createCopySession(...)`, holds the current snapshot, passes it down to `ui/`, forwards UI intents into core. | All of the above. |

### Why this matters here

- The copy engine (`runCopy`) is the most testable thing in this tool. Keeping it pure means we can write unit tests with fake I/O for things like "conflict resolution applies `overwrite-all` to remaining items", "concurrency stays at N", "cancel stops new work but lets in-flight finish" — without spinning up a browser or hitting DA.
- The same `core/` can be driven by a future CLI (`node content-transfer.mjs --from a/b --to c/d`) without dragging Lit along.
- UI churn (Spectrum tokens change, designers want a different layout) never forces edits in `core/` or `app/`.

---

## 4. File layout

```
tools/content-transfer/
├── content-transfer.html              ← bootstrap markup, tool-shell, importmap
├── content-transfer.css               ← layout-only styles (grid for two panels)
├── content-transfer.js                ← shell: wires app/ I/O into core, renders ui/
├── README.md                   ← short user doc, matches audit/README.md style
│
├── core/                       ← headless. No Lit, no DOM, no fetch.
│   ├── index.js                ← public API: createCopySession, runCopy, resolveTargetPath, …
│   ├── session.js              ← createCopySession({ io, onChange }) — selection + target config + run state
│   ├── selection.js            ← pure helpers: toggle, selectAll, invert, derive selected items
│   ├── target-path.js          ← pure: resolveTargetPath(sourcePath, mode, folder, preserveSubtree)
│   ├── conflict.js             ← conflict policy state machine ('ask' | 'skip' | 'overwrite' [+ -all variants])
│   ├── engine.js               ← runCopy({ items, io, concurrency, onProgress, resolveConflict })
│   └── state.js                ← immutable snapshot shape + reducers
│
├── app/                        ← browser-specific I/O. Adapts DA APIs to the core's `io` contract.
│   ├── da-io.js                ← createDaIo({ token }) returns { listDirectory, searchPaths, readSource, targetExists, writeSource }
│   ├── da-endpoints.js         ← URL builders + constants (admin.da.live vs admin.da.page)
│   └── path.js                 ← sanitizeAndNormalizePath, encodePath, stripKnownContentExtensions (browser-side normalization)
│
└── ui/                         ← Lit components. Render snapshots, dispatch intents.
    ├── copy-panel.js           ← reusable side panel (mode="source" | "target")
    ├── copy-search-bar.js      ← org / site / search input + "full text" toggle (trimmed audit-search-header)
    ├── copy-results-list.js    ← checkbox list of search hits; select-all / none / invert
    ├── copy-target-form.js     ← copy-mode radios, folder input, conflict policy default
    ├── copy-progress-list.js   ← per-item progress rows
    └── copy-conflict-dialog.js ← modal for skip/overwrite/skip-all/overwrite-all
```

### Core API sketch

```js
// core/index.js
export function createCopySession({ io, onChange }) {
  // io: { listDirectory, searchPaths, readSource, targetExists, writeSource }
  // returns:
  //   session.setSource({ org, site })
  //   session.setTarget({ org, site })
  //   session.search(term, { fullText })           → async, updates state, fires onChange
  //   session.toggleSelected(path)
  //   session.selectAll() / selectNone() / invertSelection()
  //   session.setMode('mirror' | 'folder')
  //   session.setFolder(path) / setPreserveSubtree(bool)
  //   session.setConflictPolicy('ask' | 'skip' | 'overwrite')
  //   session.run({ resolveConflict })             → async, drives engine.js, fires onChange on every state transition
  //   session.cancel()
  //   session.getState()                            → immutable snapshot
}

export function resolveTargetPath(sourcePath, { mode, folder, preserveSubtree }) { /* pure */ }
export function runCopy({ items, io, concurrency, onProgress, resolveConflict }) { /* pure orchestrator */ }
```

### Snapshot shape (read-only, passed to `ui/`)

```js
{
  source:  { org, site, searchTerm, fullText, results, selected: Set<string>, isSearching, searchMeta },
  target:  { org, site, mode, folder, preserveSubtree, conflictPolicy },
  run:     { status: 'idle'|'running'|'done'|'cancelled', items: [{ sourcePath, targetPath, state, error? }], summary },
}
```

### Reuse notes

- `copy-panel.js` is the same component on both sides; behavior diverges based on a `mode` prop (`"source"` vs `"target"`).
- The audit tool's `searchContentPaths` is generic. We extract it (and its path helpers) into `tools/shared/utils/da-content.js` and use it from `app/da-io.js`. See §12.

---

## 5. UI / layout

### Top-level shell
```
┌──────────────────────────────────────────────────────────────────────────┐
│ tool-shell: "Content Transfer"   subtitle: "Copy documents between org/sites"   │
├────────────────────────────┬─────────────────────────────────────────────┤
│ Source panel               │ Target panel                                │
│ ─────────────              │ ─────────────                               │
│ [Org] [Site] [Search]  🔍  │ [Org] [Site]                                │
│ □ Full text                │                                             │
│                            │ Copy mode                                   │
│ ┌──────────────────────┐   │  ( ) Mirror source structure                │
│ │ ☑ /products/foo      │   │  ( ) Into folder: [/imports/2026-05      ]  │
│ │ ☑ /products/bar      │   │       □ Preserve relative subtree           │
│ │ ☐ /blog/2026/intro   │   │                                             │
│ │ ☐ /index             │   │ Conflict default                            │
│ │  …                   │   │  ( ) Ask each time                          │
│ └──────────────────────┘   │  ( ) Skip existing                          │
│ 12 of 240 scanned · 1.2s   │  ( ) Overwrite                              │
│                            │                                             │
│         ┌─────────────────────────────────┐                              │
│         │      Copy →   (n selected)      │  ← center action button      │
│         └─────────────────────────────────┘                              │
│                            │                                             │
│                            │ Copy progress                               │
│                            │ ┌──────────────────────────────────────┐    │
│                            │ │ ⏳ /products/foo → /imports/2026/… │      │
│                            │ │ ✅ /products/bar → /imports/2026/… │      │
│                            │ │ ❌ /blog/intro    → ...  (409)     │      │
│                            │ └──────────────────────────────────────┘    │
└────────────────────────────┴─────────────────────────────────────────────┘
```

### Responsive
- Desktop (≥1200px): true side-by-side grid (`grid-template-columns: 1fr 1fr`).
- Tablet (900–1199px): keep side-by-side but reduce paddings, allow the lists to scroll independently.
- Mobile (<900px): stack vertically (target panel collapses below source); the "Copy →" button reads "Copy to target ↓".

### Styling
- Reuse `tool-base.css` field/button/switch tokens. No new design tokens.
- Add `content-transfer.css` only for the two-column grid, panel framing, progress row styles, and the center action region.

---

## 6. Search behavior (left panel)

Mirrors the audit tool to keep UX consistent:
- Inputs: `org`, `site`, `searchTerm`, optional `fullTextSearch` toggle.
- UI dispatches `session.search(term, { fullText })`. The session calls `io.searchPaths(...)` (provided by `app/da-io.js`, which wraps the shared `searchContentPaths` helper) and updates the snapshot.
- Shows the same "N of M scanned in Xs" footer line.
- **Does not** include the Helix preview/live log filters (out of scope — copy doesn't care about publish state).
- Results: each row has a checkbox + path + last-modified time. Clicking the row toggles selection (`session.toggleSelected(path)`). A header row offers "Select all (filtered) / None / Invert".
- Selection lives in `core/`. The shell re-renders on `onChange`; resetting org/site clears selection there.

---

## 7. Copy semantics & target configuration

### Modes (radio on the right panel)
1. **Mirror source structure** (default)
   - Each selected source path `/a/b/c.html` is written to `https://admin.da.page/source/{targetOrg}/{targetSite}/a/b/c.html`.
   - No flattening, no rewriting of relative URLs inside the doc.

2. **Into folder** — user provides a target folder (e.g. `/imports/2026-05`).
   - Sub-option **Preserve relative subtree** (default: on):
     - On: `/a/b/c.html` → `/imports/2026-05/a/b/c.html` (relative subtree under the chosen folder).
     - Off: flatten — `/a/b/c.html` → `/imports/2026-05/c.html`. Filename collisions are resolved by appending `-2`, `-3`, … (warn in toast if any rename happens).

Path resolution is implemented as `resolveTargetPath(sourcePath, { mode, folder, preserveSubtree })` in `core/target-path.js` — pure, fully unit-testable, no I/O.

### Conflict policy (radio)
- `ask` (default): pause and prompt via `copy-conflict-dialog` ("Path already exists. Skip / Overwrite / Skip all / Overwrite all"). Choice can apply to remaining items in the batch.
- `skip`: don't ask, never overwrite.
- `overwrite`: don't ask, always overwrite.

The state machine lives in `core/conflict.js`; the UI never owns the policy directly.

### Existence check
- Before writing, the engine calls `io.targetExists(path)` (provided by `app/`). The browser adapter implements it by listing the parent and looking for the filename (reliable + cacheable). See §11 for whether DA supports `HEAD /source/...`.
- The adapter caches parent listings so sibling items don't re-list.

---

## 8. App layer — the `io` contract

`core/` never touches the network. It receives an `io` object whose methods return promises. `app/da-io.js` builds the browser-side implementation; tests build a fake.

### Contract (consumed by `core/`)

```js
{
  listDirectory(org, site, dirPath)             → Promise<Array<{ path, ext, lastModified }>>
  searchPaths(org, site, term, { fullText, … })  → Promise<{ results, scanned }>
  readSource(org, site, path)                    → Promise<{ body: string, contentType: string }>
  targetExists(org, site, path)                  → Promise<boolean>
  writeSource(org, site, path, body, contentType) → Promise<void>
}
```

### Browser implementation (`app/da-io.js`)

`createDaIo({ token })` returns the object above by wrapping DA endpoints:

| Operation     | Endpoint                                          | Method | Notes                                         |
|---------------|---------------------------------------------------|--------|-----------------------------------------------|
| List dir      | `admin.da.live/list/{org}/{site}/{dir}`           | GET    | Already used by audit                         |
| Search        | (client-side over `/list` + `/source`)            | —      | Reuses shared `searchContentPaths` helper     |
| Fetch source  | `admin.da.live/source/{org}/{site}{path}`         | GET    | Already used by audit                         |
| Target exists | `admin.da.live/list/{org}/{site}/{parent}`        | GET    | Cached per `(org, site, parent)` for the run  |
| Write source  | `admin.da.page/source/{org}/{site}{path}`         | POST   | multipart `data` blob (mirrors import-sc)     |

> Note: audit uses `admin.da.live`, import-sc uses `admin.da.page`. These hit the same backend; reads stay on `.live` (consistent with audit), writes go to `.page` (consistent with import-sc).

The token is captured in the adapter closure; **`core/` never sees it**. This keeps "what DA endpoints exist" and "what auth scheme to use" entirely inside `app/`.

---

## 9. Copy engine (`core/engine.js`)

Pure async orchestrator. No DOM, no `fetch`, no `token`. Everything I/O comes in via `io`.

```js
runCopy({
  items,                 // [{ sourcePath, targetPath, contentType }]
  io,                    // the contract from §8
  sourceOrg, sourceSite,
  targetOrg, targetSite,
  conflictPolicy,        // 'ask' | 'skip' | 'overwrite'
  concurrency = 4,
  onProgress,            // ({ index, sourcePath, targetPath, state, error? }) => void
  resolveConflict,       // async ({ targetPath }) => 'skip' | 'overwrite' | 'skip-all' | 'overwrite-all'
  signal,                // optional AbortSignal for cancel
})
```

States per item: `queued → checking → (conflict?) → fetching → writing → done | skipped | failed`.

The engine:
- Walks `items` with `concurrency` workers.
- Calls `io.targetExists`. If found and policy is `ask`, awaits `resolveConflict`. Updates the policy if user picks `*-all`.
- Calls `io.readSource` on the source, then `io.writeSource` on the target.
- Surfaces every state change via `onProgress` so `core/session.js` can update the snapshot and the shell can re-render.

The Lit layer (`ui/copy-conflict-dialog.js`) is wired into `resolveConflict` by the shell — `core/` only knows it as an async callback returning one of the four strings.

### Testability

Because `core/` doesn't import `fetch` or `Lit`, a unit test can do:

```js
const io = {
  listDirectory: async () => [],
  searchPaths:   async () => ({ results: [], scanned: 0 }),
  readSource:    async () => ({ body: '<html/>', contentType: 'text/html' }),
  targetExists:  async () => true,        // simulate every target exists
  writeSource:   async () => {},
};
await runCopy({
  items: [{ sourcePath: '/a', targetPath: '/b' }],
  io,
  conflictPolicy: 'ask',
  resolveConflict: async () => 'skip-all',
  onProgress: log,
});
// assert no writeSource calls happened
```

…running in plain Node, no JSDOM needed.

---

## 10. Progress, errors & UX details

- During a copy run the source panel disables interaction; the target panel shows the live progress list.
- Failures are non-fatal — the run continues; final toast says e.g. *"Copied 9 of 11. 1 skipped, 1 failed."* with a link to expand the progress list.
- "Cancel" button on the right side aborts the run (workers stop picking up new items; in-flight requests are allowed to finish to avoid corrupt state).
- All errors are surfaced via the shared `showToast` helper; authentication failures use the same wording as audit (`authenticationErrorMessage()`).
- Path display normalizes the same way as the audit tool (`pathForDisplay`, strips known extensions).

---

## 11. Things to confirm before coding

1. **Existence check primitive.** Confirm whether DA admin supports `HEAD /source/...` (cheap) or whether we should always list the parent dir. The latter works today, just costs one extra request per unique parent.
2. **Binary docs.** Source listing returns `.html`, `.json`, `.svg`, `.md` as "searchable" — but copy should support any file under `/source` of the source site, including images uploaded by the author. Decide v1 scope: HTML/JSON/MD only, or all file types the listing surfaces?
3. **Link rewriting.** When copying `/products/foo.html` from `org-a/site-a` to `org-b/site-b`, internal links in the HTML still resolve via Helix host — they'll point at `*.aem.live` URLs of the original site. We can either (a) leave them alone in v1 and document the caveat, or (b) add a "rewrite host references" post-processing step. **Recommendation:** (a) for v1; revisit if it bites.
4. **Auth scope.** Confirm a single DA token actually grants write access to multiple org/sites the user belongs to. (Probably yes since `DA_SDK` returns a user-scoped token, not a site-scoped one.)
5. **Same org+site copy.** Should we allow source == target? Useful for duplicating documents within one site (e.g. into a `drafts/` folder). **Recommendation:** allow it; just require the resolved target path to differ from the source path or trigger conflict policy.

---

## 12. Suggested cross-cutting refactor (optional, can defer)

The search code in `tools/audit/utils/api.js` (`searchContentPaths`, `sanitizeAndNormalizePath`, `normalizeListResponse`, etc.) is generic. Suggest extracting:

```
tools/shared/utils/da-content.js  ← search, list, source helpers
```

…and re-exporting from `audit/utils/api.js` for backward compat. The copy tool would then `import { searchContentPaths } from '../shared/utils/da-content.js'` with no duplication.

This refactor is not strictly required for v1 but is worth doing during the content-transfer work since we'd otherwise copy ~150 lines of search code.

---

## 13. Implementation order (suggested)

Work bottom-up — core/ first, then app/, then ui/. Each layer is verifiable before the next is started.

1. **core/** — `target-path.js`, `selection.js`, `conflict.js`, `state.js`, `engine.js`, `session.js`. Drive with Node-only tests using a fake `io`.
2. **app/da-io.js** — implement the `io` contract against DA endpoints. Smoke-test by wiring a tiny script that lists a known directory.
3. **shared/** — (optional) extract `searchContentPaths` into `tools/shared/utils/da-content.js`; consumed by `app/da-io.js` and `audit/utils/api.js`.
4. **Scaffold** — `content-transfer.html` / `.css` / shell `content-transfer.js` that creates the session and renders an empty layout.
5. **ui/copy-panel** — both modes; consume snapshot, dispatch intents.
6. **ui/copy-search-bar + copy-results-list** for the source panel.
7. **ui/copy-target-form** + run/cancel button on the right panel.
8. **ui/copy-progress-list** + **ui/copy-conflict-dialog**.
9. **Dashboard card** + `README.md` + demo content path.
10. Polish responsive layout + error states.

---

## 14. Ideas for later (post-v1)

- **Bulk download** (zip of selected source docs) as an alternative to copy.
- **Dry-run** mode that lists target paths + conflict status without writing anything.
- **Copy with versioning** — also copy the version history via `/versionlist` + `/version/...` POSTs (if DA exposes a write endpoint for versions).
- **Multi-tab target** — copy the same selection to several targets at once.
- **Cross-direction** — once we trust the flow, allow swapping the panels and copying right → left, with a clear "swap" affordance.
- **Saved presets** — remember "from org-a/site-a → org-b/site-b under /imports/" as a named preset stored in `localStorage`.
- **Link rewriting** — optional post-processing step that rewrites absolute `*.aem.live` hosts in the copied HTML to point at the new org/site.
