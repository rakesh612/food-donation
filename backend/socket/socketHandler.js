import FoodPost from '../models/FoodPost.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Store connected users
const connectedUsers = new Map();

const setupSocketIO = (io) => {
  // Add connection timeout handling
  io.engine.on("connection_error", (err) => {
    console.error('Socket.IO connection error:', {
      type: err.type,
      message: err.message,
      context: err.context
    });
  });

  // Add middleware for rate limiting
  io.use((socket, next) => {
    const clientId = socket.handshake.auth.token || socket.handshake.address;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // Maximum requests per minute

    if (!socket.rateLimit) {
      socket.rateLimit = {
        requests: [],
        windowMs
      };
    }

    // Clean up old requests
    socket.rateLimit.requests = socket.rateLimit.requests.filter(
      time => now - time < windowMs
    );

    if (socket.rateLimit.requests.length >= maxRequests) {
      return next(new Error('Rate limit exceeded'));
    }

    socket.rateLimit.requests.push(now);
    next();
  });

  // Add middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Add error handling for the socket
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user._id}:`, error);
      socket.emit('error', { message: 'An error occurred' });
    });

    // Add reconnection handling
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`User ${socket.user._id} attempting to reconnect (attempt ${attemptNumber})`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`User ${socket.user._id} reconnected after ${attemptNumber} attempts`);
      // Rejoin rooms and restore state
      if (socket.user.role === 'donor') {
        socket.join(`donor:${socket.user._id}`);
      } else if (socket.user.role === 'receiver') {
        socket.join(`receiver:${socket.user._id}`);
      }
    });

    // Add user to connected users map
    connectedUsers.set(socket.user._id, socket);

    // Join room based on role
    socket.join(socket.user.role);
    socket.join(`user:${socket.user._id}`);

    // If admin, join admin room
    if (socket.user.role === 'admin') {
      socket.join('admin');
    }

    // Handle joining specific food post room
    socket.on('join-food-post', async (postId) => {
      try {
        const foodPost = await FoodPost.findById(postId);
        if (foodPost) {
          socket.join(`food-post:${postId}`);
          console.log(`User ${socket.user._id} joined food-post:${postId}`);
        }
      } catch (error) {
        console.error('Error joining food post room:', error);
      }
    });

    // Handle real-time location updates for delivery tracking
    socket.on('update-location', async (data) => {
      const { postId, location } = data;
      try {
        // Broadcast location update to all users in the food post room
        io.to(`food-post:${postId}`).emit('location-updated', {
          postId,
          location,
          userId: socket.user._id
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    // Handle food post status updates
    socket.on('update-food-post-status', async (data) => {
      const { postId, status } = data;
      try {
        const foodPost = await FoodPost.findById(postId);
        if (!foodPost) {
          socket.emit('error', { message: 'Food post not found' });
          return;
        }

        // Update food post status
        foodPost.status = status;
        foodPost.updatedAt = Date.now();
        await foodPost.save();

        // Notify all users in the food post room
        io.to(`food-post:${postId}`).emit('food-post-updated', {
          postId,
          status,
          updatedAt: foodPost.updatedAt
        });

        // Notify donor
        if (connectedUsers.has(foodPost.donorId.toString())) {
          connectedUsers.get(foodPost.donorId.toString()).emit('donation-status-changed', {
            postId,
            status,
            updatedAt: foodPost.updatedAt
          });
        }

        // Notify receiver if assigned
        if (foodPost.receiverId && connectedUsers.has(foodPost.receiverId.toString())) {
          connectedUsers.get(foodPost.receiverId.toString()).emit('pickup-status-changed', {
            postId,
            status,
            updatedAt: foodPost.updatedAt
          });
        }

        // Notify admins
        io.to('admin').emit('food-post-status-changed', {
          postId,
          status,
          updatedAt: foodPost.updatedAt
        });
      } catch (error) {
        console.error('Error updating food post status:', error);
        socket.emit('error', { message: 'Error updating food post status' });
      }
    });

    // Handle food post field updates (food type, category, expiry date, pickup time, notes)
    socket.on('update-food-post-fields', async (data) => {
      const { postId, foodType, category, expiryWindow, pickupDeadline, notes } = data;
      try {
        const foodPost = await FoodPost.findById(postId);
        if (!foodPost) {
          socket.emit('error', { message: 'Food post not found' });
          return;
        }

        // Check if user is the donor of this post
        if (foodPost.donorId.toString() !== socket.user._id) {
          socket.emit('error', { message: 'Not authorized to update this food post' });
          return;
        }

        // Update food post fields
        if (foodType) foodPost.foodType = foodType;
        if (category) foodPost.category = category;
        if (expiryWindow) foodPost.expiryWindow = new Date(expiryWindow);
        if (pickupDeadline) foodPost.pickupDeadline = new Date(pickupDeadline);
        if (notes !== undefined) foodPost.notes = notes;

        foodPost.updatedAt = Date.now();
        await foodPost.save();

        console.log(`Food post ${postId} updated with fields:`, { foodType, category, expiryWindow, pickupDeadline, notes });

        // Prepare update data
        const updateData = {
          postId,
          foodType: foodPost.foodType,
          category: foodPost.category,
          expiryWindow: foodPost.expiryWindow,
          pickupDeadline: foodPost.pickupDeadline,
          notes: foodPost.notes,
          updatedAt: foodPost.updatedAt
        };

        // Notify all users in the food post room
        io.to(`food-post:${postId}`).emit('food-post-fields-updated', updateData);

        // Notify donor
        if (connectedUsers.has(foodPost.donorId.toString())) {
          connectedUsers.get(foodPost.donorId.toString()).emit('donation-fields-updated', updateData);
        }

        // Notify receiver if assigned
        if (foodPost.receiverId && connectedUsers.has(foodPost.receiverId.toString())) {
          connectedUsers.get(foodPost.receiverId.toString()).emit('pickup-fields-updated', updateData);
        }

        // Notify admins
        io.to('admin').emit('food-post-fields-changed', updateData);
      } catch (error) {
        console.error('Error updating food post fields:', error);
        socket.emit('error', { message: 'Error updating food post fields' });
      }
    });

    // Handle new food post creation
    socket.on('new-food-post', async (postData) => {
      try {
        // Broadcast to all receivers
        io.to('receiver').emit('new-food-post-available', postData);

        // Notify admins
        io.to('admin').emit('new-food-post-created', postData);
      } catch (error) {
        console.error('Error broadcasting new food post:', error);
      }
    });

    // Handle food post expiry
    socket.on('food-post-expired', async (postId) => {
      try {
        const foodPost = await FoodPost.findById(postId);
        if (!foodPost) {
          socket.emit('error', { message: 'Food post not found' });
          return;
        }

        // Update food post status to expired
        foodPost.status = 'expired';
        foodPost.updatedAt = Date.now();
        await foodPost.save();

        // Notify all users in the food post room
        io.to(`food-post:${postId}`).emit('food-post-expired', {
          postId,
          updatedAt: foodPost.updatedAt
        });

        // Notify admins
        io.to('admin').emit('food-post-expired', {
          postId,
          updatedAt: foodPost.updatedAt
        });
      } catch (error) {
        console.error('Error handling food post expiry:', error);
      }
    });

    // Handle user verification requests
    socket.on('verify-user', async (userId) => {
      try {
        if (socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Unauthorized: Only admins can verify users' });
          return;
        }

        const user = await User.findById(userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Update user verification status
        user.isVerified = true;
        user.updatedAt = Date.now();
        await user.save();

        // Notify the verified user if connected
        if (connectedUsers.has(userId)) {
          connectedUsers.get(userId).emit('verification-status-changed', {
            isVerified: true,
            updatedAt: user.updatedAt
          });
        }

        // Notify admins
        io.to('admin').emit('user-verified', {
          userId,
          name: user.name,
          role: user.role,
          updatedAt: user.updatedAt
        });
      } catch (error) {
        console.error('Error verifying user:', error);
        socket.emit('error', { message: 'Error verifying user' });
      }
    });

    // Handle new food post creation
    socket.on('new-food-post', async (data) => {
      try {
        // Get user name for notifications
        const user = await User.findById(socket.user._id);
        const userName = user ? user.name : 'Unknown User';

        // Prepare notification data
        const notificationData = {
          ...data,
          donorName: userName,
          timestamp: new Date().toISOString()
        };

        console.log('New food post data:', notificationData);

        // Notify admins
        io.to('admin').emit('new-food-post-created', notificationData);
        console.log('Notified admins about new food post');

        // Notify all receivers
        io.to('receiver').emit('new-food-post-available', notificationData);
        console.log('Notified receivers about new food post');

        // Broadcast to all connected clients for testing
        io.emit('broadcast-food-post', {
          message: 'New food post available',
          data: notificationData
        });

        console.log(`New food post created by ${userName}, notifying admins and receivers`);
      } catch (error) {
        console.error('Error handling new food post:', error);
        socket.emit('error', { message: 'Error handling new food post' });
      }
    });

    // Add cleanup on disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user._id}, reason: ${reason}`);
      // Clean up any resources or state
      connectedUsers.delete(socket.user._id);
    });
  });

  // Add global error handling
  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });

  return io;
};

export default setupSocketIO;
