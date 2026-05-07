import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

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

function hasVisibleToastWithDedupeKey(dedupeKey) {
  const key = typeof dedupeKey === 'string' ? dedupeKey.trim() : '';
  if (!key) return false;
  const host = document.getElementById(HOST_ID);
  if (!host) return false;
  return Array.from(host.querySelectorAll(EL_NAME)).some(
    (node) => node.dedupeKey === key,
  );
}

/** Remove any visible toast created with this dedupeKey (e.g. dismiss “in progress” before showing result). */
export function dismissToastByDedupeKey(dedupeKey) {
  const key = typeof dedupeKey === 'string' ? dedupeKey.trim() : '';
  if (!key || typeof document === 'undefined') return;
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  for (const node of host.querySelectorAll(EL_NAME)) {
    if (node.dedupeKey === key && typeof node.dismiss === 'function') {
      node.dismiss();
    }
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.message]
 * @param {string} [opts.text] - alias of message
 * @param {'success'|'error'|'warning'|'info'} [opts.variant]
 * @param {number} [opts.timeout] - ms, minimum 6000 (Spectrum toast a11y baseline)
 * @param {{ url: string, text: string } | null} [opts.link]
 * @param {string} [opts.dedupeKey] - if a toast with this key is still in the host, skip
 */
export function showToast({
  message,
  text,
  variant = VARIANT_SUCCESS,
  timeout = 6000,
  link = null,
  dedupeKey = '',
} = {}) {
  const body = (message ?? text ?? '').trim();
  if (!body || typeof document === 'undefined' || !document.body) return;

  const normalizedDedupe = typeof dedupeKey === 'string' ? dedupeKey.trim() : '';
  if (normalizedDedupe && hasVisibleToastWithDedupeKey(normalizedDedupe)) return;

  const el = document.createElement(EL_NAME);
  el.message = body;
  el.variant = normalizeVariant(variant);
  el.duration = Math.max(6000, Number(timeout) || 6000);
  if (normalizedDedupe) {
    el.dedupeKey = normalizedDedupe;
  }
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
    /** Stable id for deduping (not shown); set by showToast */
    dedupeKey: { type: String },
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
    const role = v === VARIANT_ERROR ? 'alert' : 'status';

    return html`
      <div class="toast toast-${v}" role=${role}>
        <div class="toast__body">
          <p class="toast__text">${messageText}</p>
          ${this.linkUrl && this.linkText
        ? html`
                <p class="toast__action">
                  <a
                    href=${this.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    >${this.linkText}</a
                  >
                </p>
              `
        : ''}
        </div>
        <button
          type="button"
          class="toast__close"
          aria-label="Dismiss"
          @click=${() => this.dismiss()}
        >
          <svg
            class="toast__close-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M11.314 10l4.183-4.183a1 1 0 10-1.414-1.414L9.9 8.586 5.717 4.403a1 1 0 00-1.414 1.414L8.486 10l-4.183 4.183a1 1 0 101.414 1.414L9.9 11.414l4.183 4.183a1 1 0 001.414-1.414L11.314 10z"
            />
          </svg>
        </button>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, ToolToast);
}
