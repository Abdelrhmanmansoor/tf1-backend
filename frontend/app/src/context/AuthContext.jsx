import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { user, accessToken, requiresVerification } = response.data;
      
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
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
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
