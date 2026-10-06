const mongoose = require("mongoose");

const offeringSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  code: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true,
    default: "1"
  },
  term: {
    type: String,
    required: true,
    default: "2026-1"
  },
  day: {
    type: String,
    required: true,
    default: "Monday"
  },
  startTime: {
    type: String,
    required: true,
    default: "09:00"
  },
  endTime: {
    type: String,
    required: true,
    default: "12:00"
  },
  room: {
    type: String,
    default: "Room 401"
  },
  instructor: {
    type: String,
    default: "Dr. Smith"
  },
  advisorEmail: {
    type: String,
    default: "advisor@stamford.edu"
  },
  seats: {
    type: Number,
    default: 30
  },
  enrolled: {
    type: Number,
    default: 0
  },
  addDropOpen: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Offering", offeringSchema);

