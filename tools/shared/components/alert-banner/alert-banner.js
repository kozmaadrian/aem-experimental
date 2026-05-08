import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { iconAlert, iconClose, iconInfo } from '../icons/icons.js';

const EL_NAME = 'tool-alert-banner';
const styles = await getStyle(new URL('./alert-banner.css', import.meta.url).href);

function normalizeVariant(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'negative' || v === 'error') return 'negative';
  if (v === 'info' || v === 'informative') return 'info';
  return 'neutral';
}

function renderIcon(variant) {
  // Mirror SWC behavior: icon for info/negative, none for neutral.
  if (variant === 'info') {
    return iconInfo({ className: 'type', label: 'Information' });
  }
  if (variant === 'negative') {
    return iconAlert({ className: 'type', label: 'Error' });
  }
  return html``;
}

class ToolAlertBanner extends LitElement {
  static properties = {
    variant: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    dismissible: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    this.variant = 'neutral';
    this.open = false;
    this.dismissible = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this.handleKeydown);
    super.disconnectedCallback();
  }

  /**
   * Public API parity with SWC: close programmatically.
   */
  close() {
    this.shouldClose();
  }

  shouldClose() {
    if (!this.open) return;
    const event = new CustomEvent('close', { cancelable: true });
    const allowed = this.dispatchEvent(event);
    if (!allowed) return;
    this.open = false;
  }

  handleKeydown = (event) => {
    if (!this.open) return;
    if (!this.dismissible) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.shouldClose();
    }
  };

  render() {
    const variant = normalizeVariant(this.variant);
    return html`
      <div class="body" role="alert">
        <div class="content">
          ${renderIcon(variant)}
          <div class="text"><slot></slot></div>
        </div>
        <slot name="action"></slot>
      </div>
      <div class="end">
        ${this.dismissible
    ? html`
            <button
              type="button"
              class="close"
              aria-label="Close"
              @click=${this.shouldClose}
            >
              ${iconClose({ className: 'close-icon' })}
            </button>
          `
    : html``}
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, ToolAlertBanner);
}
