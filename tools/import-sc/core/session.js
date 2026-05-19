/**
 * Import-SC session: state machine + orchestration. Pure JS, no Lit, no DOM.
 *
 * The shell provides:
 *   - `io`        I/O adapter (listSchemas, fetchSchemaDoc, importDocument).
 *   - `serialise` function that renders a structured-content JSON payload into
 *                 the import HTML (currently an external da-nx import).
 *   - `notify`    called with `{ variant, message, link? }` (toast-shaped).
 *   - `onChange`  fires after every state change with the new snapshot.
 *
 * The shell also injects an `editor` adapter (CodeMirror `getValue`) via
 * `setEditor` after the editor mounts.
 *
 * Convention: methods read state via `s()` and mutate via `set(patch)`. There
 * is no other write path — `state` is closure-private, never returned.
 */

import { normalizeDocumentPath } from '../../shared/da/paths.js';
import { validateAgainstSchema } from './validators.js';

function initialState() {
  return {
    org: '',
    site: '',
    documentPath: '',
    schemaName: '',
    schemas: {},
    schemasLoaded: false,
    schemasLoadError: '',
  };
}

const INITIAL_FIELDS = Object.keys(initialState());

function formatValidationErrors(errors) {
  return errors.map((err) => ({
    path: err.path && err.path !== '#' ? err.path : 'Root',
    message: err.message,
  }));
}

function deriveDocumentTitle(documentPath, fallback) {
  const normalized = normalizeDocumentPath(documentPath);
  const segments = normalized.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  const title = last.replace(/\.html$/i, '');
  return title || fallback || '';
}

export function createImportSession({
  io,
  serialise,
  notify = () => {},
  onChange = () => {},
}) {
  let current = initialState();
  const s = () => current;
  const set = (patch) => { current = { ...current, ...patch }; onChange(current); };
  let editor = null;

  function setEditor(adapter) {
    editor = adapter;
  }

  function getEditorContent() {
    return editor?.getValue?.() || '';
  }

  function schemaEditorUrl(schemaName) {
    const state = s();
    const org = (state.org || '').trim();
    const site = (state.site || '').trim();
    const base = org && site
      ? `https://da.live/apps/schema#/${encodeURIComponent(org)}/${encodeURIComponent(site)}`
      : 'https://da.live/apps/schema';
    return schemaName ? `${base}/.da/forms/schemas/${schemaName}` : base;
  }

  async function loadSchemas() {
    const { org, site } = s();
    if (!org?.trim() || !site?.trim()) {
      set({ schemas: {}, schemasLoaded: false, schemasLoadError: '' });
      return;
    }

    const result = await io.listSchemas(org, site);
    if (result.success) {
      set({ schemas: result.schemas, schemasLoaded: true, schemasLoadError: '' });
    } else {
      set({
        schemas: {},
        schemasLoaded: true,
        schemasLoadError: result.error || 'Failed to load schemas.',
      });
    }
  }

  function setField(field, value) {
    if (!INITIAL_FIELDS.includes(field)) return;
    const normalized = field === 'documentPath'
      ? normalizeDocumentPath(value)
      : value;
    set({ [field]: normalized });
  }

  async function performValidation() {
    const state = s();
    if (!state.schemaName) {
      return { valid: false, error: 'Please select a schema first' };
    }
    const schema = state.schemas[state.schemaName];
    if (!schema) {
      return { valid: false, error: 'Selected schema not found' };
    }

    const schemaResult = await io.fetchSchemaDoc(schema.path);
    if (!schemaResult.success) {
      return { valid: false, error: `Failed to load schema: ${schemaResult.error}` };
    }

    const jsonData = getEditorContent();
    const validationResult = validateAgainstSchema(jsonData, schemaResult.schema);

    if (!validationResult.valid) {
      if (validationResult.errors) {
        return {
          valid: false,
          errors: formatValidationErrors(validationResult.errors),
        };
      }
      return { valid: false, error: validationResult.error };
    }

    return { valid: true, data: validationResult.data };
  }

  function notifyValidationFailure(validation) {
    const { schemaName } = s();
    if (validation.errors) {
      const lines = validation.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
      notify({
        variant: 'error',
        message: `JSON validation failed against the "${schemaName}" schema:\n${lines}`,
        link: { url: schemaEditorUrl(schemaName), text: 'Edit Schema' },
      });
    } else {
      notify({ variant: 'error', message: validation.error });
    }
  }

  async function validate() {
    const validation = await performValidation();
    if (validation.valid) {
      notify({
        variant: 'success',
        message: `JSON is valid and matches the "${s().schemaName}" schema!`,
      });
      return validation;
    }
    notifyValidationFailure(validation);
    return validation;
  }

  async function importDocument() {
    const validation = await performValidation();
    if (!validation.valid) {
      notifyValidationFailure(validation);
      return validation;
    }

    const {
      org, site, documentPath, schemaName,
    } = s();
    const htmlContent = serialise({
      json: {
        metadata: {
          schemaName,
          title: deriveDocumentTitle(documentPath, schemaName),
        },
        data: validation.data,
      },
    });

    const result = await io.importDocument(org, site, documentPath, htmlContent);

    if (result?.success) {
      notify({
        variant: 'success',
        message: 'Content imported successfully!',
        link: { url: result.url, text: 'View in Editor' },
      });
    } else if (result) {
      notify({ variant: 'error', message: `Import failed: ${result.error}` });
    }
    return result;
  }

  function canValidate() {
    const state = s();
    return Boolean(
      Object.keys(state.schemas).length > 0
      && state.org?.trim()
      && state.site?.trim()
      && state.documentPath?.trim()
      && state.schemaName?.trim()
      && getEditorContent()?.trim(),
    );
  }

  function canImport() {
    if (!canValidate()) return false;
    try {
      JSON.parse(getEditorContent());
      return true;
    } catch {
      return false;
    }
  }

  return {
    getState: s,
    setEditor,
    setField,
    loadSchemas,
    validate,
    importDocument,
    canValidate,
    canImport,
    schemaEditorUrl,
    getEditorContent,
  };
}
