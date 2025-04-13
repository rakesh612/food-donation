import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { toast } from 'react-hot-toast';

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
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Socket event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      newSocket.on('connect_timeout', () => {
        console.error('Socket connection timeout');
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        setConnected(true);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket reconnection attempt #${attemptNumber}`);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
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

    socket.on('donation-fields-updated', (data) => {
      addNotification({
        type: 'donation-fields-updated',
        message: 'Your donation details have been updated',
        data
      });
    });
  };

  // Setup receiver-specific socket events
  const setupReceiverEvents = (socket) => {
    socket.on('new-food-post-available', (data) => {
      console.log('New food post available:', data);
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
        // Save verification status to localStorage
        localStorage.setItem('receiverVerified', 'true');

        // Show a more detailed notification
        addNotification({
          type: 'account-verified',
          message: 'Your account has been verified by an administrator',
          data
        });

        // Show a toast notification
        toast.success('Your account has been verified by an administrator! You can now access food donations.', {
          duration: 6000,
          icon: '✅'
        });

        // Reload the page to ensure verification status is applied
        window.location.reload();
      }
    });

    socket.on('pickup-fields-updated', (data) => {
      console.log('Donation fields updated:', data);
      addNotification({
        type: 'pickup-fields-updated',
        message: 'A donation you accepted has been updated',
        data
      });
    });

    socket.on('food-post-status-changed', (data) => {
      console.log('Food post status changed:', data);
      addNotification({
        type: 'status-changed',
        message: `Food donation status changed to ${data.status}`,
        data
      });
    });

    socket.on('food-post-fields-updated', (data) => {
      console.log('Food post fields updated:', data);
      addNotification({
        type: 'fields-updated',
        message: 'Food donation details have been updated',
        data
      });
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

    socket.on('food-post-fields-changed', (data) => {
      addNotification({
        type: 'fields-changed',
        message: `Food donation details have been updated`,
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

  // Update food post fields (food type, category, expiry date, pickup time)
  const updateFoodPostFields = (postId, fields) => {
    if (socket && connected) {
      console.log('Updating food post fields via socket:', { postId, ...fields });
      socket.emit('update-food-post-fields', { postId, ...fields });
      return true;
    } else {
      console.warn('Socket not connected, cannot update fields in real-time');
      // Fallback to REST API if socket is not connected
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          console.log('Attempting to update via REST API as fallback');
          // This is a fallback mechanism - in a real app, you would implement the API call here
          // For now, we'll just log the attempt
          return false;
        }
      } catch (error) {
        console.error('Failed to update fields:', error);
      }
      return false;
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
        updateFoodPostFields,
        verifyUser
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
