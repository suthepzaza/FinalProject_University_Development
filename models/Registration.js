const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  offeringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offering",
    required: true
  },
  term: {
    type: String,
    required: true,
    default: "2026-1"
  },
  status: {
    type: String,
    enum: ["Enrolled", "Dropped", "Pending"],
    default: "Enrolled"
  }
}, { timestamps: true });

module.exports = mongoose.model("Registration", registrationSchema);

