const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    platform: { 
      type: String, 
      required: true 
    },
    username: { 
      type: String, 
      required: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    notes: { 
      type: String, 
      default: "" 
    }
  }
);

const credentialSchema = new mongoose.Schema(
  {
    clientName: { 
      type: String, 
      required: true,
      index: true
    },
    brandName: { 
      type: String, 
      default: "" 
    },
    projectName: { 
      type: String, 
      default: "" 
    },
    accounts: [accountSchema],
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    updatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  },
  { timestamps: true }
);

// Add index for search
credentialSchema.index({ clientName: "text", brandName: "text", projectName: "text", "accounts.username": "text" });

module.exports = mongoose.model("Credential", credentialSchema);

