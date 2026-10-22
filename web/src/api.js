/**
 * Custom API Error class with standard status, code, and validation details.
 */
export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Centralized fetch wrapper for the BHC REST API.
 * Automatically adds the Bearer token from sessionStorage and unpacks error responses.
 */
export async function api(endpoint, options = {}) {
  const token = sessionStorage.getItem('bhc_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const errorObj = data && data.error ? data.error : {};
    const code = errorObj.code || 'request_failed';
    const message = errorObj.message || `Request failed with status ${res.status}`;
    const details = errorObj.details;

    let displayMessage = message;
    if (Array.isArray(details) && details.length > 0) {
      const detailItems = details.map((d) => (d.field ? `${d.field}: ${d.issue}` : d.issue));
      displayMessage = `${message} — ${detailItems.join('; ')}`;
    }

    // If unauthorized or revoked token, notify user or clear session if appropriate
    if (res.status === 401 && !endpoint.includes('/api/auth/login')) {
      sessionStorage.removeItem('bhc_token');
      sessionStorage.removeItem('bhc_user');
      window.dispatchEvent(new Event('bhc_auth_change'));
    }

    throw new ApiError(res.status, code, displayMessage, details);
  }

  return data;
}
