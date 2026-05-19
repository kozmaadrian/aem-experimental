import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';

import './path-list.js';
import './target-panel.js';

const EL_NAME = 'transfer-workspace';

class TransferWorkspace extends LitElement {
  static properties = {
    source: { attribute: false },
    target: { attribute: false },
    run: { attribute: false },
    canRun: { type: Boolean },
  };

  constructor() {
    super();
    this.source = null;
    this.target = null;
    this.run = null;
    this.canRun = false;
  }

  createRenderRoot() { return this; }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  renderSidebarHead() {
    const src = this.source || {};
    const results = Array.isArray(src.results) ? src.results : [];
    const selectedCount = (src.selected || []).length;

    return html`
      <div class="panel-head transfer-workspace__cell transfer-workspace__cell--head-sidebar">
        <h2 class="panel-head__title">Matching paths</h2>
        ${results.length > 0 ? html`
          <span class="panel-head__bulk">
            ${selectedCount > 0 ? html`
              <button
                type="button"
                class="transfer-selection"
                title="Clear selection"
                @click=${() => this.emit('transfer-select-none')}
              >
                <svg
                  class="transfer-selection__close"
                  width="10"
                  height="10"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    stroke-linecap="round"
                    d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  />
                </svg>
                <span>${selectedCount} item${selectedCount === 1 ? '' : 's'} selected</span>
              </button>
            ` : ''}
            <button
              type="button"
              class="transfer-link"
              @click=${() => this.emit('transfer-select-all')}
            >Select all</button>
          </span>
        ` : ''}
      </div>
    `;
  }

  renderDetailHead() {
    const target = this.target || {};
    const folder = (target.folder || '/').trim() || '/';
    return html`
      <div class="panel-head transfer-workspace__cell transfer-workspace__cell--head-detail">
        <h2 class="panel-head__title">Copy to</h2>
        <p class="panel-head__sub">
          ${target.org?.trim() && target.site?.trim()
    ? html`<code>/${target.org}/${target.site}${folder === '/' ? '' : folder}</code>`
    : html`Configure target org, site, and folder`}
        </p>
      </div>
    `;
  }

  renderSidebarBody() {
    const src = this.source || {};
    const results = Array.isArray(src.results) ? src.results : [];
    if (src.isSearching) {
      return html`<p class="transfer-pane__empty">Searching…</p>`;
    }
    if (results.length) {
      return html`<transfer-path-list
        .results=${results}
        .selected=${src.selected || []}
      ></transfer-path-list>`;
    }
    return html`<p class="transfer-pane__empty">
      ${src.meta ? 'No matches.' : 'Enter org, site, and a query (prefix, "contains", or both), then Search.'}
    </p>`;
  }

  renderSidebar() {
    return html`
      <section
        class="transfer-pane transfer-pane--sidebar transfer-workspace__cell transfer-workspace__cell--body-sidebar"
        aria-label="Matching paths"
      >
        <div class="panel-scroll panel-scroll--sidebar">
          ${this.renderSidebarBody()}
        </div>
      </section>
    `;
  }

  renderDetail() {
    const src = this.source || {};
    return html`
      <section
        class="transfer-pane transfer-pane--detail transfer-workspace__cell transfer-workspace__cell--body-detail"
        aria-label="Copy configuration and status"
      >
        <transfer-target-panel
          .target=${this.target}
          .run=${this.run}
          .selectedCount=${(src.selected || []).length}
          .canRun=${this.canRun}
        ></transfer-target-panel>
      </section>
    `;
  }

  render() {
    return html`
      <div class="transfer-workspace">
        <div class="transfer-workspace__grid">
          ${this.renderSidebarHead()}
          ${this.renderDetailHead()}
          ${this.renderSidebar()}
          ${this.renderDetail()}
        </div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, TransferWorkspace);
