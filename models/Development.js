const mongoose = require("mongoose");

const developmentSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ["technical", "soft_skills", "mandatory", "commercial"],
    default: "technical"
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
  hoursEstimated: {
    type: Number,
    default: 0
  },
  hoursCompleted: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  }
}, { timestamps: true });

module.exports = mongoose.model("Development", developmentSchema);
