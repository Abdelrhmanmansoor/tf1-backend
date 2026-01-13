/**
 * Axios with CSRF Protection
 * Pre-configured axios instance with automatic CSRF token management
 * 
 * Usage:
 * ```typescript
 * import { api } from './axios-csrf';
 * 
 * // CSRF token is automatically added to POST/PUT/PATCH/DELETE requests
 * const response = await api.post('/api/v1/auth/login', { email, password });
 * ```
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// CSRF token cache
let csrfToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;
let retryCount = 0;

// Configuration
const config = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  tokenEndpoint: '/api/v1/auth/csrf-token',
  maxRetries: 1,
  debug: process.env.NODE_ENV === 'development',
};

// Logging helpers
const log = (...args: any[]) => {
  if (config.debug) {
    console.log('[Axios CSRF]', ...args);
  }
};

const logError = (...args: any[]) => {
  console.error('[Axios CSRF]', ...args);
};

/**
 * Fetch CSRF token from server
 */
async function fetchCSRFToken(): Promise<string | null> {
  // If already fetching, wait for that promise
  if (tokenFetchPromise) {
    log('Token fetch already in progress, waiting...');
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      const url = `${config.baseURL}${config.tokenEndpoint}`;
      log('Fetching token from:', url);

      const response = await axios.get(url, {
        withCredentials: true,
      });

      const token = response.data?.token || 
                   response.data?.data?.token || 
                   response.data?.data?.csrfToken ||
                   response.headers['x-csrf-token'];

      if (!token) {
        throw new Error('Token not found in response');
      }

      log('Token fetched successfully');
      csrfToken = token;
      retryCount = 0;
      return token;
    } catch (error: any) {
      logError('Token fetch failed:', error.message);
      csrfToken = null;
      return null;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

/**
 * Check if error is CSRF-related
 */
function isCsrfError(error: AxiosError): boolean {
  if (error.response?.status === 403) {
    const code = (error.response?.data as any)?.code || '';
    return ['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID', 
            'CSRF_TOKEN_EXPIRED', 'CSRF_TOKEN_MISMATCH',
            'CSRF_ORIGIN_INVALID'].includes(code);
  }
  return false;
}

/**
 * Create axios instance with CSRF protection
 */
export function createApiWithCSRF(): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    withCredentials: true, // CRITICAL: Send cookies with every request
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Add CSRF token to unsafe methods
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const method = config.method?.toLowerCase();
      
      // Only add CSRF token for state-changing requests
      if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        // Get or fetch token
        if (!csrfToken) {
          log('No token cached, fetching...');
          await fetchCSRFToken();
        }

        if (csrfToken && config.headers) {
          config.headers['X-CSRF-Token'] = csrfToken;
          log(`Adding CSRF token to ${method.toUpperCase()} ${config.url}`);
        } else {
          logError('Failed to add CSRF token - token is null');
        }
      }
      
      return config;
    },
    (error) => {
      logError('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor: Update token and handle errors
  instance.interceptors.response.use(
    (response) => {
      // Update token from response header if present
      const newToken = response.headers['x-csrf-token'];
      if (newToken && newToken !== csrfToken) {
        log('Token updated from response header');
        csrfToken = newToken;
      }
      return response;
    },
    async (error: AxiosError) => {
      // Auto-retry on CSRF errors
      if (isCsrfError(error) && 
          error.config && 
          !(error.config as any)._csrfRetry &&
          retryCount < config.maxRetries) {
        
        log('CSRF error detected, retrying with fresh token...');
        (error.config as any)._csrfRetry = true;
        retryCount++;
        
        // Fetch fresh token
        const newToken = await fetchCSRFToken();
        if (newToken && error.config.headers) {
          error.config.headers['X-CSRF-Token'] = newToken;
          log('Retrying request with new token');
          return instance.request(error.config); // Retry request
        }
      }
      
      // Reset retry count on other errors
      if (!isCsrfError(error)) {
        retryCount = 0;
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Pre-configured API instance
 * Use this throughout your app
 */
export const api = createApiWithCSRF();

/**
 * Manually fetch CSRF token (optional)
 * Usually not needed as it's handled automatically
 */
export async function refreshCSRFToken(): Promise<string | null> {
  log('Manually refreshing CSRF token');
  return fetchCSRFToken();
}

/**
 * Clear cached CSRF token (call on logout)
 */
export function clearCSRFToken(): void {
  log('Clearing CSRF token');
  csrfToken = null;
  retryCount = 0;
}

/**
 * Get current cached token (for debugging)
 */
export function getCurrentToken(): string | null {
  return csrfToken;
}

// Export default
export default api;

/**
 * Example usage:
 * 
 * // Login
 * import { api } from './axios-csrf';
 * 
 * async function login(email: string, password: string) {
 *   try {
 *     const response = await api.post('/api/v1/auth/login', { email, password });
 *     return response.data;
 *   } catch (error) {
 *     console.error('Login failed:', error);
 *     throw error;
 *   }
 * }
 * 
 * // Register
 * async function register(userData: any) {
 *   const response = await api.post('/api/v1/auth/register', userData);
 *   return response.data;
 * }
 * 
 * // Logout
 * import { clearCSRFToken } from './axios-csrf';
 * 
 * async function logout() {
 *   await api.post('/api/v1/auth/logout');
 *   clearCSRFToken(); // Clear cached token
 * }
 */
