const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: [true, 'College is required']
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);

