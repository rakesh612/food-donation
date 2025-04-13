import './index.css'
import React from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './pages/Home'
import AdminPanel from './pages/AdminPanel'
import { Toaster } from "react-hot-toast";
import Navbar from './components/Navbar';
import DonorPanel from './pages/DonorPanel';
import ReceiverPanel from './pages/ReceiverPanel';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Note: We're keeping this component for future use with other protected routes
// Currently not used as AdminPanel handles its own authentication
/*
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
    console.log('User not authenticated, redirecting to home');
    return React.createElement(Navigate, { to: "/", replace: true });
  }

  // If role is required, check if user has that role
  if (requiredRole && !hasRole(requiredRole)) {
    console.log(`User does not have required role: ${requiredRole}, redirecting to home`);
    return React.createElement(Navigate, { to: "/", replace: true });
  }

  return element;
};
*/

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
    // Admin route
    React.createElement(Route, {
      path: "/admin",
      element: React.createElement(AdminPanel, null)
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
