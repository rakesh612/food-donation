// This script creates an admin user directly in the database
// Run with: node createAdminDirectly.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-donation';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isVerified: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create User model
const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@zerowaste.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      
      // Update admin password if needed
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.updateOne(
        { email: 'admin@zerowaste.com' },
        { 
          $set: { 
            password: hashedPassword,
            isVerified: true
          } 
        }
      );
      console.log('Admin password updated to: admin123');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@zerowaste.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    }
    
    console.log('Admin credentials:');
    console.log('Email: admin@zerowaste.com');
    console.log('Password: admin123');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error creating admin user:', error);
    await mongoose.connection.close();
  }
}

// Run the function
createAdmin();
