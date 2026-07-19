const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending"
  },
  targetDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  }
}, { timestamps: true });

module.exports = mongoose.model("Goal", goalSchema);
