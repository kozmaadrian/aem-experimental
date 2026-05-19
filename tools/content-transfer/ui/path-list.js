import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';

const EL_NAME = 'transfer-path-list';

/** Strip the trailing file extension from the last segment, like audit's pathForDisplay. */
function stripExtension(path) {
  if (!path) return '';
  const segments = path.split('/');
  const last = segments[segments.length - 1] || '';
  const stem = last.replace(/\.[^./]+$/, '');
  segments[segments.length - 1] = stem || last;
  return segments.join('/');
}

class TransferPathList extends LitElement {
  static properties = {
    results: { type: Array },
    selected: { type: Array },
  };

  constructor() {
    super();
    this.results = [];
    this.selected = [];
  }

  createRenderRoot() { return this; }

  toggle(path) {
    this.dispatchEvent(new CustomEvent('transfer-toggle-select', {
      detail: { path },
      bubbles: true,
      composed: true,
    }));
  }

  renderRow(result) {
    const path = result?.path || '';
    if (!path) return '';
    const isSelected = this.selected.includes(path);
    const classes = `transfer-path-row${isSelected ? ' is-selected' : ''}`;
    return html`
      <li class="transfer-sidebar-item" role="listitem">
        <div
          class=${classes}
          role="button"
          tabindex="0"
          aria-pressed=${isSelected}
          title=${path}
          @click=${() => this.toggle(path)}
        >
          <div class="transfer-path-row__primary">
            <input
              type="checkbox"
              class="transfer-path-row__check"
              .checked=${isSelected}
              @click=${(e) => e.stopPropagation()}
              @change=${() => this.toggle(path)}
            />
            <div class="transfer-path-row__path">
              <code>${stripExtension(path)}</code>
            </div>
          </div>
        </div>
      </li>
    `;
  }

  render() {
    const safe = Array.isArray(this.results)
      ? this.results.filter((r) => typeof r?.path === 'string' && r.path)
      : [];
    return html`
      <ul class="transfer-sidebar-list" role="list">
        ${safe.map((r) => this.renderRow(r))}
      </ul>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, TransferPathList);
