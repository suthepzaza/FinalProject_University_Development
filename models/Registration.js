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
    default: "2026-1",
    match: require("./validation").term
  },
  status: {
    type: String,
    enum: ["Enrolled", "Dropped"],
    default: "Enrolled"
  }
}, { timestamps: true });

registrationSchema.index({ studentId: 1, offeringId: 1 }, { unique: true });
module.exports = mongoose.model("Registration", registrationSchema);

