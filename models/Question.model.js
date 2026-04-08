const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  testId: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String }],
  type: { type: String, required: true }, // 'aptitude', 'mern', etc.
  technology: { type: String }, // optional, for secondary tech info
  correctAnswer: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
