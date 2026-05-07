import '../experimental-badge/experimental-badge.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

const EL_NAME = 'tool-shell';
const APP_BASE = 'https://da.live/app/kozmaadrian/aem-experimental/tools/';
const shellStyles = await getStyle(
  new URL('./tool-shell.css', import.meta.url).href,
);

class ToolShell extends HTMLElement {
  static get observedAttributes() {
    return ['dashboard-href', 'badge', 'title', 'subtitle'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [shellStyles];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  withRefLocal(href) {
    if (typeof window === 'undefined') return href;
    const current = new URL(window.location.href);
    const target = new URL(href, APP_BASE);

    if (current.searchParams.get('ref') === 'local' && !target.searchParams.has('ref')) {
      target.searchParams.set('ref', 'local');
    }
    return target.href;
  }

  get dashboardHref() {
    const base = (this.getAttribute('dashboard-href') || 'dashboard/dashboard').trim()
      || 'dashboard/dashboard';
    return this.withRefLocal(base);
  }

  isDashboardPage() {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname || '';
    return path.endsWith('/tools/dashboard/dashboard')
      || path.endsWith('/tools/dashboard/dashboard.html')
      || path.endsWith('/tools/dashboard/dashboard/')
      || path.endsWith('/dashboard/dashboard')
      || path.endsWith('/dashboard/dashboard.html')
      || path.endsWith('/dashboard/dashboard/');
  }

  get badgeLabel() {
    const value = this.getAttribute('badge');
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed || 'experimental';
  }

  get title() {
    return (this.getAttribute('title') || '').trim();
  }

  get subtitle() {
    return (this.getAttribute('subtitle') || '').trim();
  }

  render() {
    if (!this.shadowRoot) return;

    const badge = this.badgeLabel
      ? `<experimental-badge class="badge" label="${this.badgeLabel}"></experimental-badge>`
      : '';

    const dashboardLink = this.isDashboardPage()
      ? ''
      : `
        <div class="top-left">
          <a class="dashboard-link" href="${this.dashboardHref}" target="_top" rel="noopener" aria-label="Back to Apps Collection">
            <svg class="dashboard-link__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M12.2373 16.4551C12.041 16.4551 11.8437 16.3779 11.6973 16.2246L6.20996 10.5215C5.92969 10.2315 5.92969 9.77248 6.20996 9.48244L11.71 3.76564C11.9971 3.46681 12.4727 3.45802 12.7695 3.74513C13.0684 4.03224 13.0781 4.50685 12.79 4.8047L7.79102 10.002L12.7773 15.1856C13.0654 15.4834 13.0557 15.958 12.7568 16.2451C12.6123 16.3858 12.4248 16.4551 12.2373 16.4551Z" fill="currentColor"/>
            </svg>
            Apps Collection
          </a>
        </div>
      `;

    const header = this.title
      ? `
        <header class="tool-header">
          <h1 class="tool-title">${this.title}</h1>
          ${this.subtitle ? `<p class="tool-subtitle">${this.subtitle}</p>` : ''}
        </header>
      `
      : '';

    this.shadowRoot.innerHTML = `
      ${dashboardLink}

      <div class="top-right">${badge}</div>

      <div class="content">
        ${header}
        <div class="content__main">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, ToolShell);
}
