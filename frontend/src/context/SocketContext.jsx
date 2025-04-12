import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Only connect if user is authenticated
    if (user && user.id) {
      // Create socket connection
      const newSocket = io('http://localhost:5002', {
        auth: {
          token: localStorage.getItem('accessToken')
        }
      });

      // Socket event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Handle notifications based on user role
      if (user.role === 'donor') {
        setupDonorEvents(newSocket);
      } else if (user.role === 'receiver') {
        setupReceiverEvents(newSocket);
      } else if (user.role === 'admin') {
        setupAdminEvents(newSocket);
      }

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Setup donor-specific socket events
  const setupDonorEvents = (socket) => {
    socket.on('donation-accepted', (data) => {
      addNotification({
        type: 'donation-accepted',
        message: `Your donation has been accepted by ${data.receiverName}`,
        data
      });
    });

    socket.on('donation-picked', (data) => {
      addNotification({
        type: 'donation-picked',
        message: 'Your donation has been picked up',
        data
      });
    });

    socket.on('donation-verified', (data) => {
      addNotification({
        type: 'donation-verified',
        message: 'Your donation has been verified by an admin',
        data
      });
    });
  };

  // Setup receiver-specific socket events
  const setupReceiverEvents = (socket) => {
    socket.on('new-food-post-available', (data) => {
      addNotification({
        type: 'new-food-post',
        message: `New food donation available from ${data.donorName}`,
        data
      });
    });

    socket.on('pickup-verified', (data) => {
      addNotification({
        type: 'pickup-verified',
        message: 'Your pickup has been verified by an admin',
        data
      });
    });

    socket.on('verification-status-changed', (data) => {
      if (data.isVerified) {
        addNotification({
          type: 'account-verified',
          message: 'Your account has been verified',
          data
        });
      }
    });
  };

  // Setup admin-specific socket events
  const setupAdminEvents = (socket) => {
    socket.on('new-food-post-created', (data) => {
      addNotification({
        type: 'new-food-post',
        message: `New food donation posted by ${data.donorName}`,
        data
      });
    });

    socket.on('food-post-status-changed', (data) => {
      addNotification({
        type: 'status-change',
        message: `Food post status changed to ${data.status}`,
        data
      });
    });

    socket.on('food-post-expired', (data) => {
      addNotification({
        type: 'post-expired',
        message: 'Food post has expired',
        data
      });
    });

    socket.on('user-verified', (data) => {
      addNotification({
        type: 'user-verified',
        message: `User ${data.name} has been verified`,
        data
      });
    });
  };

  // Add a new notification
  const addNotification = (notification) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        timestamp: new Date(),
        read: false,
        ...notification
      },
      ...prev
    ]);
  };

  // Mark a notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Join a specific food post room
  const joinFoodPostRoom = (postId) => {
    if (socket && connected) {
      socket.emit('join-food-post', postId);
    }
  };

  // Update location for delivery tracking
  const updateLocation = (postId, location) => {
    if (socket && connected) {
      socket.emit('update-location', { postId, location });
    }
  };

  // Update food post status
  const updateFoodPostStatus = (postId, status) => {
    if (socket && connected) {
      socket.emit('update-food-post-status', { postId, status });
    }
  };

  // Verify a user (admin only)
  const verifyUser = (userId) => {
    if (socket && connected && user.role === 'admin') {
      socket.emit('verify-user', userId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        markNotificationAsRead,
        clearNotifications,
        joinFoodPostRoom,
        updateLocation,
        updateFoodPostStatus,
        verifyUser
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
