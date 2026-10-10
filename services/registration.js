const mongoose = require("mongoose");
const User = require("../models/User");
const Offering = require("../models/Offering");
const Registration = require("../models/Registration");
const AcademicRecord = require("../models/AcademicRecord");
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }

exports.register = async ({ studentId, offeringId, term }) => {
  if (!studentId || !offeringId) fail("studentId and offeringId are required");
  return mongoose.connection.transaction(async session => {
    const student = await User.findOne({
      ...(mongoose.isValidObjectId(studentId) ? { _id: studentId } : { studentId }),
      role: "student", active: true
    }).session(session);
    if (!student) fail("Active student not found", 404);
    // Serialize changes for this student so simultaneous selections cannot bypass clash checks.
    await User.updateOne({ _id: student._id }, { $currentDate: { updatedAt: true } }, { session });
    const offering = await Offering.findById(offeringId).populate("courseId").session(session);
    if (!offering) fail("Course offering not found", 404);
    if (term && term !== offering.term) fail("Term must match the offering");
    if (await Registration.exists({ studentId: student._id, offeringId }).session(session)) fail("Student is already registered for this section", 409);
    const records = await AcademicRecord.find({ studentId: student._id }).populate("courseId").session(session);
    const registrations = await Registration.find({ studentId: student._id, term: offering.term, status: "Enrolled" }).populate({ path: "offeringId", populate: { path: "courseId" } }).session(session);
    const result = evaluate(offering, records, registrations);
    if (!result.isEligible) fail(result.reason, 409);
    // This conditional write locks the seat change into the same transaction as registration.
    const reserved = await Offering.findOneAndUpdate({
      _id: offeringId, $expr: { $lt: ["$enrolled", "$seats"] }
    }, { $inc: { enrolled: 1 } }, { session, returnDocument: 'after' });
    if (!reserved) fail("Section full (0 seats remaining)", 409);
    const [registration] = await Registration.create([{
      studentId: student._id, offeringId, term: offering.term, status: "Enrolled"
    }], { session });
    return registration;
  });
};

exports.drop = async id => mongoose.connection.transaction(async session => {
  const registration = await Registration.findById(id).session(session);
  if (!registration) fail("Registration not found", 404);
  if (registration.status === "Enrolled") {
    const updated = await Offering.findOneAndUpdate({
      _id: registration.offeringId, enrolled: { $gt: 0 }
    }, { $inc: { enrolled: -1 } }, { session });
    if (!updated) fail("Seat count is inconsistent; registration was not removed", 409);
  }
  await Registration.deleteOne({ _id: id }, { session });
});

const passedGrades = ["A", "B+", "B", "C+", "C", "D+", "D"];
const code = item => item.courseId?.code || item.code;

function evaluate(offering, records, registrations) {
  const courseCode = code(offering);
  const passed = records.find(record => code(record) === courseCode && passedGrades.includes(record.grade));
  if (passed) return { offering, reason: `Already passed — grade ${passed.grade}` };
  const enrolled = registrations.find(registration => code(registration.offeringId || {}) === courseCode);
  if (enrolled) return { offering, reason: "Already registered this term" };
  if (offering.enrolled >= offering.seats) return { offering, reason: "Full — 0 seats" };
  const clash = registrations.find(({ offeringId: other }) => other && other.day === offering.day &&
    offering.startTime < other.endTime && offering.endTime > other.startTime);
  if (clash) return { offering, reason: `Clashes with ${code(clash.offeringId)} Section ${clash.offeringId.section}` };
  return { offering, isEligible: true, isRetake: records.some(record => code(record) === courseCode && record.grade === "F") };
}

exports.evaluate = evaluate;
exports.passedGrades = passedGrades;
