import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Set up axios defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
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
        const response = await axios.get(`${API_URL}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.valid) {
          setUser(response.data.user);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      // Clear any previous auth headers
      delete axios.defaults.headers.common['Authorization'];

      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      // Check if token was returned
      if (!response.data.token) {
        console.error('No token received');
        return false;
      }

      // Store token
      const token = response.data.token;
      localStorage.setItem('token', token);
      
      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Get user data
      const userResponse = await axios.get(`${API_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (userResponse.data.valid) {
        setUser(userResponse.data.user);
        setIsLoggedIn(true);
        return true;
      }
      
      // If verification failed
      localStorage.removeItem('token');
      return false;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsLoggedIn(false);
  };

  // Role-based permissions
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