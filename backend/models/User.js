import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: function () {
      return !this.oauthProvider;
    },
    minlength: [8, 'Password must be at least 8 characters'],
  },
  oauthProvider: {
    type: String,
    enum: ['google', 'facebook', null],
    default: null,
  },
  oauthId: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ['donor', 'receiver', 'admin'],
    required: [true, 'Role is required'],
    default: 'donor',
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
  },
  address: {
    type: String,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationDocuments: [
    {
      type: String,
      default: null,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = Date.now();
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);