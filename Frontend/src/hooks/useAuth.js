import { useState, useEffect, createContext, useContext } from 'react';

const API_URL = process.env.REACT_APP_API_URL;
console.log("API_URL desde React:", API_URL);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verify token on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error("Invalid response");

        const data = await response.json();

        if (data.valid) {
          setUser(data.user);
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

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        console.error('Login failed with status:', response.status);
        return false;
      }

      const data = await response.json();
      const token = data.token;

      if (!token) {
        console.error('No token received');
        return false;
      }

      localStorage.setItem('token', token);

      const userResponse = await fetch(`${API_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        console.error('Token verification failed');
        localStorage.removeItem('token');
        return false;
      }

      const userData = await userResponse.json();

      if (userData.valid) {
        setUser(userData.user);
        setIsLoggedIn(true);
        return true;
      } else {
        localStorage.removeItem('token');
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
