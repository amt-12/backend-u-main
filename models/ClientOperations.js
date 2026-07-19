const mongoose = require("mongoose");

const clientOperationsSchema = new mongoose.Schema(
  {
    brandLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandLead",
      required: true,
      unique: true, // Prevent importing the same brand multiple times
      index: true,
    },
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monthlyPackage: {
      type: Number,
      required: true,
      default: 0,
    },
    servicesIncluded: {
      type: [String],
      default: [],
    },
    contractStartDate: {
      type: Date,
      required: true,
    },
    contractEndDate: {
      type: Date,
      required: true,
    },
    projectStartDate: {
      type: Date,
      required: true,
    },
    postingFrequency: {
      type: String,
      default: "",
    },
    internalNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "onboarding"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientOperations", clientOperationsSchema);
