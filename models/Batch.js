const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  slotName: { type: String, trim: true },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  days: [{ type: String, trim: true }]
}, { _id: false });

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  timeSlots: [timeSlotSchema],
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Batch', batchSchema);

