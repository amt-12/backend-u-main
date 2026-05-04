const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  slotName: { type: String, trim: true },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  days: [{ type: String, trim: true }]
}, { _id: false });

const batchInfoSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  name: { type: String, trim: true },
  course: { type: String, trim: true },
  timeSlots: [timeSlotSchema]
}, { _id: false });

const trainerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Trainer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  courses: {
    type: Number,
    default: 0
  },
  students: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  batches: [batchInfoSchema]
}, {
  timestamps: true
});

// Index for search
trainerSchema.index({ name: 'text', email: 'text', specialization: 'text' });
trainerSchema.index({ status: 1 });
trainerSchema.index({ specialization: 1 });

module.exports = mongoose.model('Trainer', trainerSchema);

