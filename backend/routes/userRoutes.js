import express from 'express';
import { getProfile, updateProfile, verifyUser } from '../controllers/userController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// User profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin routes
router.put('/verify/:userId', protect, restrictTo('admin'), verifyUser);

// Get all users (admin only)
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Onboard NGO or volunteer (admin only)
router.post('/onboard', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, email, role, isVerified = true } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate a random password
    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified
    });

    await user.save();

    // Return user without password
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    // Include the generated password in the response
    res.status(201).json({
      message: 'User onboarded successfully',
      user: userResponse,
      generatedPassword: password // This would be sent via email in a production app
    });
  } catch (error) {
    console.error('Error onboarding user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;