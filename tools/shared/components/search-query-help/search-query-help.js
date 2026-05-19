import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { iconInfo } from '../icons/icons.js';
import { SEARCH_QUERY_HELP_SECTIONS } from '../../da/search-query.js';

const EL_NAME = 'search-query-help';
const styles = await getStyle(new URL('./search-query-help.css', import.meta.url).href);
let popoverIdCounter = 0;

class SearchQueryHelp extends LitElement {
  static properties = {
    open: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.open = false;
    popoverIdCounter += 1;
    this._popoverId = `search-query-help-popover-${popoverIdCounter}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this._onDocumentClick = (event) => {
      if (!this.open) return;
      const path = event.composedPath();
      if (!path.includes(this)) this.open = false;
    };
    this._onDocumentKeydown = (event) => {
      if (event.key === 'Escape' && this.open) {
        event.stopPropagation();
        this.open = false;
      }
    };
    document.addEventListener('click', this._onDocumentClick);
    document.addEventListener('keydown', this._onDocumentKeydown);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocumentClick);
    document.removeEventListener('keydown', this._onDocumentKeydown);
    super.disconnectedCallback();
  }

  toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    this.open = !this.open;
  }

  render() {
    return html`
      <button
        type="button"
        class="search-query-help__trigger"
        tabindex="-1"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls=${this._popoverId}
        aria-label="Search filter help"
        title="Search filter help"
        @click=${this.toggle}
      >
        ${iconInfo({ className: 'search-query-help__icon' })}
      </button>
      <div
        id=${this._popoverId}
        class="search-query-help__popover"
        role="dialog"
        aria-label="Search filters"
        ?hidden=${!this.open}
        @click=${(event) => event.stopPropagation()}
      >
        <p class="search-query-help__title">Search filters</p>
        <div class="search-query-help__doc">
          ${SEARCH_QUERY_HELP_SECTIONS.map((section) => html`
            <section class="search-query-help__section">
              <h3 class="search-query-help__heading">${section.title}</h3>
              <p class="search-query-help__text">${section.body}</p>
              ${section.form ? html`
                <p class="search-query-help__form">
                  <code>${section.form}</code>
                </p>
              ` : ''}
            </section>
          `)}
        </div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, SearchQueryHelp);
}
