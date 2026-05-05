const mongoose = require('mongoose');

const bookCallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  instagram: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  subTags: [{
    type: String,
    trim: true
  }],
  package: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BookCall', bookCallSchema);

