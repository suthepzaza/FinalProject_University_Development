const mongoose = require("mongoose");
const validation = require("./validation");

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
    default: "2026-1",
    match: validation.term
  },
  day: {
    type: String,
    required: true,
    default: "Monday",
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  },
  startTime: {
    type: String,
    required: true,
    default: "09:00",
    match: validation.time
  },
  endTime: {
    type: String,
    required: true,
    default: "12:00",
    match: validation.time
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
    default: 30,
    min: 0, validate: validation.nonnegativeInteger
  },
  enrolled: {
    type: Number,
    default: 0,
    min: 0, validate: validation.nonnegativeInteger
  },
  addDropClosesAt: { type: Date },
  addDropOpen: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

offeringSchema.pre("validate", function () {
  if (this.startTime >= this.endTime) this.invalidate("endTime", "End time must be after start time");
  if (this.enrolled > this.seats) this.invalidate("seats", "Seats cannot be below current enrolment");
});
offeringSchema.index({ courseId: 1, term: 1, section: 1 }, { unique: true });
module.exports = mongoose.model("Offering", offeringSchema);

