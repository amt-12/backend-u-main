const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      index: true 
    },
    description: { 
      type: String, 
      default: "" 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
