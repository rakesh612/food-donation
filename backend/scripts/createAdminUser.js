// Run this script with: node scripts/createAdminUser.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-donation';

async function createAdminUser() {
  try {
    // Connect to MongoDB using Mongoose
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@zerowaste.com' });

    if (!adminExists) {
      // Create admin user using the User model
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@zerowaste.com',
        password: 'admin123', // Will be hashed by the User model's pre-save hook
        role: 'admin',
        isVerified: true
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
