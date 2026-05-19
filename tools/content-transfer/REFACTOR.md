# Refactor Analysis — Apply `core / app / ui` to `audit` and `import-sc`

Companion to [PLAN.md](./PLAN.md). The plan defines the three-layer isolation strategy ([§3](./PLAN.md)) borrowed from [da-nx form-v2](https://github.com/adobe/da-nx/blob/form-v2/nx/blocks/form/docs/architecture.md). This document does an X-ray of the two existing tools, identifies what's already in the right shape, and proposes a phased refactor that ends with **one shared `da` package** and **per-tool `core / app / ui` layouts**.

The good news up front: ~70% of the existing code is already pure or already isolated. The work is mostly **moving files** and **extracting one shell-level session**, not rewriting logic.

---

## 1. The pattern, restated in one paragraph

```
shell (entrypoint)  ──┬──→ core/  pure JS, no Lit/DOM/fetch; testable in Node
                      ├──→ app/   browser I/O; implements the `io` contract that core consumes
                      └──→ ui/    Lit components; render snapshots, dispatch intents
ui/   ──→ core/                   (read state, call session methods)
app/  ──→ core/                   (only for shared types / pure helpers)
```

**Rules:** `core/` imports from nothing browser-specific. `ui/` never imports from `app/`. `ui/` never mutates state directly — it calls `session.*` methods on `core/`; `core/` emits via `onChange`; the shell re-renders.

---

## 2. X-ray of `tools/audit/` (today)

| File | LOC | What it actually is | Target layer |
|---|---|---|---|
| `audit.html` | — | Bootstrap markup, importmap | shell |
| `audit.js` | 530 | LitElement root: mixes state, search orchestration, log-filter wiring, dialog state, render | shell + extract to `core/session.js` |
| `utils/api.js` | 406 | `fetchAdminLog`, `fetchVersionTimeline`, `fetchLatestDocumentSource`, `fetchVersionSourceByUrl`, `searchContentPaths` + path helpers (`sanitizeAndNormalizePath`, `encodePath`, `stripKnownContentExtensions`, `normalizeAuditContentKey`) | **Split**: HTTP wrappers → `app/`; path helpers → `core/` (pure) |
| `lib/audit-formatters.js` | 138 | `pathForDisplay`, `formatSmartTime`, `formatDuration`, `parseTimestamp`, `authorsFromEmails`, `formatEventKind` — all pure | `core/` (or `ui/` for display-only ones) |
| `lib/audit-log-filter.js` | 100 | `buildLogPathIndex`, `resultMatchesLogFilter`, `isLogPreviewRoute`, `isLogLiveRoute` — all pure | `core/` |
| `lib/audit-timeline.js` | 140 | `buildVersionEvents`, `buildTimeline`, `buildAuditPayload`, `classifyVersionEvent`, `createLoadingAuditState` — all pure | `core/` |
| `components/audit-search-header.js` | 248 | Lit, render only | `ui/` |
| `components/audit-workspace.js` | 165 | Lit, layout | `ui/` |
| `components/audit-path-list.js` | 72 | Lit, list rendering | `ui/` |
| `components/audit-detail-panel.js` | 95 | Lit, render | `ui/` |
| `components/audit-timeline.js` | 152 | Lit, timeline UI | `ui/` |
| `components/audit-diff-dialog.js` | 765 | Lit + dynamic CDN imports (`diff`, `prettier`) for HTML diffing | **Split**: diff/format engine → `core/diff.js` or `app/diff.js` (CDN load = browser-only, lives in `app/`); UI shell → `ui/` |

### Observations

- **`lib/*.js` is already core/-shaped.** Three files, ~380 LOC of pure JS with deterministic outputs. Moving them is a rename + import-path update.
- **`utils/api.js` mixes two layers.** Half the file is HTTP (`app/`), the other half is path-string math (`core/`). They're already exported separately, so splitting is mechanical.
- **The dialog is the biggest open question.** It dynamically imports `diff@9` and `prettier@3` from CDN. The *use* of diff is browser-specific (CDN URL fetch), so the loader belongs in `app/`. The *interpretation* of diff hunks → render model could be pure (`core/diff-model.js`).
- **`audit.js` is the only file that hasn't been refactored yet.** It holds ~530 lines of state + orchestration that should become `core/session.js` (~200) + a thin shell (~80).

---

## 3. X-ray of `tools/import-sc/` (today)

| File | LOC | What it actually is | Target layer |
|---|---|---|---|
| `import-sc.html` | — | Bootstrap markup | shell |
| `import-sc.js` | 533 | LitElement root: schema list, schema fetch, CodeMirror init, validation, serialization, import POST, toast wiring | shell + extract `core/session.js` |
| `utils/api.js` | 112 | `loadSchemas`, `fetchSchema`, `importToDA` — all HTTP | `app/` |
| `utils/validators.js` | 38 | `validateAgainstSchema` — pure, wraps `@cfworker/json-schema` | `core/` |
| `utils/helpers.js` | 23 | `debounce` — pure | `core/` (or `tools/shared/utils/`) |

### Observations

- **CodeMirror setup is browser-only.** Init, extensions, DOM target — lives in `ui/import-editor.js`. The "get content / set content" API is the seam: `core/` doesn't know it's CodeMirror, only that there's an `editor: { getValue, setValue }` injected.
- **`serialise` is imported from a deployed da-nx URL.** That's an external dep, treat it as `app/`-level (it does HTML↔JSON conversion that may evolve).
- **There's no `lib/` yet** — pure validators live in `utils/` alongside HTTP. After the refactor they go to `core/`.

---

## 4. What's truly shared (the case for `tools/shared/da/`)

These exist (or will exist) in three places: `audit/utils/api.js`, `import-sc/utils/api.js`, `content-transfer/app/`. They're the same code with cosmetic drift.

### 4a. HTTP transport
```js
// Both tools have variations of:
fetchJSON(url, token)     // GET, parse JSON, auth-error mapping
fetchText(url, token)     // GET, return raw body
isAuthenticationStatus(s) // 401 / 403
authenticationErrorMessage()
```
Currently only audit has the polished version (with formatted error logging). import-sc inlines `fetch` calls and uses ad-hoc error handling. **Net duplication: ~80 LOC.**

### 4b. DA endpoints + URL builders
```js
ADMIN_HLX_BASE_URL   = 'https://admin.hlx.page'
ADMIN_DA_LIVE_URL    = 'https://admin.da.live'   // reads
ADMIN_DA_PAGE_URL    = 'https://admin.da.page'   // writes
PREVIEW_BASE_URL     = 'https://da.live'

buildListUrl(org, site, dir)
buildSourceUrl(org, site, path)         // read
buildSourceUrlForWrite(org, site, path) // write
buildVersionListUrl(org, site, path)
buildLogUrl(org, site, ref, range)
```
Currently scattered across both tools. **Net duplication: ~30 LOC + risk of drift** (audit uses `.live`, import-sc uses `.page`).

### 4c. Path normalization
```js
sanitizeAndNormalizePath(path, org, site)
stripKnownContentExtensions(path)
encodePath(path)
normalizeAuditContentKey(path, org, site)
getVersionPath(path, org, site)
getListPath(path, org, site)
normalizeDocumentPath(path)              // import-sc has a simpler variant
```
Audit has the rich set; import-sc duplicates a smaller version. content-transfer needs all of it. **Net duplication: ~80 LOC** with subtle behavior differences (import-sc's version doesn't strip org/site prefixes).

### 4d. Search engine
```js
searchContentPaths(org, site, term, token, options)
```
~110 LOC. **Audit-only today, but content-transfer needs the same thing.** Already pulled out cleanly enough to lift verbatim.

### 4e. Read / write / list operations
```js
listDirectory(org, site, dir, token)
fetchSource(org, site, path, token)
writeSource(org, site, path, body, contentType, token)   // currently only in import-sc
sourceExists(org, site, path, token)                      // content-transfer new
fetchVersionTimeline(org, site, path, token)              // audit
fetchLatestDocumentSource(org, site, path, token)         // audit
fetchVersionSourceByUrl(versionUrl, token)                // audit
fetchAdminLog(org, site, token, range)                    // audit
```
Each tool implements the subset it needs. **Consolidating gives the copy tool `writeSource` for free, and removes duplicate read implementations.**

---

## 5. Proposed shared package: `tools/shared/da/`

```
tools/shared/da/
├── index.js              ← re-exports everything below
├── http.js               ← fetchJSON, fetchText, auth-error helpers
├── endpoints.js          ← URL builder functions + base-URL constants
├── paths.js              ← pure path normalization (no fetch)
├── client.js             ← createDaClient({ token }) → { listDirectory, readSource, writeSource, … }
├── search.js             ← createSearchClient({ token, list, readSource }) → { search }
├── versions.js           ← fetchVersionTimeline, fetchVersionSourceByUrl, fetchLatestDocumentSource
├── log.js                ← fetchAdminLog
└── log-filter.js         ← buildLogPathIndex, resultMatchesLogFilter (pure)
```

**Why a `createDaClient({ token })` factory and not bare functions?**

- The token is captured once in the closure; callers don't thread it through every call.
- This **is** the `io` contract that core/ consumes — making it a factory matches the rest of the architecture.
- Tests substitute a fake client without monkey-patching modules.

**What stays in each tool?**

- Tool-specific orchestration logic (audit timeline shaping, conflict resolution, schema validation flow).
- The `core/session.js` factory that wires the shared client into tool-specific state.
- Anything Lit-specific.

### Important boundary

`tools/shared/da/` is the **app-layer library**. It can use `fetch`. It is *not* part of `core/`. Each tool's `core/` continues to receive an `io` object via its `createSession({ io, … })` factory, and the tool's shell wires `io = createDaClient({ token })` from `shared/da/`.

Pure path helpers (`paths.js`) and the pure log-filter (`log-filter.js`) are an exception — they're safe for `core/` to import directly because they have no I/O.

---

## 6. Target layout per tool

### 6a. `tools/audit/`

```
tools/audit/
├── audit.html
├── audit.css
├── audit.js                       ← thin shell (~80 LOC) — wires io, session, ui
├── README.md
│
├── core/
│   ├── index.js                   ← public exports: createAuditSession, buildTimeline, …
│   ├── session.js                 ← state machine: search, log-filter, expand, diff (~200 LOC)
│   ├── timeline.js                ← moved from lib/audit-timeline.js (pure)
│   ├── log-filter.js              ← thin wrapper around shared/da/log-filter.js
│   ├── formatters.js              ← pure formatters from lib/audit-formatters.js
│   └── diff-model.js              ← (extracted from audit-diff-dialog) pure: diff-hunk → render model
│
├── app/
│   ├── audit-io.js                ← wraps shared/da/{client,versions,log} → tool-specific io shape
│   └── diff-loader.js             ← dynamic CDN loader for diff + prettier (browser-only)
│
└── ui/
    ├── search-header.js
    ├── workspace.js
    ├── path-list.js
    ├── detail-panel.js
    ├── timeline.js                ← Lit component
    └── diff-dialog.js             ← Lit shell; diff math comes from core/diff-model.js
```

**Net effect:** `audit.js` shrinks from 530 → ~80 LOC. ~380 LOC of `lib/*.js` is renamed + relocated. ~250 LOC of `utils/api.js` is replaced by `shared/da/` imports.

### 6b. `tools/import-sc/`

```
tools/import-sc/
├── import-sc.html
├── import-sc.css
├── import-sc.js                   ← thin shell
├── README.md
│
├── core/
│   ├── index.js                   ← createImportSession, validateAgainstSchema
│   ├── session.js                 ← state: schemas, selected schema, validation result, last import
│   ├── validators.js              ← moved from utils/validators.js (pure)
│   └── helpers.js                 ← debounce et al
│
├── app/
│   ├── import-io.js               ← wraps shared/da/client for schemas + import POST
│   └── serialise.js               ← thin adapter around the da-nx serialise URL import
│
└── ui/
    ├── form.js                    ← org/site/path/schema inputs
    ├── editor.js                  ← CodeMirror lifecycle (browser-only)
    └── result-banner.js           ← success / error states
```

**Net effect:** `import-sc.js` shrinks from 533 → ~70 LOC. CodeMirror init moves into a dedicated `ui/editor.js`. Validation flow gets a session so the same logic could be driven by a CLI/MCP server later.

### 6c. `tools/content-transfer/` (new — already specced in PLAN.md)

Already follows `core / app / ui`. The only adjustment to PLAN.md is: **drop `app/da-io.js` from the content-transfer tree** and `import { createDaClient } from '../shared/da/index.js'` instead. The copy-specific `io` becomes a thin adapter over the shared client.

---

## 7. Migration plan

The refactor is risky if done in one shot. Stage it.

### Phase 0 — Extract shared infrastructure (no behavior change)
1. Create `tools/shared/da/` with `http.js`, `endpoints.js`, `paths.js`.
2. Move audit's `searchContentPaths`, `fetchAdminLog`, `fetchVersionTimeline`, etc. into `tools/shared/da/`. Re-export from `audit/utils/api.js` for backward compat so the audit code keeps working.
3. Move audit's `lib/audit-log-filter.js` → `tools/shared/da/log-filter.js`.
4. Move `import-sc/utils/api.js` HTTP calls into the shared client.

**Outcome:** No tool reorganization yet, but a single source of truth for DA HTTP and path helpers exists.

### Phase 1 — Refactor `content-transfer` from day one against the shared package
Build the new tool directly on `tools/shared/da/`. Use it as the proving ground for the `createDaClient` shape before retrofitting older tools. This is the cheapest validation: the API gets exercised by real new code, not just imagined use cases.

### Phase 2 — Refactor `audit/` into `core / app / ui`
1. Rename `lib/` → `core/` (audit-specific renames at the same time).
2. Split `utils/api.js`: pure path helpers → `core/paths.js` (or remove if shared/paths.js suffices); HTTP wrappers → `app/audit-io.js`.
3. Extract state machine from `audit.js` → `core/session.js` with `createAuditSession({ io, onChange })`.
4. Rename `components/` → `ui/`, update import paths.
5. Extract diff math from `audit-diff-dialog.js` → `core/diff-model.js`; loader → `app/diff-loader.js`.

### Phase 3 — Refactor `import-sc/` into `core / app / ui`
1. Rename `utils/validators.js` → `core/validators.js`.
2. Split `utils/api.js` → `app/import-io.js` (use shared client).
3. Extract editor lifecycle → `ui/editor.js`. Define an editor adapter interface (`{ getValue, setValue, focus }`) so `core/session.js` doesn't depend on CodeMirror.
4. Extract state machine from `import-sc.js` → `core/session.js`.

### Phase 4 — Verify and document
- Add a Node test for each tool's `core/` against a fake `io` (covers the bulk of orchestration logic without a browser).
- Update each tool's README with the same architecture diagram.
- Optionally write a short `tools/shared/da/README.md` documenting the client contract.

Each phase ships independently. The tools work unchanged after Phase 0; users see no difference. Phases 2 and 3 are independent and can land in either order.

---

## 8. What this buys us

1. **Reuse without re-implementation.** `content-transfer` doesn't reinvent search, paths, HTTP, auth handling, or write operations. Future tools (e.g. a bulk-publish app, a content-linter) start from the same client.
2. **Testability.** Each tool's `core/` is unit-testable in Node. Today, every test of audit's timeline construction or import-sc's validation flow either runs in a browser or is skipped.
3. **Drift containment.** Today `audit` uses `admin.da.live` and `import-sc` uses `admin.da.page` — that's fine, but only one place to fix when the backend story changes.
4. **Headless surfaces.** `core/audit-session.js` and `core/import-session.js` become importable by CLI scripts, MCP servers, or AI agents — same goal stated in the da-nx form-v2 doc.
5. **UI refresh affordance.** When Spectrum tokens evolve or a designer wants a different layout, the refactor stays in `ui/`. No risk of touching state or I/O code.

---

## 9. Risks and trade-offs

| Risk | Mitigation |
|---|---|
| `audit.js` is 530 LOC of intertwined state — extracting `session.js` may take 2–3 passes | Do it last, after the shared client is proven by `content-transfer`. Use the existing `_field` state names as the snapshot shape so the diff is mostly relocation. |
| `audit-diff-dialog.js` (765 LOC) is the hairiest file — splitting it is itself a project | Treat the diff-dialog refactor as its own follow-up; Phase 2 can land without it (leave the dialog as-is, just move it to `ui/`). |
| Render-root convention is mixed: some audit components use shadow DOM (`adoptedStyleSheets`), some use `createRenderRoot() { return this }` | Don't try to unify in this refactor. Each component keeps its current root strategy; styling stays scoped however it was. |
| `tools/shared/da/` has no test harness today | Set one up in Phase 0 (vitest or plain `node --test`). Worth the small upfront cost — every subsequent phase benefits. |
| Backward-compat re-exports during Phase 0 create temporary "two ways to import" — easy to miss when grepping | Time-box the deprecation: re-exports live for one PR, removed in the same series. |

---

## 10. TL;DR

- **70% of existing code is already in the right shape**, just in the wrong directories. `lib/audit-*` is pure → `core/`; `utils/api.js` is I/O → `app/`; `components/*` is Lit → `ui/`.
- **The biggest wins come from extracting `tools/shared/da/`**: one HTTP client, one set of endpoints, one path normalizer, one search engine. Both existing tools shrink; the new copy tool gets it for free.
- **The remaining work is splitting each tool's mega-component** (`audit.js`, `import-sc.js`) into a thin shell + a `core/session.js`. That's the only place real logic moves.
- **Sequence:** ship shared package first (Phase 0), use content-transfer to validate the API (Phase 1), then retrofit audit and import-sc independently (Phases 2 & 3).
