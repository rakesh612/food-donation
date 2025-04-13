// Run this script with: node scripts/insertAdmin.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-donation';

async function insertAdminUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if admin user already exists
    const adminExists = await usersCollection.findOne({ email: 'admin@zerowaste.com' });
    
    if (!adminExists) {
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create admin user
      const adminUser = {
        name: 'Admin User',
        email: 'admin@zerowaste.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await usersCollection.insertOne(adminUser);
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
    await client.close();
    console.log('MongoDB connection closed');
  }
}

insertAdminUser();
