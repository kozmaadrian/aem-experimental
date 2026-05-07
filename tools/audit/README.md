# Audit Explorer

> **Audit Explorer** is an experimental web tool for **Document Authoring (DA)** and **AEM / Helix** repositories. It helps teams find content paths (including via **full-text search**), review **version history** alongside optional **Helix admin log** context, and **diff** two revisions of the same document.

---

## Overview

The tool takes **organization**, **site**, and **search** input. Matching paths appear in a list; selecting a path opens a **timeline** that combines **versionlist** data with **admin log** events when log access and filters allow. **Organization** and **site** are typed by the user and are **not** prefilled from the DA SDK context.

---

## At a glance

| | |
|--|--|
| **Purpose** | Content discovery, version timeline, optional log correlation, version diff |
| **Auth** | DA SDK bearer token (`https://da.live/nx/utils/sdk.js`) |
| **Primary hosts** | `admin.da.live` (content, versions, listings), `admin.hlx.page` (Helix admin log) |

---

## Features

### Search

Path-based matching (segments / filenames) and optional **full-text search** over source for supported types (e.g. HTML, JSON, SVG, Markdown). Full-text mode is intended for finding pages by **text inside the document**, then reviewing **history** (versions and logs) for that path.

### Audit timeline

For each hit, the tool loads **version history** and, when log data is available, merges **Helix admin log** lines into one timeline according to active filters (see [Behavior](#behavior)).

### Diff

Any two stored versions can be compared by loading each revision’s **source** (see [DA Source API](https://docs.da.live/developers/api/source)).

---

## Authentication

All backend calls use:

`Authorization: Bearer <token>`

The token is supplied by the **DA SDK**. Org and site are **user-supplied** for each session.

---

## Data sources

| Capability | HTTP | Notes |
|------------|------|--------|
| Helix admin log | `GET https://admin.hlx.page/log/{org}/{site}/{ref}?from=&to=` | Default `ref`: `main`. Time range required. |
| Version history | `GET https://admin.da.live/versionlist/{org}/{site}/…` | Per-document timeline. |
| Document source | `GET https://admin.da.live/source/{org}/{site}/…` | Current or historical URLs (including from versionlist). |
| Directory listing | `GET https://admin.da.live/list/{org}/{site}/…` | Used to scope search. |

Normative API documentation: see [External links](#external-links).

---

## Helix admin log access

Reading `admin.hlx.page` **log** data usually requires **extra org/site entitlements** in addition to normal DA sign-in.

If the log cannot be retrieved or is empty for the request, **preview/live and datetime log filters do nothing useful**, and the UI shows **version history only**. See [Behavior](#behavior).

---

## Behavior

- **Path normalization** — Inputs such as full URLs, different prefixes, or extension variants are normalized so **search hits**, **version paths**, and log **`path` / `paths`** fields stay comparable.
- **Log filtering** — Options such as preview vs. live and datetime bounds apply **only** when log entries were loaded successfully. Otherwise, see [Helix admin log access](#helix-admin-log-access).

---

## Running locally

Run the repo with the **AEM app** and **`aem up`** (or equivalent), then open Audit Explorer with **`ref=local`**, e.g. `https://da.live/app/kozmaadrian/aem-experimental/tools/audit/audit?ref=local` — substitute your GitHub org and repo in the path as needed.

---

## External links

- [AEM Live admin API — log](https://www.aem.live/docs/admin.html#tag/log)
- [AEM Live admin API — versionlist](https://www.aem.live/docs/admin.html#tag/versionlist)
- [DA Source API](https://docs.da.live/developers/api/source)
- [DA List API](https://docs.da.live/developers/api/list)
- [DA SDK module](https://da.live/nx/utils/sdk.js) (script URL used by the tool)
