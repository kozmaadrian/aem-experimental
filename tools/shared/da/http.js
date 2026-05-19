/**
 * HTTP transport helpers for DA admin APIs.
 *
 * Pure browser code (uses `fetch`). Belongs to the `app/` layer — never imported
 * directly by core/. Tools either consume this through `client.js` or via a
 * tool-local `app/*-io.js` adapter.
 */

function isAuthenticationStatus(status) {
  return status === 401 || status === 403;
}

export function authenticationErrorMessage() {
  return 'Authentication is required. Please sign in to continue.';
}

export function isAuthenticationError(error) {
  return error instanceof Error && error.message === authenticationErrorMessage();
}

function formatResponseForLog(payload, maxLength = 5000) {
  if (typeof payload === 'string') {
    return payload.length > maxLength ? `${payload.slice(0, maxLength)}...` : payload;
  }

  try {
    const json = JSON.stringify(payload);
    return json.length > maxLength ? `${json.slice(0, maxLength)}...` : json;
  } catch {
    return '[unserializable response payload]';
  }
}

export async function fetchJSON(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const rawBody = await response.text();
  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    payload = rawBody;
  }

  if (!response.ok) {
    if (isAuthenticationStatus(response.status)) {
      throw new Error(authenticationErrorMessage());
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText}. Response: ${formatResponseForLog(payload, 500)}`);
  }

  return payload;
}

export async function fetchText(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (isAuthenticationStatus(response.status)) {
      throw new Error(authenticationErrorMessage());
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
