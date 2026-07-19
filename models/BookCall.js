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
  },
  followUpDate: {
    type: Date,
    index: true
  },
  followUps: [
    {
      date: {
        type: Date,
        default: Date.now
      },
      notes: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed'
      },
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ],
  contactPerson: {
    type: String,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  estimatedDealValue: {
    type: Number,
    default: 0
  },
  finalDealValue: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    default: "Website"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  budget: {
    type: String,
    default: ""
  },
  brandDescription: {
    type: String,
    default: ""
  },
  notes: {
    type: String,
    default: ""
  },
  movedToOnboarded: {
    type: Boolean,
    default: false
  },
  onboardedCategories: {
    type: [String],
    default: []
  },
  categoryData: {
    type: Map,
    of: new mongoose.Schema({
      estimatedDealValue: { type: Number, default: 0 },
      finalDealValue: { type: Number, default: 0 },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
      followUpDate: { type: Date, default: null },
    }, { _id: false }),
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BookCall', bookCallSchema);

