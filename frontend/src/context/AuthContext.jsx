import React from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5002/api', // Updated port to 5002
  withCredentials: false, // Changed to false for development
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to include credentials
api.interceptors.request.use(function (config) {
  // Add authorization header if token exists
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post('http://localhost:5002/api/auth/refresh-token', {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Update the authorization header
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh token is invalid, clear storage and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Function to get user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Use direct axios call instead of api instance
      const res = await axios.get('http://localhost:5002/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Only clear tokens if it's an auth error
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Login function
  const login = async (email, password) => {
    try {
      setAuthError(null);
      // Use direct axios call instead of api instance
      const res = await axios.post('http://localhost:5002/api/auth/login', {
        email,
        password,
      });

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
      toast.success('Login successful!');
      return res.data;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      setAuthError(errorMessage);
      toast.error(errorMessage);
      throw error.response?.data || { message: errorMessage };
    }
  };

  // Register function
  const register = async (data) => {
    try {
      setAuthError(null);
      // Use direct axios call instead of api instance
      const res = await axios.post('http://localhost:5002/api/auth/register', data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
      toast.success('Registration successful!');
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setAuthError(errorMessage);
      toast.error(errorMessage);
      throw error.response?.data || { message: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Use direct axios call instead of api instance
        await axios.post('http://localhost:5002/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    return user && user.role === role;
  }, [user]);

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        login,
        register,
        logout,
        loading,
        authError,
        setAuthError,
        hasRole,
        isAuthenticated: !!user,
        fetchUserProfile
      }
    },
    children
  );
};