/**
 * Turn axios / API errors into user-friendly messages for the admin UI.
 */
export function formatApiError(err, fallback = 'Something went wrong') {
  if (!err) return fallback;

  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Network error — check your connection and try again';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Request timed out — please try again';
  }

  const status = err.response?.status;
  const data = err.response?.data;

  if (status === 401) return 'Session expired — please sign in again';
  if (status === 403) return 'You do not have permission to perform this action';
  if (status === 404) return data?.error || 'The requested item was not found';
  if (status === 413) return data?.error || 'File or data payload is too large';
  if (status === 422 || status === 400) {
    if (typeof data?.error === 'string') return data.error;
    if (Array.isArray(data?.errors)) return data.errors.join('. ');
  }
  if (status >= 500) {
    return data?.error || 'Server error — try again in a moment';
  }

  if (typeof data?.error === 'string') return data.error;
  if (err.message && err.message !== 'Request failed with status code ' + status) {
    return err.message;
  }

  return fallback;
}
