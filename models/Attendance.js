const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    punchInTime: {
      type: Date,
      default: null,
    },
    punchOutTime: {
      type: Date,
      default: null,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    breaks: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, default: null }
      }
    ],
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "late", "short_leave", "pending_half_day", "pending_other", "off_duty", "on_duty", "completed"],
      default: "off_duty",
    },
    punchInLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    punchOutLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    notes: {
      type: String,
      default: null,
    },
    punchOutReason: {
      type: String,
      default: null,
    },
    punchOutReasonType: {
      type: String,
      enum: ["half_day", "other", null],
      default: null,
    },
    punchOutApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", null],
      default: null,
    },
    // Optional: these can be persisted later if you want strict monthly accounting.
    // Right now monthly rules are computed during punch-out.
  },
  { timestamps: true }
);


// Compound index for efficient querying
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

