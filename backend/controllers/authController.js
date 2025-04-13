import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

// Generate JWT
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'zerowaste_secure_jwt_secret_key_2023',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'zerowaste_secure_refresh_secret_key_2023',
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    }
  );
};

// Register User
const registerUser = async (req, res) => {
  const { email, password, name, role, phone, address } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      email,
      password,
      name,
      role: role || 'donor',
      phone,
      address,
    });

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await new RefreshToken({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).save();

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        isVerified: user.isVerified || false
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Login attempt for email: ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`Invalid password for user: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`User authenticated: ${email}, role: ${user.role}`);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await new RefreshToken({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).save();

    // Send response with consistent user object structure
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        isVerified: user.isVerified || false
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Refresh Token
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('userId');
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'zerowaste_secure_refresh_secret_key_2023');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
};

// Logout User
const logoutUser = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export { registerUser, loginUser, refreshToken, logoutUser };