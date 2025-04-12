import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Report date is required'],
    default: Date.now,
  },
  foodSaved: {
    type: Number,
    required: [true, 'Food saved is required'],
  },
  peopleServed: {
    type: Number,
    required: [true, 'People served is required'],
  },
  emissionsPrevented: {
    type: Number,
    required: [true, 'Emissions prevented is required'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Report', reportSchema);