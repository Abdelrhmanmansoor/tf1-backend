/**
 * CSRF Manager - Frontend Helper
 * Manages CSRF tokens for secure API requests
 * 
 * Features:
 * - Automatic token fetching and caching
 * - Auto-retry on token errors
 * - TypeScript support
 * - Works with fetch API and axios
 * 
 * Usage:
 * ```typescript
 * import { csrfManager } from './csrf-manager';
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

export interface CSRFConfig {
  baseURL?: string;
  tokenEndpoint?: string;
  retryOnError?: boolean;
  maxRetries?: number;
  debug?: boolean;
}

export class CSRFManager {
  private token: string | null = null;
  private tokenFetchPromise: Promise<string | null> | null = null;
  private config: Required<CSRFConfig>;
  private retryCount = 0;

  constructor(config: CSRFConfig = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:4000',
      tokenEndpoint: config.tokenEndpoint || '/api/v1/auth/csrf-token',
      retryOnError: config.retryOnError !== false,
      maxRetries: config.maxRetries || 1,
      debug: config.debug || false,
    };

    this.log('CSRF Manager initialized', this.config);
  }

  private log(message: string, ...args: any[]) {
    if (this.config.debug) {
      console.log(`[CSRF Manager] ${message}`, ...args);
    }
  }

  private error(message: string, ...args: any[]) {
    console.error(`[CSRF Manager] ${message}`, ...args);
  }

  /**
   * Get CSRF token (cached or fetch new)
   * @param forceRefresh - Force fetch new token even if cached
   */
  async getToken(forceRefresh = false): Promise<string | null> {
    // Return cached token if available and not forcing refresh
    if (!forceRefresh && this.token) {
      this.log('Using cached token');
      return this.token;
    }

    // If already fetching, wait for that promise
    if (this.tokenFetchPromise) {
      this.log('Token fetch already in progress, waiting...');
      return this.tokenFetchPromise;
    }

    // Fetch new token
    this.tokenFetchPromise = this.fetchToken();
    try {
      const token = await this.tokenFetchPromise;
      this.token = token;
      this.retryCount = 0; // Reset retry count on success
      return token;
    } finally {
      this.tokenFetchPromise = null;
    }
  }

  /**
   * Fetch token from server
   */
  private async fetchToken(): Promise<string | null> {
    try {
      const url = `${this.config.baseURL}${this.config.tokenEndpoint}`;
      this.log('Fetching token from', url);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // CRITICAL: Include cookies
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
    } catch (error: any) {
      this.error('Token fetch failed:', error.message);
      return null;
    }
  }

  /**
   * Clear cached token (call on logout or error)
   */
  clearToken(): void {
    this.log('Token cleared');
    this.token = null;
    this.retryCount = 0;
  }

  /**
   * Check if error is CSRF-related
   */
  private isCsrfError(error: any): boolean {
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
   * @param url - URL to fetch (relative or absolute)
   * @param options - Fetch options
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const method = (options.method || 'GET').toUpperCase();
    
    // Add CSRF token for state-changing requests
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

    // Ensure credentials are included
    options.credentials = options.credentials || 'include';

    // Make request
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    this.log(`${method} ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, options);

      // Check for CSRF errors
      if (response.status === 403 && this.config.retryOnError && this.retryCount < this.config.maxRetries) {
        const errorData = await response.clone().json().catch(() => ({}));
        
        if (this.isCsrfError({ response: { status: 403, data: errorData } })) {
          this.log('CSRF error detected, retrying with fresh token...');
          this.retryCount++;
          
          // Fetch fresh token and retry
          const newToken = await this.getToken(true);
          if (newToken && options.headers) {
            (options.headers as any)['X-CSRF-Token'] = newToken;
            return fetch(fullUrl, options); // Retry request
          }
        }
      }

      return response;
    } catch (error) {
      this.error('Request failed:', error);
      throw error;
    }
  }

  /**
   * Axios interceptor configuration
   * Use this with axios instance
   */
  getAxiosInterceptors() {
    return {
      request: async (config: any) => {
        const method = config.method?.toLowerCase();
        
        // Add CSRF token for state-changing requests
        if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
          const token = await this.getToken();
          if (token && config.headers) {
            config.headers['X-CSRF-Token'] = token;
          }
        }
        
        return config;
      },
      
      response: {
        success: (response: any) => {
          // Update token from response header if present
          const newToken = response.headers['x-csrf-token'];
          if (newToken) {
            this.token = newToken;
            this.log('Token updated from response header');
          }
          return response;
        },
        
        error: async (error: any) => {
          // Auto-retry on CSRF errors
          if (this.isCsrfError(error) && 
              this.config.retryOnError && 
              error.config && 
              !error.config._csrfRetry &&
              this.retryCount < this.config.maxRetries) {
            
            this.log('CSRF error detected, retrying with fresh token...');
            error.config._csrfRetry = true;
            this.retryCount++;
            
            // Fetch fresh token
            const newToken = await this.getToken(true);
            if (newToken && error.config.headers) {
              error.config.headers['X-CSRF-Token'] = newToken;
              
              // You need to return axios.request(error.config) here
              // This will be handled by axios interceptor
              return error.config;
            }
          }
          
          throw error;
        }
      }
    };
  }
}

// Singleton instance
export const csrfManager = new CSRFManager({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  debug: process.env.NODE_ENV === 'development',
});

// Export default
export default csrfManager;
