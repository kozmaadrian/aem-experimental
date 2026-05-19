import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

import { createAuditSession } from './core/session.js';
import { formatDuration } from './core/formatters.js';

import './ui/search-header.js';
import './ui/workspace.js';
import './ui/diff-dialog.js';

import { createDaClient } from '../shared/da/index.js';
import { iconProgressCircle } from '../shared/components/icons/icons.js';
import { showToast } from '../shared/components/toast/toast.js';

const EL_NAME = 'content-audit';
const styles = await getStyle(import.meta.url);
const baseStyles = await getStyle(new URL('../shared/styles/tool-base.css', import.meta.url).href);

class ContentAudit extends LitElement {
  static properties = {
    token: { attribute: false },
    _snapshot: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [baseStyles, styles];
    this._session = createAuditSession({
      io: createDaClient({ token: this.token }),
      onChange: (snapshot) => { this._snapshot = snapshot; },
      notify: showToast,
    });
    this._snapshot = this._session.getState();
  }

  /* --- UI → core ----------------------------------------------------- */

  handleFieldChangeEvent(event) {
    const { field, value } = event?.detail || {};
    if (typeof field !== 'string') return;
    this._session.setField(field, value);
  }

  handleFullTextChange(event) {
    const nextValue = typeof event?.detail?.value === 'boolean'
      ? event.detail.value
      : !this._snapshot.fullTextSearch;
    this._session.setField('fullTextSearch', nextValue);
  }

  async handleSearchSubmit() {
    await this._session.executeSearch();
  }

  async handleSelectPath(event) {
    const path = event?.detail?.path || '';
    await this._session.selectResultPath(path);
  }

  async handleRefreshTimeline(event) {
    const path = event?.detail?.path || '';
    if (!path || path !== this._snapshot.expandedPath) return;
    await this._session.loadTimelineForPath(path);
  }

  handleOpenDiff(event) {
    const versionId = typeof event?.detail?.versionId === 'string'
      ? event.detail.versionId
      : '';
    this._session.openDiff({ versionId });
  }

  handleCloseDiffDialog() {
    this._session.closeDiffDialog();
  }

  /* --- Render -------------------------------------------------------- */

  renderSearchLoading() {
    if (!this._snapshot?.isSearching) return '';
    return html`
      <div class="audit-empty-layout search-loading" role="status" aria-live="polite" aria-busy="true">
        <div class="empty-card">
          <div class="audit-detail-state">
            <div class="audit-detail-state__figure">${iconProgressCircle()}</div>
            <p class="audit-detail-state__message audit-detail-state__message--loading">
              Searching content paths...
            </p>
          </div>
        </div>
      </div>
    `;
  }

  renderSearchMeta() {
    const meta = this._snapshot?.searchMeta;
    if (!meta) return '';
    if (!(meta.matches === 0 && meta.scanned != null)) return '';
    return html`
      <div class="search-meta search-meta--center">
        Found ${meta.matches} of ${meta.scanned} scanned files
        in ${formatDuration(meta.durationMs)}.
      </div>
    `;
  }

  renderSearchWorkspace() {
    const s = this._snapshot;
    if (!s?.searchMeta || !s.searchResults.length) return '';

    return html`
      <audit-workspace
        .searchResults=${s.searchResults}
        .selectedPath=${s.expandedPath}
        .selectedAudit=${this._session?.selectedAudit() || null}
        @audit-select-path=${this.handleSelectPath}
        @audit-refresh-timeline=${this.handleRefreshTimeline}
        @audit-open-diff=${this.handleOpenDiff}
      ></audit-workspace>
    `;
  }

  render() {
    const s = this._snapshot;
    if (!s) return html``;

    return html`
      <div class="audit-shell">
        <header class="audit-header">
          <audit-search-header
            .org=${s.org}
            .site=${s.site}
            .searchTerm=${s.searchTerm}
            .fullTextSearch=${s.fullTextSearch}
            .logFrom=${s.logFrom}
            .logTo=${s.logTo}
            .logFilterPreview=${s.logFilterPreview}
            .logFilterLive=${s.logFilterLive}
            .canSearch=${this._session?.canSearch() ?? false}
            @audit-field-change=${this.handleFieldChangeEvent}
            @audit-full-text-change=${this.handleFullTextChange}
            @audit-search-submit=${this.handleSearchSubmit}
          ></audit-search-header>
        </header>
        <main class="audit-main-area">
          ${this.renderSearchLoading()}
          ${this.renderSearchMeta()}
          ${this.renderSearchWorkspace()}
        </main>
        <audit-diff-dialog
          .open=${s.isDiffOpen}
          .path=${s.diffPath}
          .versions=${s.diffVersions}
          .requestedVersionId=${s.requestedDiffVersionId}
          .fetchLatest=${this._session?.fetchDiffLatest}
          .fetchVersion=${this._session?.fetchDiffVersion}
          @audit-close-diff=${this.handleCloseDiffDialog}
        ></audit-diff-dialog>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, ContentAudit);
}

// Auto-initialize when script loads.
(async () => {
  try {
    const main = document.querySelector('main');
    if (!main) return;
    const { token } = await DA_SDK;
    const cmp = document.createElement(EL_NAME);
    cmp.token = token;
    main.replaceChildren(cmp);
  } catch (error) {
    console.error('Failed to initialize audit app:', error);
  }
})();
