import { useState, useEffect, createContext, useContext } from 'react';
import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL;
console.log("API_URL desde React:", API_URL);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Handle forced logout from anywhere in the app
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setIsLoggedIn(false);
      
      // If not already on login page, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Verify token on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/verify');
        
        if (response.data && response.data.valid) {
          setUser(response.data.user);
          setIsLoggedIn(true);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        username, 
        password
      });

      const data = response.data;
      const token = data.token;

      if (!token) {
        console.error('No token received');
        return false;
      }

      localStorage.setItem('token', token);

      try {
        const userResponse = await apiClient.get('/auth/verify');
        
        if (userResponse.data.valid) {
          setUser(userResponse.data.user);
          setIsLoggedIn(true);
          return true;
        } else {
          logout();
          return false;
        }
      } catch (error) {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsLoggedIn(false);
  };

  const isAdmin = () => user?.role === 'admin';
  const isMechanic = () => user?.role === 'mechanic';

  const value = {
    user,
    isLoggedIn,
    loading,
    login,
    logout,
    isAdmin,
    isMechanic
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);