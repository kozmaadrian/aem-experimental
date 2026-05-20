import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import { iconFilter } from '../../shared/components/icons/icons.js';
import '../../shared/components/search-query-help/search-query-help.js';

const EL_NAME = 'audit-search-header';

class AuditSearchHeader extends LitElement {
  static properties = {
    org: { type: String },
    site: { type: String },
    searchTerm: { type: String },
    logFrom: { type: String },
    logTo: { type: String },
    logFilterPreview: { type: Boolean },
    logFilterLive: { type: Boolean },
    canSearch: { type: Boolean },
    _filtersOpen: { state: true },
  };

  constructor() {
    super();
    this.org = '';
    this.site = '';
    this.searchTerm = '';
    this.logFrom = '';
    this.logTo = '';
    this.logFilterPreview = false;
    this.logFilterLive = false;
    this.canSearch = false;
    this._filtersOpen = false;
  }

  createRenderRoot() {
    return this;
  }

  dispatchAuditEvent(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  handleSubmit(event) {
    event.preventDefault();
    this.dispatchAuditEvent('audit-search-submit');
  }

  handleFieldInput(field, event) {
    this.dispatchAuditEvent('audit-field-change', {
      field,
      value: event.target.value,
    });
  }

  handleLogPreviewChange(event) {
    this.dispatchAuditEvent('audit-field-change', {
      field: 'logFilterPreview',
      value: Boolean(event?.target?.checked),
    });
  }

  handleLogLiveChange(event) {
    this.dispatchAuditEvent('audit-field-change', {
      field: 'logFilterLive',
      value: Boolean(event?.target?.checked),
    });
  }

  toggleFiltersPanel() {
    this._filtersOpen = !this._filtersOpen;
  }

  render() {
    return html`
      <div class="header-inner">
        <form class="audit-search-form" @submit=${this.handleSubmit}>
          <div
            class="search-bar search-bar--full"
            role="search"
            aria-label="Repository and path search"
          >
            <label class="search-bar__field" for="org">
              <span class="field-label">Organization</span>
              <input
                type="text"
                id="org"
                name="org"
                class="field search-bar__org"
                placeholder="Organization"
                .value=${this.org}
                @input=${(event) => this.handleFieldInput('org', event)}
                required
              />
            </label>
            <label class="search-bar__field" for="site">
              <span class="field-label">Site</span>
              <input
                type="text"
                id="site"
                name="site"
                class="field search-bar__site"
                placeholder="Site"
                .value=${this.site}
                @input=${(event) => this.handleFieldInput('site', event)}
                required
              />
            </label>
            <label class="search-bar__field" for="search-term">
              <span class="search-bar__label-row">
                <span class="field-label">Search</span>
                <search-query-help></search-query-help>
              </span>
              <input
                type="text"
                id="search-term"
                name="searchTerm"
                class="field field--query search-bar__query"
                placeholder='e.g. /drafts, hero, ~pricing'
                .value=${this.searchTerm}
                @input=${(event) => this.handleFieldInput('searchTerm', event)}
                required
              />
            </label>
            <button
              type="submit"
              class="btn btn-primary search-submit search-bar__submit"
              ?disabled=${!this.canSearch}
            >
              Search
            </button>
            <button
              type="button"
              class="search-filters-link"
              aria-expanded=${this._filtersOpen ? 'true' : 'false'}
              aria-controls="audit-search-filters"
              title="Show or hide log filters (preview/publish, date range)"
              @click=${this.toggleFiltersPanel}
            >
              ${iconFilter({ className: 'search-filters-link__icon' })}
              <span>Filters</span>
            </button>
          </div>

          <div
            id="audit-search-filters"
            class="search-filters-panel"
            ?hidden=${!this._filtersOpen}
          >
            <div class="search-filters-panel__inner">
              <div
                class="search-filters-panel__group"
                role="group"
                aria-label="Previewed and published in log"
              >
                <label
                  class="switch-control search-filters-panel__item"
                  for="log-filter-preview"
                >
                  <input
                    type="checkbox"
                    id="log-filter-preview"
                    name="logFilterPreview"
                    ?checked=${this.logFilterPreview}
                    @change=${this.handleLogPreviewChange}
                  />
                  <span class="switch-slider" aria-hidden="true"></span>
                  <span class="switch-label">Previewed</span>
                </label>
                <label
                  class="switch-control search-filters-panel__item"
                  for="log-filter-live"
                >
                  <input
                    type="checkbox"
                    id="log-filter-live"
                    name="logFilterLive"
                    ?checked=${this.logFilterLive}
                    @change=${this.handleLogLiveChange}
                  />
                  <span class="switch-slider" aria-hidden="true"></span>
                  <span class="switch-label">Published</span>
                </label>
              </div>
              <div
                class="search-filters-panel__group search-filters-panel__group--sep search-filters-panel__group--dates"
                role="group"
                aria-label="Log time range"
              >
                <label class="search-filters-panel__datetime" for="log-from">
                  <span class="field-label">From</span>
                  <input
                    type="datetime-local"
                    id="log-from"
                    name="logFrom"
                    class="field field--datetime field--datetime-compact"
                    aria-label="Log from"
                    .value=${this.logFrom}
                    @input=${(event) => this.handleFieldInput('logFrom', event)}
                  />
                </label>
                <label class="search-filters-panel__datetime" for="log-to">
                  <span class="field-label">To</span>
                  <input
                    type="datetime-local"
                    id="log-to"
                    name="logTo"
                    class="field field--datetime field--datetime-compact"
                    aria-label="Log to"
                    .value=${this.logTo}
                    @input=${(event) => this.handleFieldInput('logTo', event)}
                  />
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, AuditSearchHeader);
}
