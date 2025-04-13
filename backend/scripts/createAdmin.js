// Run this script with: node scripts/createAdmin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-donation';

// Define a simplified User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
});

// Create User model
const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@zerowaste.com' });

    if (!adminExists) {
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Create admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@zerowaste.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await adminUser.save();
      console.log('Admin user created successfully');
      console.log('Admin credentials:');
      console.log('Email: admin@zerowaste.com');
      console.log('Password: admin123');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

createAdminUser();
