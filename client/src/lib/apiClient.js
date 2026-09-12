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
