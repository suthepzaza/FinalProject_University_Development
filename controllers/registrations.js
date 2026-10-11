const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const User = require("../models/User");

// GET /api/registrations?studentId=...&term=...
exports.list = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.role === "student") {
      filter.studentId = req.user.id;
    } else if (req.query.studentId) {
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
    const payload = { ...req.body };
    if (req.user?.role === "student") {
      payload.studentId = req.user.id;
      const offering = payload.offeringId && mongoose.isValidObjectId(payload.offeringId)
        ? await Offering.findById(payload.offeringId)
        : null;
      if (!offering) {
        return res.status(404).json({ error: "Course offering not found" });
      }
      const status = await registrationService.addDropStatus(offering);
      if (!status.addDropOpen) {
        return res.status(409).json({ error: "Registration for this section is closed" });
      }
    }
    const registration = await registrationService.register(payload);
    res.status(201).json(registration);
  } catch (error) {
    res.status(error.status || (error.code === 11000 ? 409 : 400)).json({ error: error.message });
  }
};
exports.remove = async (req, res) => {
  try {
    if (req.user?.role === "student") {
      const reg = await Registration.findById(req.params.id);
      if (!reg || String(reg.studentId) !== String(req.user.id)) {
        return res.status(403).json({ error: "Unauthorized to drop this registration" });
      }
    }
    await registrationService.drop(req.params.id);
    res.json({ message: "Registration removed successfully" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};
