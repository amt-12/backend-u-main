const mongoose = require("mongoose");

const brandLeadSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "cancelled", "onboarded", "moved_to_operations", "new", "contacted", "proposal_sent", "negotiation", "lost"],
      default: "pending",
      index: true,
    },
    dealValue: {
      type: Number,
      default: 0,
    },
    estimatedDealValue: {
      type: Number,
      default: 0,
    },
    finalDealValue: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      default: "Other",
    },
    notes: {
      type: String,
      default: "",
    },
    instagram: {
      type: String,
      trim: true,
      default: "",
    },
    whatsAppGroupLink: {
      type: String,
      trim: true,
      default: "",
    },
    requirements: {
      type: [String],
      default: [],
    },
    budget: {
      type: String,
      default: "",
    },
    brandDescription: {
      type: String,
      default: "",
    },
    clientSubmitted: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
      index: true,
    },
    followUps: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "completed"],
          default: "completed",
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliverables: {
      branding: {
        checked: { type: Boolean, default: false },
        count: { type: Number, default: 0 }
      },
      ugc: {
        checked: { type: Boolean, default: false },
        count: { type: Number, default: 0 }
      },
      reels: {
        checked: { type: Boolean, default: false },
        count: { type: Number, default: 0 }
      },
      posts: {
        checked: { type: Boolean, default: false },
        count: { type: Number, default: 0 }
      }
    },
    categoryData: {
      type: Map,
      of: new mongoose.Schema({
        estimatedDealValue: { type: Number, default: 0 },
        finalDealValue: { type: Number, default: 0 },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        status: { type: String, enum: ["pending", "cancelled", "onboarded", "moved_to_operations", "new", "contacted", "proposal_sent", "negotiation", "lost"], default: "pending" },
        followUpDate: { type: Date, default: null },
      }, { _id: false }),
      default: {}
    },
    onboardedDates: {
      type: [Date],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BrandLead", brandLeadSchema);
