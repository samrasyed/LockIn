export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  if (err.response?.data?.error) {
    return err.response.data.error;
  }

  if (err.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.';
  }

  if (err.request && !err.response) {
    return 'Cannot reach the backend server. Start it with: cd backend && npm run dev';
  }

  return fallback;
}
