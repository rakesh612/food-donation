import mongoose from 'mongoose';

const foodPostSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Donor ID is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
  },
  foodType: {
    type: String,
    enum: ['veg', 'non-veg'],
    required: [true, 'Food type is required'],
  },
  category: {
    type: String,
    enum: ['perishable', 'non-perishable'],
    required: [true, 'Category is required'],
  },
  expiryWindow: {
    type: Date,
    required: [true, 'Expiry window is required'],
  },
  pickupDeadline: {
    type: Date,
    required: [true, 'Pickup deadline is required'],
  },
  imageUrl: {
    type: String,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location is required'],
    },
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked', 'verified', 'expired'],
    default: 'pending',
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isFlagged: {
    type: Boolean,
    default: false,
  },
  flagReason: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
});

foodPostSchema.index({ location: '2dsphere' });

foodPostSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('FoodPost', foodPostSchema);