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

      console.log('Fetching user profile with token');

      // Use direct axios call instead of api instance
      const res = await axios.get('http://localhost:5002/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('User profile response:', res.data);

      // Make sure user object has the correct structure
      const userData = {
        id: res.data.id || res.data._id,
        email: res.data.email,
        name: res.data.name,
        role: res.data.role,
        isVerified: res.data.isVerified
      };

      setUser(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      // Only clear tokens if it's an auth error
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
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
      console.log('Attempting login with:', email);

      // Use direct axios call instead of api instance
      const res = await axios.post('http://localhost:5002/api/auth/login', {
        email,
        password,
      });

      console.log('Login response:', res.data);

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);

      // Make sure user object has the correct structure
      const userData = {
        id: res.data.user.id || res.data.user._id,
        email: res.data.user.email,
        name: res.data.user.name,
        role: res.data.user.role || 'user' // Default to 'user' if role is not provided
      };

      // Log the user data for debugging
      console.log('User data after login:', userData);

      setUser(userData);
      toast.success(`Login successful as ${userData.role}!`);
      return res.data;
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setAuthError(errorMessage);
      toast.error(errorMessage);
      throw error.response?.data || { message: errorMessage };
    }
  };

  // Register function
  const register = async (data) => {
    try {
      setAuthError(null);
      console.log('Attempting registration with:', data.email);

      // Use direct axios call instead of api instance
      const res = await axios.post('http://localhost:5002/api/auth/register', data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Registration response:', res.data);

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);

      // Make sure user object has the correct structure
      const userData = {
        id: res.data.user.id || res.data.user._id,
        email: res.data.user.email,
        name: res.data.user.name,
        role: res.data.user.role
      };

      setUser(userData);
      toast.success('Registration successful!');
      return res.data;
    } catch (error) {
      console.error('Registration error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
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
      localStorage.removeItem('receiverVerified'); // Clear verification status
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    console.log('Checking role:', role, 'User:', user);
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