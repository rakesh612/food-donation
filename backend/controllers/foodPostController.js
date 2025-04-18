import FoodPost from '../models/FoodPost.js';
import User from '../models/User.js';

// Create Food Post (Donor)
const createFoodPost = async (req, res) => {
  const { quantity, foodType, category, expiryWindow, pickupDeadline, imageUrl, location, notes } = req.body;

  try {
    const foodPost = new FoodPost({
      donorId: req.user._id,
      quantity,
      foodType,
      category,
      expiryWindow: new Date(expiryWindow),
      pickupDeadline: new Date(pickupDeadline),
      imageUrl,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
      },
      notes
    });

    await foodPost.save();

    // Get donor information for real-time notification
    const donor = await User.findById(req.user._id).select('name');

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to all receivers
    if (io) {
      const foodPostData = {
        _id: foodPost._id,
        donorName: donor.name,
        quantity,
        foodType,
        category,
        expiryWindow: foodPost.expiryWindow,
        pickupDeadline: foodPost.pickupDeadline,
        imageUrl,
        location: foodPost.location,
        status: foodPost.status,
        createdAt: foodPost.createdAt
      };

      console.log('Emitting new-food-post-available event:', foodPostData);
      io.to('receiver').emit('new-food-post-available', foodPostData);
      io.to('admin').emit('new-food-post-created', foodPostData);

      // Also broadcast to all connected clients for better visibility
      console.log('Broadcasting food post to all clients');
      io.emit('broadcast-food-post', {
        message: 'New food donation available',
        data: foodPostData
      });
    }

    res.status(201).json({ message: 'Food post created', foodPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Nearby Food Posts (Receiver)
const getNearbyFoodPosts = async (req, res) => {
  const { latitude, longitude, maxDistance = 5000 } = req.query;

  try {
    console.log(`Searching for food posts near [${latitude}, ${longitude}] with max distance ${maxDistance}m`);

    // Validate coordinates
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    const parsedMaxDistance = parseFloat(maxDistance);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Find food posts within the specified distance using MongoDB's $near operator
    const foodPosts = await FoodPost.find({
      status: 'pending',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parsedLng, parsedLat]
          },
          $maxDistance: parsedMaxDistance
        }
      }
    })
    .populate('donorId', 'name email phone')
    .sort({ createdAt: -1 });

    // Add distance to each post
    const postsWithDistance = foodPosts.map(post => {
      const postObj = post.toObject();
      if (post.location && post.location.coordinates) {
        postObj.distance = calculateDistance(
          parsedLat,
          parsedLng,
          post.location.coordinates[1],
          post.location.coordinates[0]
        );
      }
      return postObj;
    });

    // Sort by distance
    postsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json(postsWithDistance);
  } catch (error) {
    console.error('Error in getNearbyFoodPosts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Accept Food Post (Receiver)
const acceptFoodPost = async (req, res) => {
  const { postId } = req.params;
  const { estimatedPickupTime } = req.body;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost || foodPost.status !== 'pending') {
      return res.status(400).json({ message: 'Food post unavailable' });
    }

    foodPost.status = 'accepted';
    foodPost.receiverId = req.user._id;
    foodPost.pickupDetails.acceptedAt = Date.now();
    foodPost.pickupDetails.estimatedPickupTime = estimatedPickupTime ? new Date(estimatedPickupTime) : null;
    await foodPost.save();

    // Get receiver information for real-time notification
    const receiver = await User.findById(req.user._id).select('name email phone');
    const donor = await User.findById(foodPost.donorId).select('name email phone');

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor and admin
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        receiverId: foodPost.receiverId,
        receiverName: receiver.name,
        receiverEmail: receiver.email,
        receiverPhone: receiver.phone,
        donorName: donor.name,
        donorEmail: donor.email,
        donorPhone: donor.phone,
        estimatedPickupTime: foodPost.pickupDetails.estimatedPickupTime,
        updatedAt: foodPost.updatedAt,
        statusHistory: foodPost.statusHistory
      };

      // Notify donor
      io.to(`user:${foodPost.donorId}`).emit('donation-accepted', updateData);

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-updated', updateData);

      // Notify admins
      io.to('admin').emit('food-post-status-changed', updateData);
    }

    res.json({ message: 'Food post accepted', foodPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Confirm Pickup (Receiver)
const confirmPickup = async (req, res) => {
  const { postId } = req.params;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost || foodPost.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    foodPost.status = 'picked';
    foodPost.pickupDetails.pickedAt = Date.now();
    foodPost.pickupDetails.actualPickupTime = Date.now();
    await foodPost.save();

    // Get receiver and donor information for real-time notification
    const receiver = await User.findById(req.user._id).select('name email phone');
    const donor = await User.findById(foodPost.donorId).select('name email phone');

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor and admin
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        receiverName: receiver.name,
        receiverEmail: receiver.email,
        receiverPhone: receiver.phone,
        donorName: donor.name,
        donorEmail: donor.email,
        donorPhone: donor.phone,
        actualPickupTime: foodPost.pickupDetails.actualPickupTime,
        updatedAt: foodPost.updatedAt,
        statusHistory: foodPost.statusHistory
      };

      // Notify donor
      io.to(`user:${foodPost.donorId}`).emit('donation-picked', updateData);

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-status-changed', updateData);

      // Notify admins
      io.to('admin').emit('food-post-status-changed', updateData);
    }

    res.json({ message: 'Food post marked as picked up', foodPost });
  } catch (error) {
    console.error('Error in confirmFoodPost:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Delivery (Admin)
const verifyDelivery = async (req, res) => {
  const { postId } = req.params;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost || foodPost.status !== 'picked') {
      return res.status(400).json({ message: 'Food post not in picked status' });
    }

    foodPost.status = 'verified';
    foodPost.pickupDetails.verifiedAt = Date.now();
    await foodPost.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor and receiver
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        updatedAt: foodPost.updatedAt,
        statusHistory: foodPost.statusHistory
      };

      // Notify donor
      io.to(`user:${foodPost.donorId}`).emit('donation-verified', updateData);

      // Notify receiver
      io.to(`user:${foodPost.receiverId}`).emit('pickup-verified', updateData);

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-status-changed', updateData);
    }

    res.json({ message: 'Food post verified', foodPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Donor Food Posts
const getDonorFoodPosts = async (req, res) => {
  try {
    const foodPosts = await FoodPost.find({ donorId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(foodPosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Food Post Fields
const updateFoodPostFields = async (req, res) => {
  const { postId } = req.params;
  const { foodType, category, expiryWindow, pickupDeadline, notes } = req.body;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost || foodPost.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (foodType) foodPost.foodType = foodType;
    if (category) foodPost.category = category;
    if (expiryWindow) foodPost.expiryWindow = new Date(expiryWindow);
    if (pickupDeadline) foodPost.pickupDeadline = new Date(pickupDeadline);
    if (notes !== undefined) foodPost.notes = notes;

    await foodPost.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to receiver if assigned
    if (io && foodPost.receiverId) {
      const updateData = {
        postId: foodPost._id,
        foodType: foodPost.foodType,
        category: foodPost.category,
        expiryWindow: foodPost.expiryWindow,
        pickupDeadline: foodPost.pickupDeadline,
        notes: foodPost.notes,
        updatedAt: foodPost.updatedAt
      };

      // Notify receiver
      io.to(`user:${foodPost.receiverId}`).emit('pickup-fields-updated', updateData);

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-fields-changed', updateData);
    }

    res.json({ message: 'Food post updated', foodPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Food Post Status
const updateFoodPostStatus = async (req, res) => {
  const { postId } = req.params;
  const { status } = req.body;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost) {
      return res.status(404).json({ message: 'Food post not found' });
    }

    // Only admin can change status directly
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    foodPost.status = status;
    await foodPost.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor and receiver
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        updatedAt: foodPost.updatedAt,
        statusHistory: foodPost.statusHistory
      };

      // Notify donor
      io.to(`user:${foodPost.donorId}`).emit('food-post-status-changed', updateData);

      // Notify receiver if assigned
      if (foodPost.receiverId) {
        io.to(`user:${foodPost.receiverId}`).emit('food-post-status-changed', updateData);
      }

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-status-changed', updateData);
    }

    res.json({ message: 'Food post status updated', foodPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export {
  createFoodPost,
  getNearbyFoodPosts,
  acceptFoodPost,
  confirmPickup,
  verifyDelivery,
  getDonorFoodPosts,
  updateFoodPostFields,
  updateFoodPostStatus
};