/**
 * CSRF Manager - Frontend Helper (JavaScript Version)
 * Manages CSRF tokens for secure API requests
 * 
 * Features:
 * - Automatic token fetching and caching
 * - Auto-retry on token errors
 * - Works with fetch API and axios
 * 
 * Usage:
 * ```javascript
 * import { csrfManager } from './csrf-manager.js';
 * 
 * // Get token
 * const token = await csrfManager.getToken();
 * 
 * // Use in fetch
 * await csrfManager.fetch('/api/v1/auth/login', {
 *   method: 'POST',
 *   body: JSON.stringify({ email, password })
 * });
 * ```
 */

export class CSRFManager {
  constructor(config = {}) {
    this.token = null;
    this.tokenFetchPromise = null;
    this.retryCount = 0;
    
    this.config = {
      baseURL: config.baseURL || 'http://localhost:4000',
      tokenEndpoint: config.tokenEndpoint || '/api/v1/auth/csrf-token',
      retryOnError: config.retryOnError !== false,
      maxRetries: config.maxRetries || 1,
      debug: config.debug || false,
    };

    this.log('CSRF Manager initialized', this.config);
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log(`[CSRF Manager] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[CSRF Manager] ${message}`, ...args);
  }

  /**
   * Get CSRF token (cached or fetch new)
   */
  async getToken(forceRefresh = false) {
    if (!forceRefresh && this.token) {
      this.log('Using cached token');
      return this.token;
    }

    if (this.tokenFetchPromise) {
      this.log('Token fetch already in progress, waiting...');
      return this.tokenFetchPromise;
    }

    this.tokenFetchPromise = this.fetchToken();
    try {
      const token = await this.tokenFetchPromise;
      this.token = token;
      this.retryCount = 0;
      return token;
    } finally {
      this.tokenFetchPromise = null;
    }
  }

  /**
   * Fetch token from server
   */
  async fetchToken() {
    try {
      const url = `${this.config.baseURL}${this.config.tokenEndpoint}`;
      this.log('Fetching token from', url);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const token = data.token || data.data?.token || data.data?.csrfToken;

      if (!token) {
        throw new Error('Token not found in response');
      }

      this.log('Token fetched successfully');
      return token;
    } catch (error) {
      this.error('Token fetch failed:', error.message);
      return null;
    }
  }

  /**
   * Clear cached token
   */
  clearToken() {
    this.log('Token cleared');
    this.token = null;
    this.retryCount = 0;
  }

  /**
   * Check if error is CSRF-related
   */
  isCsrfError(error) {
    if (error?.response?.status === 403) {
      const code = error.response?.data?.code || '';
      return ['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID', 
              'CSRF_TOKEN_EXPIRED', 'CSRF_TOKEN_MISMATCH',
              'CSRF_ORIGIN_INVALID'].includes(code);
    }
    return false;
  }

  /**
   * Enhanced fetch with automatic CSRF token injection
   */
  async fetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const token = await this.getToken();
      if (!token) {
        throw new Error('Failed to obtain CSRF token');
      }

      options.headers = {
        ...options.headers,
        'X-CSRF-Token': token,
      };
    }

    options.credentials = options.credentials || 'include';

    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    this.log(`${method} ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, options);

      if (response.status === 403 && this.config.retryOnError && this.retryCount < this.config.maxRetries) {
        const errorData = await response.clone().json().catch(() => ({}));
        
        if (this.isCsrfError({ response: { status: 403, data: errorData } })) {
          this.log('CSRF error detected, retrying with fresh token...');
          this.retryCount++;
          
          const newToken = await this.getToken(true);
          if (newToken && options.headers) {
            options.headers['X-CSRF-Token'] = newToken;
            return fetch(fullUrl, options);
          }
        }
      }

      return response;
    } catch (error) {
      this.error('Request failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const csrfManager = new CSRFManager({
  baseURL: typeof window !== 'undefined' && window.ENV?.API_URL || 'http://localhost:4000',
  debug: process.env.NODE_ENV === 'development',
});

export default csrfManager;
