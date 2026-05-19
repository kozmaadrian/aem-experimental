import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import { EditorState } from 'https://esm.sh/@codemirror/state@6';
import { EditorView, lineNumbers } from 'https://esm.sh/@codemirror/view@6';
import { html as htmlLang } from 'https://esm.sh/@codemirror/lang-html@6';
import { json as jsonLang } from 'https://esm.sh/@codemirror/lang-json@6';
import { syntaxHighlighting, defaultHighlightStyle } from 'https://esm.sh/@codemirror/language@6';

import { inferDocumentSourceKind } from '../../shared/utils/format-html.js';

const EL_NAME = 'inspect-source-editor';

function languageExtension(kind) {
  if (kind === 'json') return jsonLang();
  if (kind === 'html') return htmlLang();
  return [];
}

class InspectSourceEditor extends LitElement {
  static properties = {
    value: { type: String },
    pathHint: { type: String },
  };

  constructor() {
    super();
    this.value = '';
    this.pathHint = '';
    this._view = null;
  }

  createRenderRoot() { return this; }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyEditor();
  }

  destroyEditor() {
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
  }

  getEditorExtensions() {
    const kind = inferDocumentSourceKind(this.pathHint, this.value);
    return [
      lineNumbers(),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      syntaxHighlighting(defaultHighlightStyle),
      languageExtension(kind),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '12px',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        },
        '.cm-gutters': {
          backgroundColor: '#f1f5f9',
          color: '#64748b',
          borderRight: '1px solid rgb(15 23 42 / 10%)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#e2e8f0',
        },
        '.cm-content': {
          padding: '12px 0',
        },
        '.cm-line': {
          padding: '0 12px 0 4px',
        },
      }),
    ];
  }

  initEditor() {
    const host = this.querySelector('.inspect-source-editor__host');
    if (!host || this._view) return;

    this._view = new EditorView({
      state: EditorState.create({
        doc: this.value || '',
        extensions: this.getEditorExtensions(),
      }),
      parent: host,
    });
  }

  syncDocument() {
    if (!this._view) return;
    const next = this.value || '';
    const current = this._view.state.doc.toString();
    if (current === next) return;

    const kind = inferDocumentSourceKind(this.pathHint, next);
    const prevKind = inferDocumentSourceKind(this.pathHint, current);
    const languageChanged = kind !== prevKind;

    if (languageChanged) {
      this.destroyEditor();
      this.initEditor();
      return;
    }

    this._view.dispatch({
      changes: { from: 0, to: current.length, insert: next },
    });
  }

  firstUpdated() {
    this.initEditor();
  }

  updated(changed) {
    if (changed.has('value') || changed.has('pathHint')) {
      if (!this._view) {
        this.initEditor();
      } else {
        this.syncDocument();
      }
    }
  }

  render() {
    return html`
      <div
        class="inspect-source-editor"
        role="region"
        aria-label="Formatted document source"
        data-path=${this.pathHint || ''}
      >
        <div class="inspect-source-editor__host"></div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, InspectSourceEditor);
