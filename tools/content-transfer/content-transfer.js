import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

import { createCopySession } from './core/session.js';

import './ui/search-header.js';
import './ui/workspace.js';

import { createDaClient } from '../shared/da/index.js';
import { showToast } from '../shared/components/toast/toast.js';

const EL_NAME = 'content-transfer';
const styles = await getStyle(import.meta.url);
const baseStyles = await getStyle(new URL('../shared/styles/tool-base.css', import.meta.url).href);

/**
 * Dry-run mode for testing: intercepts the write call so nothing is mutated on
 * the target server. Reads (search, source fetch, existence check) still run
 * for real. The engine sees a successful write and reports "done".
 *
 * Set to `false` to enable real writes.
 */
const DRY_RUN_WRITES = false;

function wrapIoForDryRun(io) {
  if (!DRY_RUN_WRITES) return io;
  return {
    ...io,
    writeSource: async (org, site, path, body, contentType) => {
      const bodyStr = typeof body === 'string' ? body : '';
      // eslint-disable-next-line no-console
      console.warn('[content-transfer DRY RUN] would write:', {
        targetOrg: org,
        targetSite: site,
        targetPath: path,
        url: `https://admin.da.page/source/${org}/${site}${path}`,
        contentType,
        bodyLength: bodyStr.length,
        bodyPreview: bodyStr.slice(0, 200),
      });
    },
  };
}

class ContentTransfer extends LitElement {
  static properties = {
    token: { attribute: false },
    _snapshot: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [baseStyles, styles];
    if (DRY_RUN_WRITES) {
      // eslint-disable-next-line no-console
      console.warn('[content-transfer] DRY_RUN_WRITES is ON — writes will be logged, not sent.');
    }
    this._session = createCopySession({
      io: wrapIoForDryRun(createDaClient({ token: this.token })),
      onChange: (snapshot) => { this._snapshot = snapshot; },
      notify: showToast,
    });
    this._snapshot = this._session.getState();
  }

  /* --- Event handlers ------------------------------------------------ */

  handleSourceFieldChange(event) {
    const { field, value } = event.detail || {};
    this._session.setSourceField(field, value);
  }

  handleTargetFieldChange(event) {
    const { field, value } = event.detail || {};
    this._session.setTargetField(field, value);
  }

  handleSourceSearch() {
    this._session.search();
  }

  handleToggleSelect(event) {
    this._session.toggleSelected(event.detail.path);
  }

  handleSelectAll() {
    this._session.selectAll();
  }

  handleSelectNone() {
    this._session.selectNone();
  }

  handleRun() {
    this._session.run();
  }

  /* --- Render -------------------------------------------------------- */

  render() {
    const s = this._snapshot;
    if (!s) return html``;

    return html`
      <div
        class="transfer-shell"
        @transfer-source-field-change=${this.handleSourceFieldChange}
        @transfer-target-field-change=${this.handleTargetFieldChange}
        @transfer-source-search=${this.handleSourceSearch}
        @transfer-toggle-select=${this.handleToggleSelect}
        @transfer-select-all=${this.handleSelectAll}
        @transfer-select-none=${this.handleSelectNone}
        @transfer-run=${this.handleRun}
      >
        <header class="transfer-header">
          <transfer-source-header
            .org=${s.source.org}
            .site=${s.source.site}
            .searchTerm=${s.source.searchTerm}
            .canSearch=${this._session.canSearch()}
          ></transfer-source-header>
        </header>
        <main class="transfer-main-area">
          <transfer-workspace
            .source=${s.source}
            .target=${s.target}
            .run=${s.run}
            .canRun=${this._session.canRun()}
          ></transfer-workspace>
        </main>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, ContentTransfer);

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
    console.error('Failed to initialize content-transfer:', error);
  }
})();
