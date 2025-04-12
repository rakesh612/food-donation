import express from 'express';
import { generateReport } from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import FoodPost from '../models/FoodPost.js';
import User from '../models/User.js';

const router = express.Router();

// Original report generation endpoint
router.post('/', protect, restrictTo('admin'), generateReport);

// Get dashboard statistics
router.get('/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    // Get total food saved (sum of quantities of verified food posts)
    const verifiedPosts = await FoodPost.find({ status: 'verified' });
    const foodSaved = verifiedPosts.reduce((total, post) => total + (post.quantity || 0), 0);

    // Estimate people served (assuming 0.5kg per person)
    const peopleServed = Math.round(foodSaved / 0.5);

    // Calculate emissions prevented (1kg food waste = 2.5kg CO2 equivalent)
    const emissionsPrevented = (foodSaved * 2.5 / 1000).toFixed(1);

    // Count active posts
    const activePosts = await FoodPost.countDocuments({
      status: { $in: ['pending', 'accepted'] },
      expiryWindow: { $gt: new Date() }
    });

    res.json({
      foodSaved,
      peopleServed,
      emissionsPrevented,
      activePosts
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get daily report
router.get('/daily', protect, restrictTo('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's verified posts
    const todayPosts = await FoodPost.find({
      status: 'verified',
      updatedAt: { $gte: today }
    });

    // Calculate today's stats
    const foodSavedToday = todayPosts.reduce((total, post) => total + (post.quantity || 0), 0);
    const peopleServedToday = Math.round(foodSavedToday / 0.5);
    const emissionsPreventedToday = (foodSavedToday * 2.5 / 1000).toFixed(1);

    // Get new users registered today
    const newUsers = await User.countDocuments({
      createdAt: { $gte: today }
    });

    res.json({
      date: today.toISOString().split('T')[0],
      foodSavedToday,
      peopleServedToday,
      emissionsPreventedToday,
      newUsers,
      completedDonations: todayPosts.length
    });
  } catch (error) {
    console.error('Error getting daily report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;