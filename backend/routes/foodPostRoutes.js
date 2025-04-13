import express from 'express';
import { createFoodPost, getNearbyFoodPosts, acceptFoodPost, confirmPickup, verifyDelivery, getDonorFoodPosts, updateFoodPostFields, updateFoodPostStatus } from '../controllers/foodPostController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import FoodPost from '../models/FoodPost.js';

const router = express.Router();

// Donor routes
router.post('/', protect, restrictTo('donor'), createFoodPost);
// Get donor's own food posts
router.get('/donor', protect, restrictTo('donor'), getDonorFoodPosts);

// Get all food posts (admin only)
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const foodPosts = await FoodPost.find()
      .populate('donorId', 'name email')
      .populate('receiverId', 'name email');
    res.json(foodPosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Receiver routes
router.get('/nearby', protect, restrictTo('receiver'), getNearbyFoodPosts);
router.put('/accept/:postId', protect, restrictTo('receiver'), acceptFoodPost);
router.put('/confirm/:postId', protect, restrictTo('receiver'), confirmPickup);

// Update food post fields (donor only)
router.put('/update/:postId', protect, restrictTo('donor'), updateFoodPostFields);

// Admin routes
router.put('/verify/:postId', protect, restrictTo('admin'), verifyDelivery);
router.put('/status/:postId', protect, restrictTo('admin'), updateFoodPostStatus);

// Get flagged or expired posts (admin only)
router.get('/flagged', protect, restrictTo('admin'), async (req, res) => {
  try {
    const now = new Date();

    // Find expired posts and flagged posts
    const flaggedPosts = await FoodPost.find({
      $or: [
        // Expired posts that are still pending or accepted
        {
          expiryWindow: { $lt: now },
          status: { $in: ['pending', 'accepted'] }
        },
        // Posts that have been flagged
        { isFlagged: true }
      ]
    }).populate('donorId', 'name');

    // Transform the data for the frontend
    const formattedPosts = flaggedPosts.map(post => {
      return {
        _id: post._id,
        foodType: post.foodType,
        category: post.category,
        quantity: post.quantity,
        status: post.status,
        expiryWindow: post.expiryWindow,
        donorName: post.donorId ? post.donorId.name : 'Unknown',
        donorId: post.donorId ? post.donorId._id : null,
        flagReason: post.flagReason,
        isFlagged: post.isFlagged,
        createdAt: post.createdAt
      };
    });

    res.json(formattedPosts);
  } catch (error) {
    console.error('Error fetching flagged posts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;