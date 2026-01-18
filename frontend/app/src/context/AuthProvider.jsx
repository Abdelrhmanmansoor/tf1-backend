import { useState, useEffect } from 'react';
import { authService } from '../config/api';
import { AuthContext } from './AuthContext';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    let storedUser = sessionStorage.getItem('user');
    if (!storedUser) {
      storedUser = localStorage.getItem('user');
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    const handlePopState = () => {
      if (isLoggedOut || !localStorage.getItem('token')) {
        window.location.replace('/login');
      }
    };

    window.addEventListener('popstate', handlePopState);

    window.addEventListener('beforeunload', () => {
      if (!localStorage.getItem('token')) {
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

      const { user, accessToken, refreshToken, requiresVerification } =
        response.data.data || response.data;

      if (accessToken) {
        sessionStorage.setItem('accessToken', accessToken);

        if (refreshToken) {
          sessionStorage.setItem('refreshToken', refreshToken);
        }

        sessionStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));

        setUser(user);
        setIsLoggedOut(false);
      }

      return {
        success: true,
        user,
        requiresVerification,
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

  const register = async data => {
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

  const logout = async () => {
    try {
      await authService.logout().catch(err => {
        console.warn('Logout endpoint failed:', err);
      });
    } catch (error) {
      console.warn('Logout service error:', error);
    } finally {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      sessionStorage.clear();
      localStorage.clear();

      setUser(null);
      setIsLoggedOut(true);

      window.history.pushState(null, null, window.location.href);
      window.addEventListener('popstate', () => {
        window.history.pushState(null, null, window.location.href);
      });

      setTimeout(() => {
        window.location.replace('/login');
      }, 100);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

