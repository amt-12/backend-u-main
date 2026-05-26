const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'student', 'employee', 'hr'],
      default: 'student',
    },
    isTemp: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    phone: { type: String, default: '' },
    course: { type: String, default: '' },
    address: { type: String, default: '' },
    tempExpiry: { type: Date },
    profileImage: { type: String, default: null },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    dateOfJoining: { type: Date },
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employeeType: { type: String, default: 'full_time' },
    salaryStructure: {
      baseSalary: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      taxDeduction: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
    },
    documents: {
      identityProof: { type: String, default: '' },
      educationalCertificate: { type: String, default: '' },
      offerLetter: { type: String, default: '' },
      medicalDocument: { type: String, default: '' },
    },
    moduleVisibility: { type: [String], default: [] },
    permissions: { type: [String], default: [] }, // stores "module:action" strings
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for fast login / registration look‑up
userSchema.index({ email: 1, isTemp: 1 });

module.exports = mongoose.model('User', userSchema);
