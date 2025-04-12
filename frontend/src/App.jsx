import './index.css'
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from './pages/Home'
import AdminPanel from './pages/AdminPanel'
import { Toaster } from "react-hot-toast";
import Navbar from './components/Navbar';
import DonorPanel from './pages/DonorPanel';
import ReceiverPanel from './pages/ReceiverPanel';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

// Protected route component
const ProtectedRoute = ({ element, requiredRole }) => {
  const { loading, isAuthenticated, hasRole } = useContext(AuthContext);

  // Show loading state
  if (loading) {
    return React.createElement(
      'div',
      { className: "min-h-screen bg-green-50 flex items-center justify-center" },
      React.createElement('div', { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" })
    );
  }

  // Check authentication and role
  if (!isAuthenticated) {
    return React.createElement(Navigate, { to: "/", replace: true });
  }

  // If role is required, check if user has that role
  if (requiredRole && !hasRole(requiredRole)) {
    return React.createElement(Navigate, { to: "/", replace: true });
  }

  return element;
};

const AppRoutes = () => {
  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: "/", element: React.createElement(Home, null) }),
    // Allow direct access to donor and receiver panels
    React.createElement(Route, {
      path: "/receiver",
      element: React.createElement(ReceiverPanel, null)
    }),
    React.createElement(Route, {
      path: "/admin",
      element: React.createElement(ProtectedRoute, {
        element: React.createElement(AdminPanel, null),
        requiredRole: "admin"
      })
    }),
    React.createElement(Route, {
      path: "/donor",
      element: React.createElement(DonorPanel, null)
    })
  );
};

const App = () => {
  return React.createElement(
    AuthProvider,
    null,
    React.createElement(
      SocketProvider,
      null,
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(Navbar, null),
        React.createElement(AppRoutes, null),
        React.createElement(Toaster, { position: "top-right" })
      )
    )
  );
}

export default App
