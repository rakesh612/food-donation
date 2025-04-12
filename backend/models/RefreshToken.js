import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);