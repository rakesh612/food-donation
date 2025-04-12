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

      io.to('receiver').emit('new-food-post-available', foodPostData);
      io.to('admin').emit('new-food-post-created', foodPostData);
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
    const foodPosts = await FoodPost.find({
      status: 'pending',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseFloat(maxDistance),
        },
      },
    }).populate('donorId', 'name email phone');

    res.json(foodPosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept Food Post (Receiver)
const acceptFoodPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost || foodPost.status !== 'pending') {
      return res.status(400).json({ message: 'Food post unavailable' });
    }

    foodPost.status = 'accepted';
    foodPost.receiverId = req.user._id;
    await foodPost.save();

    // Get receiver information for real-time notification
    const receiver = await User.findById(req.user._id).select('name');

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor and admin
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        receiverId: foodPost.receiverId,
        receiverName: receiver.name,
        updatedAt: foodPost.updatedAt
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
    await foodPost.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor and admin
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        updatedAt: foodPost.updatedAt
      };

      // Notify donor
      io.to(`user:${foodPost.donorId}`).emit('donation-picked', updateData);

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-updated', updateData);

      // Notify admins
      io.to('admin').emit('food-post-status-changed', updateData);
    }

    res.json({ message: 'Pickup confirmed', foodPost });
  } catch (error) {
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
    await foodPost.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor, receiver and admin
    if (io) {
      const updateData = {
        postId: foodPost._id,
        status: foodPost.status,
        updatedAt: foodPost.updatedAt
      };

      // Notify donor
      io.to(`user:${foodPost.donorId}`).emit('donation-verified', updateData);

      // Notify receiver
      io.to(`user:${foodPost.receiverId}`).emit('pickup-verified', updateData);

      // Notify all users in the food post room
      io.to(`food-post:${postId}`).emit('food-post-updated', updateData);

      // Notify admins
      io.to('admin').emit('food-post-status-changed', updateData);
    }

    res.json({ message: 'Delivery verified', foodPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export { createFoodPost, getNearbyFoodPosts, acceptFoodPost, confirmPickup, verifyDelivery };