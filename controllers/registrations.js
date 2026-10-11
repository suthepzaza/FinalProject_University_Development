const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const User = require("../models/User");

// GET /api/registrations?studentId=...&term=...
exports.list = async (req, res) => {
  try {
    const filter = {};

    if (req.query.studentId) {
      if (mongoose.Types.ObjectId.isValid(req.query.studentId)) {
        filter.studentId = req.query.studentId;
      } else {
        const user = await User.findOne({ studentId: req.query.studentId });
        filter.studentId = user ? user._id : req.query.studentId;
      }
    }

    if (req.query.term) {
      filter.term = req.query.term;
    }

    const registrations = await Registration.find(filter).populate({
      path: "offeringId",
      populate: { path: "courseId" }
    });

    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: "Failed to load registrations: " + err.message });
  }
};

const registrationService = require("../services/registration");
exports.create = async (req, res) => {
  try {
    const registration = await registrationService.register(req.body);
    res.status(201).json(registration);
  } catch (error) {
    res.status(error.status || (error.code === 11000 ? 409 : 400)).json({ error: error.message });
  }
};
exports.remove = async (req, res) => {
  try {
    await registrationService.drop(req.params.id);
    res.json({ message: "Registration removed successfully" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};
