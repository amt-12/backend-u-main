const mongoose = require("mongoose");

const scheduledPostSchema = new mongoose.Schema(
  {
    brandLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandLead",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["reel", "post", "ugc", "branding", "other"],
      required: true,
      index: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    caption: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "posted", "pending_approval"],
      default: "draft",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScheduledPost", scheduledPostSchema);
