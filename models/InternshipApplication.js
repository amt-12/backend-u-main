const mongoose = require('mongoose');

const internshipApplicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  // Store college as plain text (e.g. "Guru Nanak Dev University, Amritsar")
  // Previously this was an ObjectId -> caused CastError when client sends free text.
  college: {
    type: String,
    required: [true, 'College is required'],
    trim: true,
    maxlength: [200, 'College name cannot exceed 200 characters']
  },
  city: {
    type: String,
    trim: true
  },
  education: {
    type: String,
    trim: true
  },
  passingYear: {
    type: String,
    trim: true
  },
  semester: {
    type: String,
    trim: true
  },
  technology: {
    type: String,
    trim: true
  },
  link: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InternshipApplication', internshipApplicationSchema);
