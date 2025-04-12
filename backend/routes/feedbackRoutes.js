import express from 'express';
import { submitFeedback, getFeedbackForPost, getUserFeedback, getAllFeedback } from '../controllers/feedbackController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Submit feedback (receiver only)
router.post('/', protect, restrictTo('receiver'), submitFeedback);

// Get feedback for a specific food post
router.get('/post/:postId', protect, getFeedbackForPost);

// Get all feedback for the current user
router.get('/user', protect, getUserFeedback);

// Get all feedback (admin only)
router.get('/', protect, restrictTo('admin'), getAllFeedback);

export default router;