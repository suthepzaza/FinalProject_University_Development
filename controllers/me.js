const Registration = require("../models/Registration");
const AcademicRecord = require("../models/AcademicRecord");

const User = require("../models/User");

exports.profile = async (req, res) => {
  try {
    const profile = await User.findById(req.user.id).select("name email studentId advisorId").populate("advisorId", "name email");
    res.json(profile);
  } catch (error) { res.status(500).json({ error: "Failed to load profile" }); }
};

// GET /api/me/registrations - student's current term registrations
exports.registrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ studentId: req.user.id, term: req.query.term || "2026-1", status: "Enrolled" })
      .populate({
        path: "offeringId",
        populate: { path: "courseId" }
      });
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: "Failed to load registrations: " + err.message });
  }
};

// GET /api/me/record - student's completed academic history
exports.record = async (req, res) => {
  try {
    const record = await AcademicRecord.find({ studentId: req.user.id })
      .populate("courseId");
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to load academic record: " + err.message });
  }
};
