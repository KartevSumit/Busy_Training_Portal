const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let logoutCallback = null;

export const setLogoutCallback = (cb) => {
  logoutCallback = cb;
};

export async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const headers = {
    ...options.headers,
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError('Network request failed. Please check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    if (logoutCallback) {
      logoutCallback();
    }
  }

  let data = null;
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text);
    }
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    let message = `Something went wrong (HTTP ${response.status})`;
    let code = null;

    if (data) {
      if (data.error && data.error.message) {
        message = data.error.message;
        code = data.error.code || null;
      } else if (data.message) {
        message = data.message;
        code = data.code || null;
      }
    }

    throw new ApiError(message, response.status, code);
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export async function downloadCsv(endpoint, defaultFilename = 'download.csv') {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    let message = `Export failed (HTTP ${response.status})`;
    try {
      const text = await response.text();
      const data = JSON.parse(text);
      if (data?.error?.message) message = data.error.message;
      else if (data?.message) message = data.message;
    } catch (e) {
    }
    throw new ApiError(message, response.status);
  }

  let filename = defaultFilename;
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch.length === 2) {
      filename = filenameMatch[1];
    }
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = objectUrl;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  window.URL.revokeObjectURL(objectUrl);
  document.body.removeChild(a);
}
