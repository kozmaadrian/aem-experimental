import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';

const EL_NAME = 'inspect-path-list';

function stripExtension(path) {
  if (!path) return '';
  const segments = path.split('/');
  const last = segments[segments.length - 1] || '';
  const stem = last.replace(/\.[^./]+$/, '');
  segments[segments.length - 1] = stem || last;
  return segments.join('/');
}

class InspectPathList extends LitElement {
  static properties = {
    results: { type: Array },
    selectedPath: { type: String },
  };

  constructor() {
    super();
    this.results = [];
    this.selectedPath = '';
  }

  createRenderRoot() { return this; }

  select(path) {
    this.dispatchEvent(new CustomEvent('inspect-select-path', {
      detail: { path },
      bubbles: true,
      composed: true,
    }));
  }

  renderRow(result) {
    const path = result?.path || '';
    if (!path) return '';
    const isSelected = path === this.selectedPath;
    const classes = `inspect-path-row${isSelected ? ' is-selected' : ''}`;
    return html`
      <li class="inspect-sidebar-item" role="listitem">
        <button
          type="button"
          class=${classes}
          aria-pressed=${isSelected}
          title=${path}
          @click=${() => this.select(path)}
        >
          <div class="inspect-path-row__primary">
            <div class="inspect-path-row__path">
              <code>${stripExtension(path)}</code>
            </div>
          </div>
        </button>
      </li>
    `;
  }

  render() {
    const safe = Array.isArray(this.results)
      ? this.results.filter((r) => typeof r?.path === 'string' && r.path)
      : [];
    return html`
      <ul class="inspect-sidebar-list" role="list">
        ${safe.map((r) => this.renderRow(r))}
      </ul>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, InspectPathList);
