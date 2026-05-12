export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  if (err.response?.data?.error) {
    return err.response.data.error;
  }

  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (typeof err.response?.data === 'string') {
    const responseText = err.response.data;
    if (responseText.includes('Proxy error') || responseText.includes('ECONNREFUSED')) {
      return 'Cannot reach the backend server. Make sure it is running on http://localhost:5000.';
    }
  }

  if (err.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.';
  }

  if (err.request && !err.response) {
    return 'Cannot reach the backend server. Make sure it is running on http://localhost:5000.';
  }

  if (err.response?.status === 404) {
    return 'The signup API route was not found. Check that the backend server is running.';
  }

  if (err.response?.status >= 500) {
    return 'The backend server hit an error. Check the backend terminal for details.';
  }

  return fallback;
}
