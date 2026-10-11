const mongoose = require("mongoose");
const User = require("../models/User");
const AcademicRecord = require("../models/AcademicRecord");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const { evaluate } = require("../services/registration");

async function studentId(id) {
  const student = mongoose.isValidObjectId(id) ? await User.findById(id) : await User.findOne({ studentId: id });
  if (!student || student.role !== "student") {
    const error = new Error("Student not found"); error.status = 404; throw error;
  }
  return student._id;
}
exports.list = async (req, res) => {
  try { res.json(await User.find({ role: "student" }).select("-password")); }
  catch (error) { res.status(500).json({ error: "Failed to load students" }); }
};
exports.record = async (req, res) => {
  try { res.json(await AcademicRecord.find({ studentId: await studentId(req.params.id) }).populate("courseId")); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
exports.eligible = async (req, res) => {
  try {
    const id = await studentId(req.params.id);
    const term = req.query.term || "2026-1";
    const records = await AcademicRecord.find({ studentId: id }).populate("courseId");
    const registrations = await Registration.find({ studentId: id, term, status: "Enrolled" }).populate({ path: "offeringId", populate: { path: "courseId" } });
    const offerings = await Offering.find({ term }).populate("courseId");
    const results = offerings.map(offering => evaluate(offering, records, registrations));
    const eligible = results.filter(result => result.isEligible).sort((a, b) => Number(b.isRetake) - Number(a.isRetake));
    res.json({ eligible, excluded: results.filter(result => !result.isEligible) });
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
exports.detail = async (req, res) => {
  try { res.json(await User.findById(await studentId(req.params.id)).select("-password")); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
