/**
 * Standardized HTTP client for all API calls.
 * Handles auth headers, error normalization, and base URL configuration.
 */

const isServer = typeof window === 'undefined';
const isLocalhost = !isServer && window.location.hostname === 'localhost';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (isServer ? (process.env.BACKEND_URL || 'http://localhost:3001/api') : (isLocalhost ? 'http://localhost:3001/api' : '/api'));

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: unknown;
}

export class ApiException extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.statusCode = error.statusCode;
    this.details = error.details;
  }
}

/**
 * Get the current auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Build headers for API requests
 */
function buildHeaders(options?: RequestInit, includeAuth = true): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Merge with any custom headers
  if (options?.headers) {
    const customHeaders = options.headers as Record<string, string>;
    Object.assign(headers, customHeaders);
  }

  return headers;
}

/**
 * Normalize error response into consistent ApiError shape
 */
function normalizeError(status: number, body: unknown): ApiError {
  // Default error message
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  if (body && typeof body === 'object') {
    const errorBody = body as Record<string, unknown>;
    
    // Handle various error response shapes
    if (typeof errorBody.message === 'string') {
      message = errorBody.message;
    } else if (Array.isArray(errorBody.message)) {
      // Nest validation errors come as arrays
      message = errorBody.message.join(' • ');
    } else if (typeof errorBody.error === 'string') {
      message = errorBody.error;
    } else if (errorBody.message && typeof errorBody.message === 'object') {
      // Handle nested message objects from Nest exceptions
      details = errorBody.message;
      message = 'Request failed';
    }

    // Store any additional details
    if (errorBody.details) {
      details = errorBody.details;
    }
  }

  return {
    message,
    statusCode: status,
    details,
  };
}

interface FetchOptions extends RequestInit {
  /** Skip auth header (for public endpoints) */
  noAuth?: boolean;
}

/**
 * Main fetch wrapper - handles auth, errors, and response parsing
 */
export async function apiFetch<T = unknown>(
  path: string,
  options?: FetchOptions
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const includeAuth = !options?.noAuth;

  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options, includeAuth),
  });

  // Handle empty responses (204, etc.)
  const contentType = response.headers.get('content-type');
  let body: unknown = null;
  
  if (contentType?.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new ApiException(normalizeError(response.status, body));
  }

  return body as T;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const http = {
  get<T = unknown>(path: string, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, { ...options, method: 'GET' });
  },

  post<T = unknown>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put<T = unknown>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  patch<T = unknown>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete<T = unknown>(path: string, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(path, { ...options, method: 'DELETE' });
  },
};

/**
 * Upload file with multipart/form-data
 */
export async function uploadFile<T = unknown>(
  path: string,
  file: File,
  fieldName = 'file'
): Promise<T> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiException(normalizeError(response.status, body));
  }

  return body as T;
}

export default http;
