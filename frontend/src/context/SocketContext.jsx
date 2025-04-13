import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useContext(AuthContext);
  const [socketUrl, setSocketUrl] = useState('');

  // Function to get the socket URL
  const getSocketUrl = useCallback(() => {
    // First try environment variable
    if (process.env.REACT_APP_SOCKET_URL) {
      return process.env.REACT_APP_SOCKET_URL;
    }
    
    // Then try localStorage (for dynamic port)
    const savedApiUrl = localStorage.getItem('API_URL');
    if (savedApiUrl) {
      // Convert API URL to socket URL (remove /api and add socket.io path)
      return savedApiUrl.replace('/api', '');
    }
    
    // Default to localhost with default port
    return 'http://localhost:5003';
  }, []);

  // Function to discover socket URL
  const discoverSocketUrl = useCallback(async () => {
    // Try common ports
    const ports = [5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011];
    
    for (const port of ports) {
      try {
        const url = `http://localhost:${port}/socket.io/?EIO=4&transport=polling`;
        const response = await axios.get(url, { timeout: 1000 });
        if (response.status === 200) {
          const newSocketUrl = `http://localhost:${port}`;
          setSocketUrl(newSocketUrl);
          return newSocketUrl;
        }
      } catch (err) {
        // Continue to next port
        console.log(`Socket port ${port} not available`);
      }
    }
    
    throw new Error('Could not find Socket.IO server');
  }, []);

  useEffect(() => {
    if (user && user.id) {
      // Clear any cached socket URLs
      localStorage.removeItem('SOCKET_URL');
      
      const initializeSocket = async () => {
        try {
          // Get socket URL
          let currentSocketUrl = getSocketUrl();
          
          // If we don't have a socket URL yet, try to discover it
          if (!currentSocketUrl) {
            try {
              currentSocketUrl = await discoverSocketUrl();
            } catch (err) {
              console.error('Could not discover socket URL:', err);
              return;
            }
          }
          
          // Create socket connection
          const newSocket = io(currentSocketUrl, {
            auth: {
              token: localStorage.getItem('accessToken')
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
            forceNew: true
          });

          newSocket.on('connect', () => {
            console.log('Socket connected successfully');
            setConnected(true);
          });

          newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            setConnected(false);
            
            // If connection fails, try to discover a new socket URL
            if (error.message.includes('xhr poll error') || error.message.includes('transport error')) {
              discoverSocketUrl().catch(err => {
                console.error('Failed to discover new socket URL:', err);
              });
            }
          });

          newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setConnected(false);
            if (reason === 'io server disconnect') {
              // Server initiated disconnect, try to reconnect
              newSocket.connect();
            }
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
            setConnected(false);
          });

          setSocket(newSocket);

          return () => {
            if (newSocket) {
              newSocket.disconnect();
            }
          };
        } catch (error) {
          console.error('Error initializing socket:', error);
        }
      };

      initializeSocket();
    }
  }, [user, getSocketUrl, discoverSocketUrl]);

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

      // Show a toast notification
      toast.success(`New food donation available from ${data.donorName || 'a donor'}!`, {
        icon: '🍲', // Food emoji
        duration: 5000
      });

      // Add a notification
      addNotification({
        type: 'new-food-post',
        message: `New food donation available from ${data.donorName || 'a donor'}`,
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
  const updateFoodPostFields = async (postId, fields) => {
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
          // Make a REST API call to update the food post
          const response = await axios.put(
            `http://localhost:5002/api/food-posts/update/${postId}`,
            fields,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('REST API update response:', response.data);
          return true;
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
