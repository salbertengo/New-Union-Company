import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const apiClient = axios.create({
  baseURL: API_URL
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear authentication data
      localStorage.removeItem('token');
      
      // Force logout and redirect
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;