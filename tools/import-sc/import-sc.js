import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { serialise } from 'https://fix-reusable-serialiser--da-nx--adobe.aem.live/nx/blocks/form/utils/serialise.js';
// CodeMirror — browser-only, lives in the shell since it owns the DOM editor.
import { EditorState } from 'https://esm.sh/@codemirror/state@6';
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from 'https://esm.sh/@codemirror/view@6';
import { defaultKeymap, history, historyKeymap } from 'https://esm.sh/@codemirror/commands@6';
import { json, jsonParseLinter } from 'https://esm.sh/@codemirror/lang-json@6';
import { linter, lintGutter } from 'https://esm.sh/@codemirror/lint@6';
import { syntaxHighlighting, defaultHighlightStyle } from 'https://esm.sh/@codemirror/language@6';

import { createImportSession } from './core/session.js';
import { createImportIo } from './app/import-io.js';
import { debounce } from '../shared/utils/debounce.js';
import { showToast } from '../shared/components/toast/toast.js';

const EL_NAME = 'import-sc';
const styles = await getStyle(import.meta.url);
const baseStyles = await getStyle(new URL('../shared/styles/tool-base.css', import.meta.url).href);

class ImportStructuredContent extends LitElement {
  static properties = {
    token: { attribute: false },
    _snapshot: { state: true },
  };

  constructor() {
    super();
    this.debouncedLoadSchemas = debounce(() => this._session?.loadSchemas(), 500);
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [baseStyles, styles];
    this._session = createImportSession({
      io: createImportIo({ token: this.token }),
      serialise,
      notify: showToast,
      onChange: (snapshot) => { this._snapshot = snapshot; },
    });
    this._snapshot = this._session.getState();
  }

  async firstUpdated() {
    await this._session.loadSchemas();
    this.initCodeMirror();
  }

  /* --- CodeMirror lifecycle (DOM-only) ------------------------------- */

  getCodeMirrorExtensions() {
    return [
      cmPlaceholder('Paste your JSON content here'),
      lineNumbers(),
      lintGutter(),
      history(),
      json(),
      linter(jsonParseLinter()),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.requestUpdate();
        }
      }),
    ];
  }

  initCodeMirror() {
    const editorElement = this.shadowRoot.querySelector('.json-editor');
    if (!editorElement) return;
    this._editor = new EditorView({
      state: EditorState.create({
        doc: '{}',
        extensions: this.getCodeMirrorExtensions(),
      }),
      parent: editorElement,
    });
    this._session?.setEditor({
      getValue: () => this._editor?.state.doc.toString() || '',
    });
  }

  /* --- UI → core ----------------------------------------------------- */

  handleFieldChange(field, value) {
    this._session?.setField(field, value);
    if (field === 'org' || field === 'site') {
      this.debouncedLoadSchemas();
    }
  }

  async handleValidate() {
    await this._session?.validate();
  }

  async handleSubmit(event) {
    event.preventDefault();
    await this._session?.importDocument();
  }

  /* --- Render -------------------------------------------------------- */

  renderInput(id, label, value, placeholder = '') {
    return html`
      <div class="form-group">
        <label for="${id}">${label}</label>
        <input
          type="text"
          id="${id}"
          name="${id}"
          .value=${value}
          placeholder="${placeholder}"
          @input=${(e) => this.handleFieldChange(id, e.target.value)}
          required
        />
      </div>
    `;
  }

  renderSchemaSelect() {
    const s = this._snapshot;
    const schemaNames = Object.keys(s.schemas).sort();
    const hasSchemas = schemaNames.length > 0;
    const org = s.org?.trim() || '';
    const site = s.site?.trim() || '';
    const hasOrgSite = Boolean(org && site);
    const showSchemasStatus = hasOrgSite && s.schemasLoaded && !hasSchemas;
    const scopeText = hasOrgSite ? `"${org}/${site}"` : 'your project';
    const statusText = s.schemasLoadError
      ? `Could not load schemas for ${scopeText}. Check values and try again.`
      : `No schemas found for ${scopeText}.`;
    const schemaUrl = this._session?.schemaEditorUrl() || 'https://da.live/apps/schema';

    return html`
      <div class="form-group">
        <label for="schema-name">Schema Name</label>
        <select
          id="schema-name"
          name="schemaName"
          .value=${s.schemaName}
          @change=${(e) => this.handleFieldChange('schemaName', e.target.value)}
          ?disabled=${!hasSchemas}
          required
        >
          ${hasSchemas
    ? html`
                <option value="">Select a schema…</option>
                ${schemaNames.map((name) => html`<option value="${name}">${name}</option>`)}
              `
    : html`<option value="">—</option>`}
        </select>
        ${showSchemasStatus
    ? html`
              <p class="field-help field-help--warning">
                ${statusText}
                Manage schemas in
                <a class="field-help__link" href=${schemaUrl} target="_blank" rel="noopener noreferrer">
                  Schema editor
                </a>.
              </p>
            `
    : html`
              <p class="field-help">
                Manage schemas in
                <a class="field-help__link" href=${schemaUrl} target="_blank" rel="noopener noreferrer">
                  Schema editor
                </a>.
              </p>`}
      </div>
    `;
  }

  render() {
    const s = this._snapshot;
    if (!s) return html``;

    const canValidate = this._session?.canValidate() ?? false;
    const canImport = this._session?.canImport() ?? false;

    return html`
      <div class="container">
        <main>
          <form @submit=${this.handleSubmit}>
            <div class="form-row">
              ${this.renderInput('org', 'Organization', s.org, 'Organization')}
              ${this.renderInput('site', 'Site', s.site, 'Site')}
            </div>

            <div class="form-row">
              ${this.renderSchemaSelect()}
              ${this.renderInput('documentPath', 'Target Document Path', s.documentPath, '/path/to/document')}
            </div>

            <div class="form-group">
              <label for="json-data">JSON Data</label>
              <div class="json-editor"></div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary"
                      @click=${this.handleValidate} ?disabled=${!canValidate}>
                Validate
              </button>
              <button type="submit" class="btn btn-primary" ?disabled=${!canImport}>
                Import
              </button>
            </div>
          </form>
        </main>
      </div>
    `;
  }
}

customElements.define(EL_NAME, ImportStructuredContent);

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
    console.error('Failed to initialize app:', error);
  }
})();
