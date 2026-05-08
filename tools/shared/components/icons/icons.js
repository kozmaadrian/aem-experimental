import { html } from 'https://da.live/nx/deps/lit/lit-core.min.js';

/**
 * Shared inline SVG icons (no SWC dependency).
 * All icons use `currentColor` so callers can style via CSS.
 */

function iconAttrs({ className = '', label = '' } = {}) {
  const hasLabel = Boolean(label && String(label).trim());
  return {
    className,
    hasLabel,
    label: hasLabel ? String(label).trim() : '',
  };
}

export function iconInfo(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        d="M10 18.75C5.1748 18.75 1.25 14.8252 1.25 10C1.25 5.1748 5.1748 1.25 10 1.25C14.8252 1.25 18.75 5.1748 18.75 10C18.75 14.8252 14.8252 18.75 10 18.75ZM10 2.75C6.00195 2.75 2.75 6.00195 2.75 10C2.75 13.998 6.00195 17.25 10 17.25C13.998 17.25 17.25 13.998 17.25 10C17.25 6.00195 13.998 2.75 10 2.75Z"
        fill="currentColor"
      />
      <path
        d="M10.0006 5.26033C10.2313 5.2522 10.456 5.3342 10.6272 5.48895C10.9576 5.854 10.9576 6.40997 10.6272 6.77502C10.4579 6.93353 10.2324 7.0181 10.0006 7.01006C9.76426 7.01954 9.53472 6.92971 9.36759 6.76231C9.20552 6.59441 9.11843 6.36799 9.12622 6.13476C9.11384 5.89979 9.19581 5.66961 9.35392 5.49536C9.5275 5.33062 9.76179 5.24548 10.0006 5.26033Z"
        fill="currentColor"
      />
      <path
        d="M10 15.0625C9.58594 15.0625 9.25 14.7266 9.25 14.3125V9.47754C9.25 9.06348 9.58594 8.72754 10 8.72754C10.4141 8.72754 10.75 9.06348 10.75 9.47754V14.3125C10.75 14.7266 10.4141 15.0625 10 15.0625Z"
        fill="currentColor"
      />
    </svg>
  `;
}

export function iconAlert(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M10 1.667A8.333 8.333 0 1 0 10 18.333 8.333 8.333 0 0 0 10 1.667Zm0 15A6.667 6.667 0 1 1 10 3.333a6.667 6.667 0 0 1 0 13.334Zm-.833-4.167h1.666v1.667H9.167V12.5Zm0-6.667h1.666v5H9.167V5.833Z"
      />
    </svg>
  `;
}

export function iconClose(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M11.314 10l4.183-4.183a1 1 0 10-1.414-1.414L9.9 8.586 5.717 4.403a1 1 0 00-1.414 1.414L8.486 10l-4.183 4.183a1 1 0 101.414 1.414L9.9 11.414l4.183 4.183a1 1 0 001.414-1.414L11.314 10z"
      />
    </svg>
  `;
}

export function iconCloseSmall(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.72 3.72A.75.75 0 0 1 4.78 3.72L8 6.94L11.22 3.72A.75.75 0 1 1 12.28 4.78L9.06 8L12.28 11.22A.75.75 0 1 1 11.22 12.28L8 9.06L4.78 12.28A.75.75 0 1 1 3.72 11.22L6.94 8L3.72 4.78A.75.75 0 0 1 3.72 3.72Z"
      />
    </svg>
  `;
}

export function iconChevronUp(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.54492 12.2373C3.54492 12.041 3.62207 11.8437 3.77539 11.6973L9.47851 6.20996C9.76855 5.92969 10.2275 5.92969 10.5176 6.20996L16.2344 11.71C16.5332 11.9971 16.542 12.4727 16.2549 12.7695C15.9678 13.0684 15.4932 13.0781 15.1953 12.79L9.99804 7.79102L4.81445 12.7773C4.5166 13.0654 4.04199 13.0557 3.75488 12.7568C3.61426 12.6123 3.54492 12.4248 3.54492 12.2373Z"
      />
    </svg>
  `;
}

export function iconChevronDown(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.75488 7.24315C4.04199 6.94432 4.5166 6.93455 4.81445 7.22264L9.99804 12.209L15.1953 7.20995C15.4932 6.92187 15.9678 6.93163 16.2549 7.23046C16.542 7.52733 16.5332 8.00292 16.2344 8.29003L10.5176 13.79C10.2275 14.0703 9.76855 14.0703 9.47851 13.79L3.77539 8.30273C3.62207 8.15624 3.54492 7.95898 3.54492 7.76269C3.54492 7.57518 3.61426 7.38768 3.75488 7.24315Z"
      />
    </svg>
  `;
}

export function iconFilter(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8.99901 18.7285C8.63963 18.7285 8.28221 18.6304 7.9619 18.4356C7.35936 18.0698 6.99999 17.4307 6.99999 16.7261V10.4902C6.99999 10.3042 6.93163 10.1265 6.80761 9.98878L2.62792 5.34521C2.08983 4.75488 1.95409 3.92871 2.27929 3.19287C2.60351 2.45703 3.30468 2 4.10937 2H15.8906C16.6953 2 17.3965 2.45703 17.7207 3.19287C18.0459 3.92871 17.9102 4.75488 17.3682 5.34863L13.1924 9.98877C13.0684 10.1265 13 10.3042 13 10.4902V15.5356C13 16.3794 12.5352 17.1445 11.7871 17.5327L9.92188 18.501C9.62989 18.6528 9.31346 18.7285 8.99901 18.7285ZM4.10937 3.5C3.81445 3.5 3.6914 3.7085 3.65136 3.79834C3.61132 3.88818 3.54101 4.12012 3.73925 4.33789L7.92284 8.98486C8.29491 9.39843 8.49999 9.9331 8.49999 10.4902V16.7261C8.49999 16.98 8.66796 17.1094 8.74022 17.1533C8.81249 17.1978 9.00584 17.2856 9.23045 17.1699L11.0957 16.2012C11.3457 16.0718 11.5 15.8169 11.5 15.5356V10.4902C11.5 9.9331 11.7051 9.39843 12.0771 8.98486L16.2568 4.34131C16.459 4.12012 16.3887 3.88819 16.3486 3.79834C16.3086 3.70849 16.1855 3.5 15.8906 3.5H4.10937Z"
      />
    </svg>
  `;
}

export function iconCompare(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        d="M5.75 17H3.25C2.00928 17 1 15.9907 1 14.75V5.25C1 4.00928 2.00928 3 3.25 3H5.75C6.99072 3 8 4.00928 8 5.25V14.75C8 15.9907 6.99072 17 5.75 17ZM3.25 4.5C2.83643 4.5 2.5 4.83643 2.5 5.25V14.75C2.5 15.1636 2.83643 15.5 3.25 15.5H5.75C6.16357 15.5 6.5 15.1636 6.5 14.75V5.25C6.5 4.83643 6.16357 4.5 5.75 4.5H3.25Z"
        fill="currentColor"
      />
      <path
        d="M16.75 17H14.25C13.0093 17 12 15.9907 12 14.75V5.25C12 4.00928 13.0093 3 14.25 3H16.75C17.9907 3 19 4.00928 19 5.25V14.75C19 15.9907 17.9907 17 16.75 17ZM14.25 4.5C13.8364 4.5 13.5 4.83643 13.5 5.25V14.75C13.5 15.1636 13.8364 15.5 14.25 15.5H16.75C17.1636 15.5 17.5 15.1636 17.5 14.75V5.25C17.5 4.83643 17.1636 4.5 16.75 4.5H14.25Z"
        fill="currentColor"
      />
      <path
        d="M10 19C9.58594 19 9.25 18.6641 9.25 18.25V1.75C9.25 1.33594 9.58594 1 10 1C10.4141 1 10.75 1.33594 10.75 1.75V18.25C10.75 18.6641 10.4141 19 10 19Z"
        fill="currentColor"
      />
    </svg>
  `;
}

export function iconRefresh(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  return html`
    <svg
      class=${className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role=${hasLabel ? 'img' : 'presentation'}
      aria-label=${hasLabel ? label : ''}
      aria-hidden=${hasLabel ? 'false' : 'true'}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M18.2065 3.89745C17.8013 3.80272 17.3984 4.04784 17.3013 4.45116L16.9208 6.02587C15.5231 3.59399 12.919 2.02148 10 2.02148C6.31544 2.02148 3.12452 4.52148 2.24073 8.10156C2.14112 8.5039 2.38673 8.91015 2.78907 9.00976C3.19044 9.10937 3.59766 8.86328 3.69678 8.46093C4.41504 5.55273 7.00684 3.52148 10 3.52148C12.5168 3.52148 14.735 4.96777 15.809 7.1538L13.7065 6.6455C13.3032 6.55175 12.8989 6.79589 12.8013 7.19921C12.7041 7.60155 12.9517 8.00683 13.354 8.10448L16.5992 8.88866C16.724 8.97728 16.8729 9.03124 17.0308 9.03124C17.0903 9.03124 17.1509 9.0244 17.2109 9.00976C17.2592 8.9978 17.2968 8.96874 17.3401 8.94872C17.4097 8.93017 17.4835 8.92919 17.5459 8.89061C17.7153 8.78709 17.8369 8.6201 17.8838 8.42674L18.7593 4.80272C18.8564 4.40038 18.6089 3.9951 18.2065 3.89745Z"
      />
      <path
        fill="currentColor"
        d="M17.2109 11.0323C16.8139 10.9356 16.4028 11.1788 16.3032 11.5811C15.5849 14.4903 12.9931 16.5215 9.99998 16.5215C7.48295 16.5215 5.26475 15.075 4.19084 12.888L6.29344 13.3965C6.69627 13.4883 7.10155 13.2462 7.19871 12.8428C7.29588 12.4405 7.04832 12.0352 6.64598 11.9376L3.39104 11.1509C3.22002 11.0328 3.00573 10.9796 2.78905 11.0323C2.77385 11.0362 2.76305 11.0469 2.74834 11.0516C2.64513 11.0648 2.54442 11.0958 2.45409 11.1514C2.28466 11.255 2.16307 11.4219 2.1162 11.6153L1.24071 15.2393C1.14354 15.6417 1.3911 16.0469 1.79344 16.1446C1.85301 16.1583 1.91209 16.1651 1.9702 16.1651C2.30858 16.1651 2.61571 15.9346 2.69872 15.5909L3.07915 14.0162C4.47679 16.4483 7.08104 18.0215 9.99999 18.0215C13.6846 18.0215 16.8755 15.5206 17.7593 11.9405C17.8589 11.5382 17.6133 11.1319 17.2109 11.0323Z"
      />
    </svg>
  `;
}

export function iconProgressCircle(opts = {}) {
  const { className, hasLabel, label } = iconAttrs(opts);
  const wrapClass = ['spectrum-progress', 'spectrum-progress--sizeM', className]
    .filter(Boolean)
    .join(' ');
  return html`
    <span class=${wrapClass}>
      <svg
        class="spectrum-progress__svg"
        viewBox="0 0 32 32"
        role=${hasLabel ? 'img' : 'presentation'}
        aria-label=${hasLabel ? label : ''}
        aria-hidden=${hasLabel ? 'false' : 'true'}
        focusable="false"
      >
        <circle class="spectrum-progress__track" cx="16" cy="16" r="12.5" fill="none" />
        <g transform="translate(16 16)">
          <g class="spectrum-progress__fills">
            <circle class="spectrum-progress__fill" cx="0" cy="0" r="12.5" fill="none" />
          </g>
        </g>
      </svg>
    </span>
  `;
}

export function getIcon(name, opts = {}) {
  switch (String(name || '').toLowerCase()) {
    case 'info':
      return iconInfo(opts);
    case 'alert':
    case 'negative':
    case 'error':
      return iconAlert(opts);
    case 'close':
    case 'x':
      return iconClose(opts);
    case 'close-small':
      return iconCloseSmall(opts);
    case 'chevron-up':
      return iconChevronUp(opts);
    case 'chevron-down':
      return iconChevronDown(opts);
    case 'filter':
      return iconFilter(opts);
    case 'compare':
      return iconCompare(opts);
    case 'refresh':
      return iconRefresh(opts);
    case 'progress-circle':
    case 'progress-ring':
      return iconProgressCircle(opts);
    default:
      return html``;
  }
}

/**
 * String-returning SVG helpers for components that render via `innerHTML` strings
 * (non-Lit). Prefer the `icon*()` html-template helpers in Lit templates.
 */
export function iconBackChevronSvgString() {
  return `
    <svg class="dashboard-link__icon" width="20" height="20" viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M12.2373 16.4551C12.041 16.4551 11.8437 16.3779 11.6973 16.2246L6.20996 10.5215C5.92969 10.2315 5.92969 9.77248 6.20996 9.48244L11.71 3.76564C11.9971 3.46681 12.4727 3.45802 12.7695 3.74513C13.0684 4.03224 13.0781 4.50685 12.79 4.8047L7.79102 10.002L12.7773 15.1856C13.0654 15.4834 13.0557 15.958 12.7568 16.2451C12.6123 16.3858 12.4248 16.4551 12.2373 16.4551Z" fill="currentColor"/>
    </svg>
  `.trim();
}

export function iconExperimental() {
  return `
    <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1800" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M900.114,54.882c-329.509,0-597.583,268.077-597.583,597.59c0,219.592,118.159,418.518,309.714,523.794v152.835h-0.127v122.121h-0.172v185.238h172.682c3.58,60.518,53.924,108.656,115.315,108.656c61.39,0,111.736-48.139,115.31-108.656h172.571v-122.122h0.177v-185.237h-0.019v-152.835c191.557-105.276,309.715-304.203,309.715-523.794C1497.697,322.959,1229.623,54.882,900.114,54.882z M675.235,1392.218h449.649v59.005H675.235V1392.218z M899.943,1682.002c-29.441,0-48.627-22.507-51.876-45.541h103.788C948.464,1662.119,926.504,1682.002,899.943,1682.002z M1124.708,1573.344H675.063v-59.005h449.645V1573.344z M1142.116,1129.132l-17.25,8.778v189.457H931.559V861l187.201-187.21c12.323-12.323,12.323-32.302-0.005-44.63c-12.318-12.318-32.302-12.323-44.629,0.004L900,803.299L725.875,629.165c-12.323-12.323-32.307-12.328-44.63-0.004c-12.328,12.328-12.328,32.307-0.005,44.63L868.441,861v466.367H675.362V1137.91l-17.249-8.778c-180.4-91.778-292.465-274.427-292.465-476.66c0-294.71,239.761-534.471,534.466-534.471c294.706,0,534.466,239.761,534.466,534.471C1434.58,854.705,1322.516,1037.354,1142.116,1129.132z"/>
        <path d="M1066.667,246.225c-17.43,0-31.558,14.128-31.558,31.559s14.128,31.558,31.558,31.558c49.641,0,165.99,59.634,165.99,175.279c0,17.431,14.128,31.559,31.558,31.559c17.431,0,31.559-14.128,31.559-31.559C1295.773,328.101,1146.624,246.225,1066.667,246.225z"/>
        <path d="M209.331,712.881c0-17.43-14.128-31.558-31.558-31.558H34.686c-17.43,0-31.558,14.128-31.558,31.558s14.128,31.558,31.558,31.558h143.087C195.203,744.439,209.331,730.312,209.331,712.881z"/>
        <path d="M220.157,300.096c6.164,6.163,14.239,9.245,22.317,9.245c8.075,0,16.153-3.082,22.313-9.241c12.328-12.328,12.328-32.307,0.004-44.629L163.623,154.297c-12.318-12.319-32.303-12.323-44.63-0.004c-12.327,12.327-12.327,32.307-0.004,44.63L220.157,300.096z"/>
        <path d="M220.17,1125.662l-101.178,101.174c-12.327,12.327-12.327,32.307-0.004,44.634c6.164,6.164,14.238,9.246,22.317,9.246c8.074,0,16.153-3.082,22.312-9.246l101.179-101.173c12.327-12.327,12.327-32.307,0.004-44.625C252.478,1113.344,232.493,1113.344,220.17,1125.662z"/>
        <path d="M1765.314,681.323h-143.083c-17.43,0-31.559,14.128-31.559,31.558s14.129,31.558,31.559,31.558h143.083c17.43,0,31.558-14.128,31.558-31.558S1782.744,681.323,1765.314,681.323z"/>
        <path d="M1557.521,309.341c8.074,0,16.153-3.082,22.316-9.241l101.174-101.173c12.322-12.327,12.322-32.307,0-44.634c-12.328-12.319-32.307-12.319-44.635,0l-101.173,101.173c-12.323,12.328-12.323,32.307,0,44.634C1541.368,306.259,1549.447,309.341,1557.521,309.341z"/>
        <path d="M1579.829,1125.662c-12.318-12.318-32.302-12.318-44.63,0.01c-12.323,12.318-12.323,32.298,0.005,44.625l101.178,101.173c6.159,6.164,14.238,9.246,22.312,9.246c8.075,0,16.154-3.082,22.318-9.246c12.322-12.327,12.322-32.307-0.005-44.634L1579.829,1125.662z"/>
      </g>
    </svg>
  `.trim();
}
