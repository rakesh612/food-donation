import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  foodPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodPost',
    required: [true, 'Food post ID is required'],
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Donor ID is required'],
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver ID is required'],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Feedback', feedbackSchema);