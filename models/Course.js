const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  credits: {
    type: Number,
    required: true,
    default: 3
  },
  prerequisites: [
    {
      type: String, // Course codes e.g. ["ITE101"]
      trim: true
    }
  ],
  department: {
    type: String,
    default: "Computer Science"
  }
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);

