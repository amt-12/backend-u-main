const mongoose = require('mongoose');

const studentRegistrationSchema = new mongoose.Schema({
  collegeEmail: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  college: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }, // link to college
  technology: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: Number, required: true },
  passingYear: { type: Number, required: true },
  appliedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StudentRegistration', studentRegistrationSchema);
