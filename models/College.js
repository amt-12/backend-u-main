const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'College name is required'],
    trim: true,
    maxlength: [200, 'College name cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'blocked'],
    default: 'active'
  },
  location: {
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pinCode: { type: String, trim: true }
  },
  contact: {
    email: { type: String, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true, lowercase: true }
  },
  technologies: [{
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true }
  }],
  educationPrograms: [{
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['undergraduate', 'postgraduate', 'diploma', 'certificate'] },
    duration: String,
    branches: [String]
  }],
  poc: {
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    email: { type: String, lowercase: true },
    phone: { type: String, trim: true }
  },
  tpo: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Invite tracking
  inviteToken: String,
  inviteTokenExpiry: Date,
  inviteStatus: {
    type: String,
enum: ['not_sent', 'invited', 'waiting', 'visiting_date_decided', 'sent', 'pending', 'invite_accepted', 'date_selected', 'details_submitted', 'completed', 'declined'],
    default: 'not_sent'
  },
  invitedAt: Date,
  dateSubmittedAt: Date,
  workshopEmailSent: {
    type: Boolean,
    default: false
  },
  guestLectureEmailSent: {
    type: Boolean,
    default: false
  },
  placementDriveEmailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
collegeSchema.index({ name: 'text', 'location.city': 'text', 'location.state': 'text' });
collegeSchema.index({ status: 1 });
collegeSchema.index({ inviteStatus: 1, 'createdAt': -1 });

module.exports = mongoose.model('College', collegeSchema);

