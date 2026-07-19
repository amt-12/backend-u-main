const mongoose = require("mongoose");

const broadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["announcement", "holiday", "party", "urgent", "maintenance", "event"],
    default: "announcement"
  },
  priority: {
    type: String,
    enum: ["low", "normal", "high", "urgent"],
    default: "normal"
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  targetAudience: {
    type: String,
    default: "all" // e.g. "all", "staff", "super_admin", "hr", "manager"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdByName: {
    type: String,
    default: "Unknown"
  },
  createdByRole: {
    type: String,
    default: "Staff"
  }
}, { timestamps: true });

// Transform virtual id
broadcastSchema.virtual("id").get(function() {
  return this._id.toHexString();
});

broadcastSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    return ret;
  }
});

module.exports = mongoose.model("Broadcast", broadcastSchema);
