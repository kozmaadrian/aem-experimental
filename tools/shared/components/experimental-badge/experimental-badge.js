import getStyle from 'https://da.live/nx/utils/styles.js';
import { iconExperimental } from '../icons/icons.js';

const EL_NAME = 'experimental-badge';
const badgeStyles = await getStyle(
  new URL('./experimental-badge.css', import.meta.url).href,
);

class ExperimentalBadge extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [badgeStyles];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get label() {
    return (this.getAttribute('label') || 'experimental').trim() || 'experimental';
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <span class="badge" part="badge" aria-label="Experimental">
        ${iconExperimental()}
        <span class="label">${this.label}</span>
      </span>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, ExperimentalBadge);
}
