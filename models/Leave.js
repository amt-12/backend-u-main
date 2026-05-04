const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "paid"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    appliedOn: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    balanceSnapshot: {
      casual: { type: Number, default: 0 },
      sick: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
      index: true,
    },
  },
  { timestamps: true }
);

leaveSchema.index({ staffId: 1, year: 1 });
leaveSchema.index({ status: 1 });

module.exports = mongoose.model("Leave", leaveSchema);

