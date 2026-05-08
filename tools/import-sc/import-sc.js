import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { debounce } from './utils/helpers.js';
import { validateAgainstSchema } from './utils/validators.js';
import { serialise } from 'https://fix-reusable-serialiser--da-nx--adobe.aem.live/nx/blocks/form/utils/serialise.js';
import { loadSchemas, fetchSchema, importToDA } from './utils/api.js';
import { showToast } from '../shared/components/toast/toast.js';

// Import CodeMirror
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

// Component constants
const EL_NAME = 'import-sc';
const styles = await getStyle(import.meta.url);
const baseStyles = await getStyle(new URL('../shared/styles/tool-base.css', import.meta.url).href);

const NOTIFY_VARIANT = {
  error: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
};

/** @param {{ type: string, message: string, errors?: object[], link?: { url: string, text: string } }} payload */
function notifyImport(payload) {
  const { type, message, errors, link } = payload;
  let text = message || '';
  if (errors?.length) {
    text += `\n${errors.map((e) => `${e.path}: ${e.message}`).join('\n')}`;
  }
  showToast({
    message: text,
    variant: NOTIFY_VARIANT[type] || 'info',
    link: link?.url && link?.text ? link : null,
  });
}

/**
 * Import Structured Content Web Component
 */
class ImportStructuredContent extends LitElement {
  static properties = {
    _context: { state: true },
    _token: { state: true },
    _schemas: { state: true },
    _editor: { state: true },
    _org: { state: true },
    _site: { state: true },
    _documentPath: { state: true },
    _schemaName: { state: true },
    _schemasLoaded: { state: true },
    _schemasLoadError: { state: true },
  };

  constructor() {
    super();
    this._schemas = {};
    this._editor = null;
    this._org = '';
    this._site = '';
    this._documentPath = '';
    this._schemaName = '';
    this._schemasLoaded = false;
    this._schemasLoadError = '';

    // Create debounced schema loader (500ms delay)
    this.debouncedLoadSchemas = debounce(() => this.loadSchemas(), 500);
  }

  /**
   * Returns the DA Schema editor URL, optionally scoped to org/site.
   * @returns {string}
   */
  get schemaEditorUrl() {
    const org = (this._org || '').trim();
    const site = (this._site || '').trim();
    if (!org || !site) return 'https://da.live/apps/schema';
    return `https://da.live/apps/schema#/${encodeURIComponent(org)}/${encodeURIComponent(site)}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [baseStyles, styles];
  }

  /**
   * Lifecycle method called after first render
   * Initializes schemas and CodeMirror editor
   */
  async firstUpdated() {
    await this.loadSchemas();
    this.initCodeMirror();
  }

  /**
   * Loads available schemas from DA API
   * Updates component state with schemas or error message
   */
  async loadSchemas() {
    if (!this._org?.trim() || !this._site?.trim()) {
      this._schemas = {};
      this._schemasLoaded = false;
      this._schemasLoadError = '';
      return;
    }

    const result = await loadSchemas(this._org, this._site, this._token);

    if (result.success) {
      this._schemas = result.schemas;
      this._schemasLoaded = true;
      this._schemasLoadError = '';
    } else {
      this._schemas = {};
      this._schemasLoaded = true;
      this._schemasLoadError = result.error || 'Failed to load schemas.';
    }
  }

  /**
   * Normalizes destination path to ensure a leading slash.
   * @param {string} documentPath
   * @returns {string}
   */
  normalizeDocumentPath(documentPath) {
    const trimmedPath = documentPath?.trim() || '';
    if (!trimmedPath) return '';
    return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  }

  /**
   * Handles input field changes
   * @param {string} field - Field name
   * @param {string} value - Field value
   */
  handleFieldChange(field, value) {
    const normalizedValue = field === 'documentPath'
      ? this.normalizeDocumentPath(value)
      : value;

    this[`_${field}`] = normalizedValue;

    // Reload schemas if org or site changes (debounced)
    if (field === 'org' || field === 'site') {
      this.debouncedLoadSchemas();
    }
  }

  /**
   * Returns CodeMirror editor extensions configuration
   * @returns {Array} Array of CodeMirror extensions
   */
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

  /**
   * Initializes CodeMirror editor with JSON support
   */
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
  }

  /**
   * Gets current content from CodeMirror editor
   * @returns {string} Editor content
   */
  getEditorContent() {
    return this._editor?.state.doc.toString() || '';
  }

  /**
   * Formats validation errors for display
   */
  formatValidationErrors(errors) {
    return errors.map(err => ({
      path: err.path && err.path !== '#' ? err.path : 'Root',
      message: err.message
    }));
  }

  /**
   * Validates JSON against selected schema
   * @returns {Promise<{valid: boolean, data?: object, errors?: array}>}
   */
  async performValidation() {
    if (!this._schemaName) {
      return { valid: false, error: 'Please select a schema first' };
    }

    const schema = this._schemas[this._schemaName];
    if (!schema) {
      return { valid: false, error: 'Selected schema not found' };
    }

    const schemaResult = await fetchSchema(schema.path, this._token);
    if (!schemaResult.success) {
      return { valid: false, error: `Failed to load schema: ${schemaResult.error}` };
    }

    const jsonData = this.getEditorContent();
    const validationResult = validateAgainstSchema(jsonData, schemaResult.schema);

    if (!validationResult.valid) {
      if (validationResult.errors) {
        return {
          valid: false,
          errors: this.formatValidationErrors(validationResult.errors)
        };
      }
      return { valid: false, error: validationResult.error };
    }

    return { valid: true, data: validationResult.data };
  }

  /**
   * Handles validate button click
   * Validates JSON against schema without importing
   */
  async handleValidate() {
    let validation;
    validation = await this.performValidation();

    if (!validation) return;

    if (validation.valid) {
      notifyImport({
        type: 'success',
        message: `JSON is valid and matches the "${this._schemaName}" schema!`,
      });
    } else if (validation.errors) {
      notifyImport({
        type: 'error',
        message: `JSON validation failed against the "${this._schemaName}" schema:`,
        errors: validation.errors,
        link: {
          url: `https://da.live/apps/schema#/${this._org}/${this._site}/.da/forms/schemas/${this._schemaName}`,
          text: 'Edit Schema',
        },
      });
    } else {
      notifyImport({
        type: 'error',
        message: validation.error,
      });
    }
  }

  /**
   * Extracts a title from the destination document path.
   * Uses the final non-empty path segment without a .html suffix.
   * @returns {string}
   */
  getDocumentTitle() {
    const documentPath = this.normalizeDocumentPath(this._documentPath);
    const segments = documentPath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    const title = lastSegment.replace(/\.html$/i, '');
    return title || this._schemaName;
  }

  /**
   * Handles form submission
   * Validates JSON against schema, generates HTML, and imports to DA
   * @param {Event} event - Form submit event
   */
  async handleSubmit(event) {
    event.preventDefault();

    let validation;
    validation = await this.performValidation();

    if (!validation) return;

    if (!validation.valid) {
      if (validation.errors) {
        notifyImport({
          type: 'error',
          message: `JSON validation failed against the "${this._schemaName}" schema:`,
          errors: validation.errors,
          link: {
            url: `https://da.live/apps/schema#/${this._org}/${this._site}/.da/forms/schemas/${this._schemaName}`,
            text: 'Edit Schema',
          },
        });
      } else {
        notifyImport({
          type: 'error',
          message: validation.error,
        });
      }
      return;
    }

    const htmlContent = serialise({
      json: {
        metadata: {
          schemaName: this._schemaName,
          title: this.getDocumentTitle(),
        },
        data: validation.data,
      },
    });
    let result;
    result = await importToDA(this._org, this._site, this._documentPath, htmlContent, this._token);

    if (result?.success) {
      notifyImport({
        type: 'success',
        message: 'Content imported successfully!',
        link: { url: result.url, text: 'View in Editor' },
      });
    } else if (result) {
      notifyImport({
        type: 'error',
        message: `Import failed: ${result.error}`,
      });
    }
  }

  /**
   * Determines if validate button should be enabled
   */
  get canValidate() {
    return Object.keys(this._schemas).length > 0
      && this._org?.trim()
      && this._site?.trim()
      && this._documentPath?.trim()
      && this._schemaName?.trim()
      && this.getEditorContent()?.trim();
  }

  /**
   * Determines if import button should be enabled
   */
  get canImport() {
    if (!this.canValidate) return false;

    // Import requires valid JSON syntax
    try {
      JSON.parse(this.getEditorContent());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Renders a form input field
   */
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

  /**
   * Renders schema select dropdown
   */
  renderSchemaSelect() {
    const schemaNames = Object.keys(this._schemas).sort();
    const hasSchemas = schemaNames.length > 0;
    const org = this._org?.trim() || '';
    const site = this._site?.trim() || '';
    const hasOrgSite = Boolean(org && site);
    const showSchemasStatus = hasOrgSite && this._schemasLoaded && !hasSchemas;
    const scopeText = hasOrgSite ? `"${org}/${site}"` : 'your project';
    const statusText = this._schemasLoadError
      ? `Could not load schemas for ${scopeText}. Check values and try again.`
      : `No schemas found for ${scopeText}.`;

    return html`
      <div class="form-group">
        <label for="schema-name">Schema Name</label>
        <select 
          id="schema-name" 
          name="schemaName"
          .value=${this._schemaName}
          @change=${(e) => this.handleFieldChange('schemaName', e.target.value)}
          ?disabled=${!hasSchemas}
          required
        >
          ${hasSchemas
        ? html`
                <option value="">Select a schema…</option>
                ${schemaNames.map(name => html`<option value="${name}">${name}</option>`)}
              `
        : html`<option value="">—</option>`
      }
        </select>
        ${showSchemasStatus
    ? html`
              <p class="field-help field-help--warning">
                ${statusText}
                Manage schemas in
                <a
                  class="field-help__link"
                  href=${this.schemaEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Schema editor
                </a>.
              </p>
            `
    : html`
              <p class="field-help">
                Manage schemas in
                <a
                  class="field-help__link"
                  href=${this.schemaEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Schema editor
                </a>.
              </p>
            `}
      </div>
    `;
  }

  /**
   * Renders the main component template
   */
  render() {
    return html`
      <div class="container">
        <main>
          <form @submit=${this.handleSubmit}>
            <div class="form-row">
              ${this.renderInput('org', 'Organization', this._org, 'Organization')}
              ${this.renderInput('site', 'Site', this._site, 'Site')}
            </div>

            <div class="form-row">
              ${this.renderSchemaSelect()}
              ${this.renderInput('documentPath', 'Target Document Path', this._documentPath, '/path/to/document')}
            </div>

            <div class="form-group">
              <label for="json-data">JSON Data</label>
              <div class="json-editor"></div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click=${this.handleValidate} ?disabled=${!this.canValidate}>Validate</button>
              <button type="submit" class="btn btn-primary" ?disabled=${!this.canImport}>Import</button>
            </div>
          </form>
        </main>
      </div>
    `;
  }
}

customElements.define(EL_NAME, ImportStructuredContent);

/**
 * Initializes the Import Structured Content component
 * @param {HTMLElement} el - Container element to mount component
 */
export default async function init(el) {
  el.replaceChildren();
  const { context, token } = await DA_SDK;

  let cmp = el.querySelector(EL_NAME);
  if (!cmp) {
    cmp = document.createElement(EL_NAME);
    cmp._context = context;
    cmp._token = token;
    el.append(cmp);
  }
}

// Auto-initialize when script loads
(async () => {
  try {
    const main = document.querySelector('main');
    if (main) {
      await init(main);
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
})();
