/**
 * Pretty-print HTML (and JSON) for read-only source inspection.
 * Loads Prettier from CDN on first use, matching audit diff-dialog behavior.
 */

const PRETTIER_STANDALONE_CDN_URL = 'https://cdn.jsdelivr.net/npm/prettier@3.3.3/standalone.js';
const PRETTIER_HTML_PLUGIN_CDN_URL = 'https://cdn.jsdelivr.net/npm/prettier@3.3.3/plugins/html.js';

let htmlFormatterPromise;

function loadExternalScript(url) {
  const existingScript = Array.from(document.querySelectorAll('script'))
    .find((scriptEl) => scriptEl.src === url);

  if (existingScript) {
    if (existingScript.dataset.cursorLoaded === 'true'
      || existingScript.readyState === 'complete'
      || existingScript.readyState === 'loaded') {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`Failed to load script: ${url}`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => {
      script.dataset.cursorLoaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.append(script);
  });
}

async function loadHtmlFormatterLibrary() {
  if (window.prettier?.format && window.prettierPlugins?.html) {
    return {
      prettier: window.prettier,
      plugins: [window.prettierPlugins.html],
    };
  }

  if (!htmlFormatterPromise) {
    htmlFormatterPromise = (async () => {
      await loadExternalScript(PRETTIER_STANDALONE_CDN_URL);
      await loadExternalScript(PRETTIER_HTML_PLUGIN_CDN_URL);
      if (!window.prettier?.format || !window.prettierPlugins?.html) {
        throw new Error('HTML formatter loaded but unavailable on window.');
      }
      return {
        prettier: window.prettier,
        plugins: [window.prettierPlugins.html],
      };
    })().catch((error) => {
      htmlFormatterPromise = undefined;
      throw error;
    });
  }

  return htmlFormatterPromise;
}

/** @returns {'html' | 'json' | 'text'} */
export function inferDocumentSourceKind(path, text) {
  const pathLower = typeof path === 'string' ? path.toLowerCase() : '';
  if (pathLower.endsWith('.json')) return 'json';
  if (pathLower.endsWith('.html') || pathLower.endsWith('.htm') || pathLower.endsWith('.svg')) {
    return 'html';
  }

  const source = typeof text === 'string' ? text.trim() : '';
  if (!source) return 'text';
  if ((source.startsWith('{') && source.endsWith('}'))
    || (source.startsWith('[') && source.endsWith(']'))) {
    return 'json';
  }
  if (source.startsWith('<') && source.includes('>')) return 'html';
  return 'text';
}

function formatJsonSource(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

async function formatHtmlSource(text) {
  const formatter = await loadHtmlFormatterLibrary();
  const formatted = await formatter.prettier.format(text, {
    parser: 'html',
    plugins: formatter.plugins,
    printWidth: 100,
    tabWidth: 2,
    htmlWhitespaceSensitivity: 'css',
  });
  return typeof formatted === 'string' ? formatted : text;
}

/**
 * @param {string} source Raw document body
 * @param {string} [pathHint] Path used to infer JSON vs HTML
 * @returns {Promise<string>} Formatted text for display
 */
export async function formatDocumentSource(source, pathHint = '') {
  const text = typeof source === 'string' ? source : '';
  if (!text.trim()) return text;

  const kind = inferDocumentSourceKind(pathHint, text);
  if (kind === 'json') return formatJsonSource(text);
  if (kind === 'html') {
    try {
      return await formatHtmlSource(text);
    } catch {
      return text;
    }
  }
  return text;
}
