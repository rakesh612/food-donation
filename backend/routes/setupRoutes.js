import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Route to create an admin user
router.get('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@zerowaste.com' });
    
    if (adminExists) {
      // Update admin password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.updateOne(
        { email: 'admin@zerowaste.com' },
        { 
          $set: { 
            password: hashedPassword,
            isVerified: true,
            role: 'admin'
          } 
        }
      );
      
      return res.json({ 
        message: 'Admin user already exists, password reset to admin123',
        credentials: {
          email: 'admin@zerowaste.com',
          password: 'admin123'
        }
      });
    }
    
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
    
    res.json({ 
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@zerowaste.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
