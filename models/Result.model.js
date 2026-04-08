const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
  testId: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  answers: { type: Map, of: String } // mapping from question index to selected option
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
