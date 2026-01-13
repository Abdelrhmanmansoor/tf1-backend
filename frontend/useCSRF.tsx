/**
 * React Hook for CSRF Token Management
 * 
 * Usage:
 * ```tsx
 * import { useCSRF } from './useCSRF';
 * 
 * function LoginForm() {
 *   const { token, loading, error, refetch, fetchWithCSRF } = useCSRF();
 * 
 *   async function handleLogin(email, password) {
 *     const response = await fetchWithCSRF('/api/v1/auth/login', {
 *       method: 'POST',
 *       body: JSON.stringify({ email, password })
 *     });
 *     const data = await response.json();
 *     return data;
 *   }
 * 
 *   return <form>...</form>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCSRFOptions {
  baseURL?: string;
  tokenEndpoint?: string;
  autoFetch?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<string | null>;
  clearToken: () => void;
  fetchWithCSRF: (url: string, options?: RequestInit) => Promise<Response>;
}

export function useCSRF(options: UseCSRFOptions = {}): UseCSRFReturn {
  const {
    baseURL = 'http://localhost:4000',
    tokenEndpoint = '/api/v1/auth/csrf-token',
    autoFetch = true,
    retryOnError = true,
    maxRetries = 1,
  } = options;

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Fetch CSRF token from server
   */
  const fetchToken = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const url = `${baseURL}${tokenEndpoint}`;
      console.log('[useCSRF] Fetching token from:', url);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // CRITICAL
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      const newToken = data.token || data.data?.token || data.data?.csrfToken;

      if (!newToken) {
        throw new Error('Token not found in response');
      }

      console.log('[useCSRF] Token fetched successfully');
      setToken(newToken);
      retryCountRef.current = 0;
      return newToken;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch CSRF token';
      console.error('[useCSRF] Error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseURL, tokenEndpoint]);

  /**
   * Clear token (call on logout)
   */
  const clearToken = useCallback(() => {
    console.log('[useCSRF] Token cleared');
    setToken(null);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  /**
   * Check if error is CSRF-related
   */
  const isCsrfError = useCallback((response: Response, data: any): boolean => {
    if (response.status === 403) {
      const code = data?.code || '';
      return ['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID', 
              'CSRF_TOKEN_EXPIRED', 'CSRF_TOKEN_MISMATCH',
              'CSRF_ORIGIN_INVALID'].includes(code);
    }
    return false;
  }, []);

  /**
   * Enhanced fetch with automatic CSRF token injection
   */
  const fetchWithCSRF = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const method = (options.method || 'GET').toUpperCase();
    
    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      let currentToken = token;
      
      // Fetch token if not available
      if (!currentToken) {
        console.log('[useCSRF] No token available, fetching...');
        currentToken = await fetchToken();
        if (!currentToken) {
          throw new Error('Failed to obtain CSRF token');
        }
      }

      options.headers = {
        ...options.headers,
        'X-CSRF-Token': currentToken,
      };
    }

    // Ensure credentials are included
    options.credentials = options.credentials || 'include';

    // Make request
    const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
    console.log(`[useCSRF] ${method} ${fullUrl}`);

    const response = await fetch(fullUrl, options);

    // Handle CSRF errors with auto-retry
    if (response.status === 403 && retryOnError && retryCountRef.current < maxRetries) {
      const errorData = await response.clone().json().catch(() => ({}));
      
      if (isCsrfError(response, errorData)) {
        console.log('[useCSRF] CSRF error detected, retrying with fresh token...');
        retryCountRef.current++;
        
        // Fetch fresh token
        const newToken = await fetchToken();
        if (newToken && options.headers) {
          (options.headers as any)['X-CSRF-Token'] = newToken;
          return fetch(fullUrl, options); // Retry
        }
      }
    }

    return response;
  }, [token, baseURL, fetchToken, isCsrfError, retryOnError, maxRetries]);

  /**
   * Auto-fetch token on mount
   */
  useEffect(() => {
    if (autoFetch && !token && !loading) {
      fetchToken();
    }
  }, [autoFetch, token, loading, fetchToken]);

  return {
    token,
    loading,
    error,
    refetch: fetchToken,
    clearToken,
    fetchWithCSRF,
  };
}

/**
 * Example usage in component
 */
export function ExampleLoginForm() {
  const { fetchWithCSRF, loading, error } = useCSRF();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetchWithCSRF('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      console.log('Login successful:', data);
    } catch (err: any) {
      console.error('Login error:', err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
