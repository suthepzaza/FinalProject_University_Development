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
    default: 3,
    min: 1,
    max: 6,
    validate: Number.isInteger
  },
  description: { type: String, trim: true, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);

