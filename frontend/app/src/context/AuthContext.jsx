import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    // Check sessionStorage first, then localStorage for backward compatibility during migration
    let storedUser = sessionStorage.getItem('user');
    if (!storedUser) {
      storedUser = localStorage.getItem('user');
    }
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    // Handle back button prevention
    const handlePopState = () => {
      if (isLoggedOut || !localStorage.getItem('token')) {
        // Redirect to login if trying to go back after logout
        window.location.replace('/login');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Prevent browser caching of authenticated pages
    window.addEventListener('beforeunload', () => {
      if (!localStorage.getItem('token')) {
        // Clear session on page unload if logged out
        sessionStorage.clear();
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoggedOut]);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      const { user, accessToken, refreshToken, requiresVerification } = response.data.data || response.data;
      
      if (accessToken) {
        // Store tokens in sessionStorage (cleared when tab closes)
        // NOT localStorage (persistent and XSS vulnerable)
        sessionStorage.setItem('accessToken', accessToken);
        
        // Refresh token is stored in httpOnly cookie by server
        if (refreshToken) {
          sessionStorage.setItem('refreshToken', refreshToken);
        }
        
        // Store user info
        sessionStorage.setItem('user', JSON.stringify(user));
        // Also keep in localStorage for backward compatibility during migration
        localStorage.setItem('user', JSON.stringify(user));
        
        setUser(user);
        setIsLoggedOut(false);
      }
      
      return { 
        success: true, 
        user,
        requiresVerification 
      };
    } catch (error) {
      const errorData = error.response?.data;
      let errorMessage = 'فشل تسجيل الدخول';
      
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map(e => e.message).join('، ');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const register = async (data) => {
    try {
      const response = await authService.register(data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = error.response?.data;
      let errorMessage = 'فشل التسجيل';
      
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map(e => e.message).join('، ');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Clear all authentication data from both storages
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    sessionStorage.clear();
    
    setUser(null);
    setIsLoggedOut(true);

    // Prevent back button from showing cached page
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, null, window.location.href);
    });

    // Redirect using replace (removes logout from history)
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
