import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';

import './path-list.js';
import './source-panel.js';

const EL_NAME = 'inspect-workspace';

class InspectWorkspace extends LitElement {
  static properties = {
    results: { type: Array },
    meta: { attribute: false },
    isSearching: { type: Boolean },
    selectedPath: { type: String },
    document: { attribute: false },
  };

  constructor() {
    super();
    this.results = [];
    this.meta = null;
    this.isSearching = false;
    this.selectedPath = '';
    this.document = null;
  }

  createRenderRoot() { return this; }

  renderSidebarHead() {
    const { meta } = this;
    const sub = meta
      ? `${meta.matches} path${meta.matches === 1 ? '' : 's'} · ${Math.round(meta.durationMs)} ms`
      : '';

    return html`
      <div class="panel-head inspect-workspace__cell inspect-workspace__cell--head-sidebar">
        <h2 class="panel-head__title">Matching paths</h2>
        ${sub ? html`<p class="panel-head__sub">${sub}</p>` : ''}
      </div>
    `;
  }

  renderDetailHead() {
    const path = this.selectedPath?.trim() || '';
    return html`
      <div class="panel-head inspect-workspace__cell inspect-workspace__cell--head-detail">
        <h2 class="panel-head__title">Document source</h2>
        <p class="panel-head__sub">
          ${path
    ? html`<code>${path}</code>`
    : html`Select a path to load HTML from DA source.`}
        </p>
      </div>
    `;
  }

  renderSidebarBody() {
    const results = Array.isArray(this.results) ? this.results : [];
    if (this.isSearching) {
      return html`<p class="inspect-pane__empty">Searching…</p>`;
    }
    if (results.length) {
      return html`<inspect-path-list
        .results=${results}
        .selectedPath=${this.selectedPath}
      ></inspect-path-list>`;
    }
    return html`<p class="inspect-pane__empty">
      ${this.meta ? 'No matches.' : 'Enter org, site, and a query (prefix, "contains", or both), then Search.'}
    </p>`;
  }

  render() {
    return html`
      <div class="inspect-workspace">
        <div class="inspect-workspace__grid">
          ${this.renderSidebarHead()}
          ${this.renderDetailHead()}
          <section
            class="inspect-pane inspect-pane--sidebar inspect-workspace__cell inspect-workspace__cell--body-sidebar"
            aria-label="Matching paths"
          >
            <div class="panel-scroll panel-scroll--sidebar">
              ${this.renderSidebarBody()}
            </div>
          </section>
          <section
            class="inspect-pane inspect-pane--detail inspect-workspace__cell inspect-workspace__cell--body-detail"
            aria-label="Document HTML source"
          >
            <div class="panel-scroll panel-scroll--detail">
              <inspect-source-panel
                .selectedPath=${this.selectedPath}
                .document=${this.document}
              ></inspect-source-panel>
            </div>
          </section>
        </div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, InspectWorkspace);
