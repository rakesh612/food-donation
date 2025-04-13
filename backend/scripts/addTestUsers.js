import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// MongoDB connection string - replace with your actual connection string
const MONGO_URI = 'mongodb://localhost:27017/food-donation';

// User schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  role: String,
  isVerified: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create User model
const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Create test users
const createTestUsers = async () => {
  try {
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
      isVerified: true
    };

    // Create receiver user
    const receiverUser = {
      name: 'Receiver User',
      email: 'receiver@zerowaste.com',
      password: receiverPassword,
      role: 'receiver',
      isVerified: true
    };

    // Create donor user
    const donorUser = {
      name: 'Donor User',
      email: 'donor@zerowaste.com',
      password: donorPassword,
      role: 'donor',
      isVerified: true
    };

    // Check if users already exist
    const adminExists = await User.findOne({ email: adminUser.email });
    const receiverExists = await User.findOne({ email: receiverUser.email });
    const donorExists = await User.findOne({ email: donorUser.email });

    // Create users if they don't exist
    if (!adminExists) {
      await User.create(adminUser);
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    if (!receiverExists) {
      await User.create(receiverUser);
      console.log('Receiver user created');
    } else {
      console.log('Receiver user already exists');
    }

    if (!donorExists) {
      await User.create(donorUser);
      console.log('Donor user created');
    } else {
      console.log('Donor user already exists');
    }

    console.log('Test users created successfully');
    console.log('Admin credentials: admin@zerowaste.com / admin123');
    console.log('Receiver credentials: receiver@zerowaste.com / receiver123');
    console.log('Donor credentials: donor@zerowaste.com / donor123');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
};

// Run the function
createTestUsers();
