/**
 * Browser-side I/O adapter for the import-sc tool.
 *
 * Builds DA URLs on `admin.da.page` (matches the tool's original behavior) and
 * uses the shared HTTP helpers for auth-error normalization.
 */

import { fetchJSON, fetchText } from '../../shared/da/http.js';
import { ADMIN_DA_PAGE_URL, PREVIEW_BASE_URL } from '../../shared/da/endpoints.js';
import { normalizeDocumentPath } from '../../shared/da/paths.js';

const SCHEMA_PATH = '/.da/forms/schemas';

function buildSchemaListUrl(org, site) {
  return `${ADMIN_DA_PAGE_URL}/list/${org}/${site}${SCHEMA_PATH}`;
}

function buildSchemaSourceUrl(schemaPath) {
  // schemaPath is `/org/site/.da/forms/schemas/foo` (already absolute).
  return `${ADMIN_DA_PAGE_URL}/source${schemaPath}`;
}

function buildImportUrl(org, site, fullPath) {
  return `${ADMIN_DA_PAGE_URL}/source/${org}/${site}${fullPath}`;
}

export function createImportIo({ token }) {
  if (!token) throw new Error('createImportIo: token is required');

  return {
    /**
     * Lists schemas under the org/site `/.da/forms/schemas` directory.
     * @returns {Promise<{ success: boolean, schemas?: object, error?: string }>}
     */
    async listSchemas(org, site) {
      if (!org) return { success: false, error: 'Organization is required' };
      try {
        const payload = await fetchJSON(buildSchemaListUrl(org, site), token);
        const schemas = {};
        if (Array.isArray(payload)) {
          payload.forEach((item) => {
            if (item.name && item.ext === 'html') {
              schemas[item.name] = {
                name: item.name,
                path: item.path,
                modified: item.lastModified,
              };
            }
          });
        }
        return { success: true, schemas };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Fetches the schema HTML document and extracts the JSON schema from its
     * `<pre><code>` block.
     */
    async fetchSchemaDoc(schemaPath) {
      try {
        const html = await fetchText(buildSchemaSourceUrl(schemaPath), token);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const schemaElement = doc.querySelector('pre code');
        if (!schemaElement) throw new Error('Schema definition not found in HTML');
        const schema = JSON.parse(schemaElement.textContent);
        return { success: true, schema };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    /**
     * POSTs HTML to DA as a structured-content document.
     */
    async importDocument(org, site, documentPath, htmlContent) {
      try {
        const normalized = normalizeDocumentPath(documentPath);
        const fullPath = normalized.endsWith('.html') ? normalized : `${normalized}.html`;
        const url = buildImportUrl(org, site, fullPath);

        const formData = new FormData();
        formData.append(
          'data',
          new Blob([htmlContent], { type: 'text/html' }),
          'content.html',
        );

        const response = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return {
          success: true,
          url: `${PREVIEW_BASE_URL}/form#/${org}/${site}${normalized}`,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  };
}
