import User from '../models/User.js';

// Get User Profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  const { name, phone, address, location } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    if (location && location.coordinates) {
      user.location.coordinates = location.coordinates;
    }

    await user.save();
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Verify NGO/Receiver
const verifyUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'receiver') {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    user.isVerified = true;
    await user.save();
    res.json({ message: 'User verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export { getProfile, updateProfile, verifyUser };