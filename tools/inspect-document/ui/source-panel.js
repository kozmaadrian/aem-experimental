import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import { iconProgressCircle } from '../../shared/components/icons/icons.js';
import './source-editor.js';

const EL_NAME = 'inspect-source-panel';

class InspectSourcePanel extends LitElement {
  static properties = {
    selectedPath: { type: String },
    document: { attribute: false },
  };

  constructor() {
    super();
    this.selectedPath = '';
    this.document = null;
  }

  createRenderRoot() { return this; }

  emitReload() {
    this.dispatchEvent(new CustomEvent('inspect-reload-source', {
      bubbles: true,
      composed: true,
    }));
  }

  renderError(message) {
    return html`
      <div class="inspect-source-state inspect-source-state--error" role="alert">
        <p class="inspect-source-state__message">${message}</p>
        <button type="button" class="btn btn-secondary" @click=${() => this.emitReload()}>
          Retry
        </button>
      </div>
    `;
  }

  renderSource(body, contentType) {
    return html`
      <div class="inspect-source-meta">
        <span class="inspect-source-meta__type">${contentType || 'text/html'}</span>
        <span class="inspect-source-meta__size">${body.length.toLocaleString()} characters</span>
        <button
          type="button"
          class="inspect-link"
          @click=${() => this.emitReload()}
        >Reload</button>
      </div>
      <inspect-source-editor
        class="inspect-source-editor-wrap"
        .value=${body}
        .pathHint=${this.selectedPath}
      ></inspect-source-editor>
    `;
  }

  render() {
    const path = this.selectedPath?.trim() || '';
    if (!path) {
      return html`
        <p class="inspect-pane__empty">
          Select a document from the list to view its HTML source.
        </p>
      `;
    }

    const doc = this.document || {};
    if (doc.isLoading) {
      return html`
        <div class="inspect-source-state" role="status" aria-live="polite" aria-busy="true">
          <div class="inspect-source-state__figure">${iconProgressCircle()}</div>
          <p class="inspect-source-state__message">Loading and formatting source…</p>
        </div>
      `;
    }
    if (doc.error) return this.renderError(doc.error);
    if (!doc.body) {
      return html`<p class="inspect-pane__empty">No source returned for this path.</p>`;
    }
    return this.renderSource(doc.body, doc.contentType);
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, InspectSourcePanel);
