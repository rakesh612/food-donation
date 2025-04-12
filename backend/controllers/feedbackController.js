import Feedback from '../models/Feedback.js';
import FoodPost from '../models/FoodPost.js';

// Submit feedback for a food post
const submitFeedback = async (req, res) => {
  const { postId, rating, comment } = req.body;

  try {
    const foodPost = await FoodPost.findById(postId);
    if (!foodPost || foodPost.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      foodPostId: postId,
      receiverId: req.user._id
    });

    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this post' });
    }

    const feedback = new Feedback({
      foodPostId: postId,
      donorId: foodPost.donorId,
      receiverId: req.user._id,
      rating,
      comment,
    });

    await feedback.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit real-time event to donor
    if (io) {
      io.to(`user:${foodPost.donorId}`).emit('feedback-received', {
        postId,
        rating,
        comment
      });
    }

    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get feedback for a food post
const getFeedbackForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const feedback = await Feedback.findOne({ foodPostId: postId })
      .populate('donorId', 'name')
      .populate('receiverId', 'name');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all feedback for a user
const getUserFeedback = async (req, res) => {
  try {
    let feedback;

    if (req.user.role === 'donor') {
      feedback = await Feedback.find({ donorId: req.user._id })
        .populate('foodPostId')
        .populate('receiverId', 'name');
    } else if (req.user.role === 'receiver') {
      feedback = await Feedback.find({ receiverId: req.user._id })
        .populate('foodPostId')
        .populate('donorId', 'name');
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all feedback (admin only)
const getAllFeedback = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const feedback = await Feedback.find()
      .populate('foodPostId')
      .populate('donorId', 'name')
      .populate('receiverId', 'name');

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export { submitFeedback, getFeedbackForPost, getUserFeedback, getAllFeedback };