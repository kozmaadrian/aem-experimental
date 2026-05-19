import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';

const EL_NAME = 'transfer-target-panel';

const STATE_LABEL = {
  queued: 'Queued',
  checking: 'Checking',
  fetching: 'Reading',
  writing: 'Writing',
  done: 'Done',
  skipped: 'Skipped',
  failed: 'Failed',
};

/** Drop the trailing extension from the last path segment. */
function stripExtension(path) {
  if (!path) return '';
  const segments = path.split('/');
  const last = segments[segments.length - 1] || '';
  const stem = last.replace(/\.[^./]+$/, '');
  segments[segments.length - 1] = stem || last;
  return segments.join('/');
}

class TransferTargetPanel extends LitElement {
  static properties = {
    target: { attribute: false }, // snapshot.target
    run: { attribute: false }, // snapshot.run
    selectedCount: { type: Number },
    canRun: { type: Boolean },
  };

  constructor() {
    super();
    this.target = null;
    this.run = null;
    this.selectedCount = 0;
    this.canRun = false;
  }

  createRenderRoot() { return this; }

  dispatchField(field, value) {
    this.dispatchEvent(new CustomEvent('transfer-target-field-change', {
      detail: { field, value },
      bubbles: true,
      composed: true,
    }));
  }

  handleInput(field, event) {
    this.dispatchField(field, event.target.value);
  }

  handleToggle(field, event) {
    this.dispatchField(field, event.target.checked);
  }

  handleRun() {
    this.dispatchEvent(new CustomEvent('transfer-run', { bubbles: true, composed: true }));
  }

  renderStatus() {
    if (!this.run || this.run.status === 'idle') return '';
    const { items, summary, status } = this.run;
    return html`
      <section class="transfer-status">
        <h3 class="transfer-status__title">
          ${status === 'running' ? 'Copying…' : 'Results'}
          ${summary ? html`
            <span class="transfer-status__summary">
              ${summary.copied} copied · ${summary.skipped} skipped · ${summary.failed} failed
            </span>
          ` : ''}
        </h3>
        ${items.length ? html`
          <ul class="transfer-status__list">
            ${items.map((item) => html`
              <li class="transfer-status__item transfer-status__item--${item.state}">
                <span class="transfer-status__badge">${STATE_LABEL[item.state] || item.state}</span>
                <code class="transfer-status__path">${stripExtension(item.targetPath)}</code>
                ${item.error ? html`<span class="transfer-status__error">${item.error}</span>` : ''}
              </li>
            `)}
          </ul>
        ` : ''}
      </section>
    `;
  }

  render() {
    if (!this.target) return html``;
    const {
      org, site, folder, preserveSubtree, overwrite,
    } = this.target;

    return html`
      <div class="panel-scroll panel-scroll--detail">
        <div class="transfer-detail">
          <div class="transfer-detail__row transfer-detail__row--target">
            <label class="transfer-detail__field">
              <span class="field-label">Organization</span>
              <input
                type="text"
                class="field"
                placeholder="Organization"
                .value=${org}
                @input=${(e) => this.handleInput('org', e)}
              />
            </label>
            <label class="transfer-detail__field">
              <span class="field-label">Site</span>
              <input
                type="text"
                class="field"
                placeholder="Site"
                .value=${site}
                @input=${(e) => this.handleInput('site', e)}
              />
            </label>
            <label class="transfer-detail__field">
              <span class="field-label">Target folder</span>
              <input
                type="text"
                class="field"
                placeholder="/path/to/folder"
                .value=${folder}
                @input=${(e) => this.handleInput('folder', e)}
              />
            </label>
          </div>
          <div class="transfer-detail__toggles">
            <label class="switch-control">
              <input
                type="checkbox"
                .checked=${preserveSubtree}
                @change=${(e) => this.handleToggle('preserveSubtree', e)}
              />
              <span class="switch-slider" aria-hidden="true"></span>
              <span class="switch-label">Preserve source structure</span>
            </label>
            <label class="switch-control">
              <input
                type="checkbox"
                .checked=${overwrite}
                @change=${(e) => this.handleToggle('overwrite', e)}
              />
              <span class="switch-slider" aria-hidden="true"></span>
              <span class="switch-label">Overwrite existing</span>
            </label>
            <button
              type="button"
              class="btn btn-primary transfer-detail__action-btn"
              ?disabled=${!this.canRun}
              @click=${this.handleRun}
            >Copy</button>
          </div>
          ${this.renderStatus()}
        </div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, TransferTargetPanel);
