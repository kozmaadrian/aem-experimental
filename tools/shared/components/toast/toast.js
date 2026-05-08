import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { iconClose } from '../icons/icons.js';

const EL_NAME = 'tool-toast';
const HOST_ID = 'tool-toast-host';

const VARIANT_SUCCESS = 'success';
const VARIANT_ERROR = 'error';
const VARIANT_WARNING = 'warning';
const VARIANT_INFO = 'info';

const styles = await getStyle(new URL('./toast.css', import.meta.url).href);
const hostSheet = await getStyle(new URL('./toast-host.css', import.meta.url).href);

function ensureHost() {
  if (
    document.adoptedStyleSheets
    && !document.adoptedStyleSheets.includes(hostSheet)
  ) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, hostSheet];
  }
  let hostElement = document.getElementById(HOST_ID);
  if (!hostElement) {
    hostElement = document.createElement('div');
    hostElement.id = HOST_ID;
    hostElement.setAttribute('role', 'region');
    hostElement.setAttribute('aria-label', 'Notifications');
    document.body.append(hostElement);
  }
  return hostElement;
}

function normalizeVariant(variant) {
  const v = String(variant || '').toLowerCase();
  if (v === VARIANT_ERROR || v === 'negative') return VARIANT_ERROR;
  if (v === VARIANT_WARNING) return VARIANT_WARNING;
  if (v === VARIANT_INFO) return VARIANT_INFO;
  return VARIANT_SUCCESS;
}

/**
 * @param {object} opts
 * @param {string} [opts.message]
 * @param {string} [opts.text] - alias of message
 * @param {'success'|'error'|'warning'|'info'} [opts.variant]
 * @param {number} [opts.timeout] - ms, minimum 6000 (Spectrum toast a11y baseline)
 * @param {{ url: string, text: string } | null} [opts.link]
 */
export function showToast({
  message,
  text,
  variant = VARIANT_SUCCESS,
  timeout = 6000,
  link = null,
} = {}) {
  const body = (message ?? text ?? '').trim();
  if (!body || typeof document === 'undefined' || !document.body) return;

  const el = document.createElement(EL_NAME);
  el.message = body;
  el.variant = normalizeVariant(variant);
  el.duration = Math.max(6000, Number(timeout) || 6000);
  if (link?.url && link?.text) {
    el.linkUrl = link.url;
    el.linkText = link.text;
  }
  ensureHost().append(el);
}

export { VARIANT_SUCCESS, VARIANT_ERROR, VARIANT_WARNING, VARIANT_INFO };

class ToolToast extends LitElement {
  static properties = {
    message: { type: String },
    variant: { type: String },
    duration: { type: Number },
    linkUrl: { type: String },
    linkText: { type: String },
  };

  _timerId;

  _isDismissed = false;

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.style.pointerEvents = 'auto';
    const timeoutMs = Math.max(6000, Number(this.duration) || 6000);
    this._timerId = window.setTimeout(() => this.dismiss(), timeoutMs);
  }

  disconnectedCallback() {
    if (this._timerId !== undefined) {
      window.clearTimeout(this._timerId);
      this._timerId = undefined;
    }
    super.disconnectedCallback();
  }

  dismiss() {
    if (this._isDismissed) return;
    this._isDismissed = true;
    if (this._timerId !== undefined) {
      window.clearTimeout(this._timerId);
      this._timerId = undefined;
    }
    this.remove();
  }

  render() {
    const messageText = this.message?.trim();
    if (!messageText) return html``;

    const v = normalizeVariant(this.variant);
    const role = 'alert';
    const hasAction = Boolean(this.linkUrl && this.linkText);

    return html`
      <div class="toast toast-${v}">
        <div class="toast-body" role=${role}>
          <div class="toast-content">
            <div class="toast-message">${messageText}</div>
          </div>
          <div class="toast-actions">
            ${hasAction
    ? html`
                  <a
                    class="toast-btn-secondary"
                    href=${this.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    >${this.linkText}</a
                  >
                `
    : ''}
          </div>
        </div>
        <div class="toast-close-container">
          <button
            type="button"
            class="toast-close-btn"
            aria-label="Close"
            @click=${() => this.dismiss()}
          >
            ${iconClose({ className: 'toast-close-icon' })}
          </button>
        </div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, ToolToast);
}
