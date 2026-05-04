export function getErrorMessage(error, fallback = 'An unexpected error occurred. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || fallback;

  if (typeof error === 'object') {
    return error.error || error.message || error.msg || fallback;
  }

  return fallback;
}

export async function parseResponseError(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const html = await response.text().catch(() => '');
    console.error(
      '[parseResponseError] Received HTML instead of JSON.',
      'Status:', response.status,
      'URL:', response.url,
      'First 200 chars:', html.slice(0, 200)
    );

    if (response.status === 405) {
      return 'API endpoint not found (405). The backend may be misconfigured.';
    }

    return `Server returned HTML page (status ${response.status}) instead of JSON. Check server logs.`;
  }

  const text = await response.text().catch(() => '');
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const message = getErrorMessage(data, text || `Request failed: ${response.status}`);

  if (response.status === 401) return `Authentication failed: ${message}`;
  if (response.status === 403) return `Access denied: ${message}`;
  if (response.status === 404) return `API endpoint not found (404). ${message}`;
  if (response.status === 405) return `Method not allowed (405). URL may be wrong: ${response.url}`;
  if (response.status === 429) return 'Too many requests. Please wait and try again.';
  if (response.status >= 500) return `Server error (${response.status}): ${message}. Please try again later.`;

  return message;
}
