import '../experimental-badge/experimental-badge.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { iconBackChevronSvgString } from '../icons/icons.js';

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
          <a class="dashboard-link" href="${this.dashboardHref}" target="_top" rel="noopener" aria-label="See more experimental apps">
            ${iconBackChevronSvgString()}
            More experimental apps
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
