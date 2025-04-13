import FoodPost from '../models/FoodPost.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Store connected users
const connectedUsers = new Map();

const setupSocketIO = (io) => {
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}, Role: ${socket.userRole}`);

    // Add user to connected users map
    connectedUsers.set(socket.userId, socket);

    // Join room based on role
    socket.join(socket.userRole);
    socket.join(`user:${socket.userId}`);

    // If admin, join admin room
    if (socket.userRole === 'admin') {
      socket.join('admin');
    }

    // Handle joining specific food post room
    socket.on('join-food-post', async (postId) => {
      try {
        const foodPost = await FoodPost.findById(postId);
        if (foodPost) {
          socket.join(`food-post:${postId}`);
          console.log(`User ${socket.userId} joined food-post:${postId}`);
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
          userId: socket.userId
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
        if (foodPost.donorId.toString() !== socket.userId) {
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
        if (socket.userRole !== 'admin') {
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
        const user = await User.findById(socket.userId);
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

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
    });
  });
};

export default setupSocketIO;
