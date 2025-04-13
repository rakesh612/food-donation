// Run this script with: node createUsers.js

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

// MongoDB connection string - update with your actual connection string
const uri = 'mongodb://localhost:27017/food-donation';

async function createUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const receiverPassword = await bcrypt.hash('receiver123', 10);
    const donorPassword = await bcrypt.hash('donor123', 10);
    
    // Create admin user
    const adminUser = {
      name: 'Admin User',
      email: 'admin@zerowaste.com',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create receiver user
    const receiverUser = {
      name: 'Receiver User',
      email: 'receiver@zerowaste.com',
      password: receiverPassword,
      role: 'receiver',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create donor user
    const donorUser = {
      name: 'Donor User',
      email: 'donor@zerowaste.com',
      password: donorPassword,
      role: 'donor',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if users already exist
    const adminExists = await usersCollection.findOne({ email: adminUser.email });
    const receiverExists = await usersCollection.findOne({ email: receiverUser.email });
    const donorExists = await usersCollection.findOne({ email: donorUser.email });
    
    // Insert users if they don't exist
    if (!adminExists) {
      await usersCollection.insertOne(adminUser);
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }
    
    if (!receiverExists) {
      await usersCollection.insertOne(receiverUser);
      console.log('Receiver user created');
    } else {
      console.log('Receiver user already exists');
    }
    
    if (!donorExists) {
      await usersCollection.insertOne(donorUser);
      console.log('Donor user created');
    } else {
      console.log('Donor user already exists');
    }
    
    console.log('Test users created successfully');
    console.log('Admin credentials: admin@zerowaste.com / admin123');
    console.log('Receiver credentials: receiver@zerowaste.com / receiver123');
    console.log('Donor credentials: donor@zerowaste.com / donor123');
    
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

createUsers();
