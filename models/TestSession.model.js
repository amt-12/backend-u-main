const mongoose = require('mongoose');

const testSessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  testId: { type: String, required: true },
  startedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['STARTED', 'SUBMITTED', 'CANCELLED', 'EXPIRED'], default: 'STARTED' }
}, { timestamps: true });

module.exports = mongoose.model('TestSession', testSessionSchema);
