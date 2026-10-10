const mongoose = require("mongoose");

const academicRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  term: {
    type: String,
    required: true,
    match: require("./validation").term
  },
  grade: {
    type: String,
    enum: ["A", "B+", "B", "C+", "C", "D+", "D", "F", "W"],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("AcademicRecord", academicRecordSchema);

