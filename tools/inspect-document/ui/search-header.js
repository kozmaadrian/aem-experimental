import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import '../../shared/components/search-query-help/search-query-help.js';

const EL_NAME = 'inspect-search-header';

class InspectSearchHeader extends LitElement {
  static properties = {
    org: { type: String },
    site: { type: String },
    searchTerm: { type: String },
    canSearch: { type: Boolean },
  };

  constructor() {
    super();
    this.org = '';
    this.site = '';
    this.searchTerm = '';
    this.canSearch = false;
  }

  createRenderRoot() { return this; }

  dispatchField(field, event) {
    this.dispatchEvent(new CustomEvent('inspect-field-change', {
      detail: { field, value: event.target.value },
      bubbles: true,
      composed: true,
    }));
  }

  handleSubmit(event) {
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('inspect-search', {
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="header-inner">
        <form
          class="search-bar search-bar--full"
          role="search"
          aria-label="Document search"
          @submit=${this.handleSubmit}
        >
          <label class="search-bar__field" for="inspect-org">
            <span class="field-label">Organization</span>
            <input
              type="text"
              id="inspect-org"
              class="field"
              placeholder="Organization"
              .value=${this.org}
              @input=${(e) => this.dispatchField('org', e)}
              required
            />
          </label>
          <label class="search-bar__field" for="inspect-site">
            <span class="field-label">Site</span>
            <input
              type="text"
              id="inspect-site"
              class="field"
              placeholder="Site"
              .value=${this.site}
              @input=${(e) => this.dispatchField('site', e)}
              required
            />
          </label>
          <label class="search-bar__field" for="inspect-term">
            <span class="search-bar__label-row">
              <span class="field-label">Search</span>
              <search-query-help></search-query-help>
            </span>
            <input
              type="text"
              id="inspect-term"
              class="field field--query search-bar__query"
              placeholder='e.g. /drafts, hero, ~pricing'
              .value=${this.searchTerm}
              @input=${(e) => this.dispatchField('searchTerm', e)}
              required
            />
          </label>
          <button
            type="submit"
            class="btn btn-primary search-submit search-bar__submit"
            ?disabled=${!this.canSearch}
          >Search</button>
        </form>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) customElements.define(EL_NAME, InspectSearchHeader);
