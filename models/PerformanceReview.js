const mongoose = require("mongoose");

const performanceReviewSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reviewType: {
    type: String,
    enum: ["annual", "mid_year"],
    default: "annual"
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  ratingLabel: {
    type: String,
    required: true
  },
  reviewerComments: {
    type: String,
    default: ""
  },
  reviewPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("PerformanceReview", performanceReviewSchema);
