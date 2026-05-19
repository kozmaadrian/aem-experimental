import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

import { createInspectSession } from './core/session.js';

import './ui/search-header.js';
import './ui/workspace.js';

import { createDaClient } from '../shared/da/index.js';
import { showToast } from '../shared/components/toast/toast.js';

const EL_NAME = 'inspect-document';
const styles = await getStyle(import.meta.url);
const baseStyles = await getStyle(new URL('../shared/styles/tool-base.css', import.meta.url).href);

class InspectDocument extends LitElement {
  static properties = {
    token: { attribute: false },
    _snapshot: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [baseStyles, styles];
    this._session = createInspectSession({
      io: createDaClient({ token: this.token }),
      onChange: (snapshot) => { this._snapshot = snapshot; },
      notify: showToast,
    });
    this._snapshot = this._session.getState();
  }

  handleFieldChange(event) {
    const { field, value } = event.detail || {};
    this._session.setField(field, value);
  }

  handleSearch() {
    this._session.search();
  }

  async handleSelectPath(event) {
    const path = event.detail?.path || '';
    await this._session.selectPath(path);
  }

  handleReloadSource() {
    this._session.reloadSelected();
  }

  render() {
    const s = this._snapshot;
    if (!s) return html``;

    return html`
      <div
        class="inspect-shell"
        @inspect-field-change=${this.handleFieldChange}
        @inspect-search=${this.handleSearch}
        @inspect-select-path=${this.handleSelectPath}
        @inspect-reload-source=${this.handleReloadSource}
      >
        <header class="inspect-header">
          <inspect-search-header
            .org=${s.org}
            .site=${s.site}
            .searchTerm=${s.searchTerm}
            .fullText=${s.fullText}
            .canSearch=${this._session.canSearch()}
          ></inspect-search-header>
        </header>
        <main class="inspect-main-area">
          <inspect-workspace
            .results=${s.results}
            .meta=${s.meta}
            .isSearching=${s.isSearching}
            .selectedPath=${s.selectedPath}
            .document=${s.document}
          ></inspect-workspace>
        </main>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, InspectDocument);

(async () => {
  try {
    const main = document.querySelector('main');
    if (!main) return;
    const { token } = await DA_SDK;
    const cmp = document.createElement(EL_NAME);
    cmp.token = token;
    main.replaceChildren(cmp);
  } catch (error) {
    console.error('Failed to initialize inspect-document:', error);
  }
})();
