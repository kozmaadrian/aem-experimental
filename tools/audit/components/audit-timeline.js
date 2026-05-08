import { html, LitElement } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import { iconCompare } from '../../shared/components/icons/icons.js';
import {
  actionPillLabel,
  actionPillVariant,
  formatEventKind,
  formatSmartTime,
} from '../lib/audit-formatters.js';

const EL_NAME = 'audit-timeline';

function sanitizeVariantClass(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') || 'modified';
}

class AuditTimeline extends LitElement {
  static properties = {
    events: { type: Array },
  };

  constructor() {
    super();
    this.events = [];
  }

  createRenderRoot() {
    return this;
  }

  renderEmptyState() {
    return html`
      <div class="audit-empty-layout">
        <div class="empty-card">
          <div class="audit-detail-state">
            <div class="audit-detail-state__figure" aria-hidden="true"></div>
            <p class="audit-detail-state__message empty-state">
              No publish, modify, or version events were returned for this path.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  renderEventDetails(details) {
    if (!details.length) return '';
    return html`
      <div class="event-body">
        ${details.map((line) => html`<p class="event-body__line">${line}</p>`)}
      </div>
    `;
  }

  renderAuthor(author) {
    if (!author) return '';
    return html`
      <span class="pill pill--author" title=${author}>${author}</span>
    `;
  }

  renderCompareIcon() {
    return iconCompare({ className: 'timeline-compare-trigger__svg' });
  }

  handleCompareClick(clickEvent, timelineEvent) {
    clickEvent.stopPropagation();
    const versionId = timelineEvent?.versionId?.trim() || '';
    if (!versionId) return;
    this.dispatchEvent(new CustomEvent('audit-open-diff', {
      detail: {
        versionId,
        versionLabel: timelineEvent?.versionLabel || '',
        versionUrl: timelineEvent?.versionUrl || '',
      },
      bubbles: true,
      composed: true,
    }));
  }

  renderCompareTrigger(event) {
    if (!event?.versionId) return '';
    return html`
      <button
        type="button"
        class="icon-tool-trigger timeline-compare-trigger"
        title="Compare this version"
        @click=${(clickEvent) => this.handleCompareClick(clickEvent, event)}
      >
        <span class="timeline-compare-trigger__icon-wrap" aria-hidden="true">
          ${this.renderCompareIcon()}
        </span>
        <span class="timeline-compare-trigger__label">Compare</span>
      </button>
    `;
  }

  renderTimelineEvent(event) {
    const heading = event?.title || formatEventKind(event?.kind);
    const isoTimestamp = Number.isFinite(event?.timestamp)
      ? new Date(event.timestamp).toISOString()
      : '';
    const details = Array.isArray(event?.details)
      ? event.details.filter(
        (line) => typeof line === 'string' && line.trim(),
      )
      : [];
    const author = typeof event?.author === 'string' ? event.author : '';
    const variantClass = sanitizeVariantClass(actionPillVariant(event));

    return html`
      <li class="timeline-event timeline-event--${variantClass}" role="listitem">
        <div class="event-card">
          <div class="event-card__main">
            <div class="event-top">
              <strong class="event-top__title event-top__title--${variantClass}">${heading}</strong>
              <time class="event-top__time" datetime=${isoTimestamp}>
                ${formatSmartTime(event?.timestamp)}${author ? html`, ${author}` : ''}
              </time>
            </div>
            ${this.renderEventDetails(details)}
          </div>
          <aside class="event-card__aside">
            <div class="event-aside__top">
              ${this.renderCompareTrigger(event)}
            </div>
          </aside>
        </div>
      </li>
    `;
  }

  render() {
    const timeline = Array.isArray(this.events) ? this.events : [];
    if (!timeline.length) {
      return this.renderEmptyState();
    }

    return html`
      <div class="timeline">
        <ul class="timeline-list" role="list">
          ${timeline.map((event) => this.renderTimelineEvent(event))}
        </ul>
      </div>
    `;
  }
}

if (!customElements.get(EL_NAME)) {
  customElements.define(EL_NAME, AuditTimeline);
}
