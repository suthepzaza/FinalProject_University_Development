const express = require("express");
const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const User = require("../models/User");
const auth = require("../middleware/auth");

const requireRole = require("../middleware/requireRole");
const router = express.Router();
router.use(auth);

// GET /api/registrations?studentId=...&term=...
router.get("/", requireRole("advisor"), async (req, res) => {
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
});

// POST /api/registrations - Register student for an offering
router.post("/", requireRole("advisor"), async (req, res) => {
  try {
    const { studentId, offeringId, term } = req.body;

    if (!studentId || !offeringId) {
      return res.status(400).json({ error: "studentId and offeringId are required" });
    }

    let actualStudentId = studentId;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      const user = await User.findOne({ studentId });
      if (user) actualStudentId = user._id;
    }

    const offering = await Offering.findById(offeringId);
    if (!offering) {
      return res.status(404).json({ error: "Course offering not found" });
    }

    const seatsTotal = offering.seats || 30;
    const seatsTaken = offering.seatsTaken || offering.enrolled || 0;
    if (seatsTaken >= seatsTotal) {
      return res.status(400).json({ error: "Cannot register: Section is full." });
    }

    const existing = await Registration.findOne({
      studentId: actualStudentId,
      offeringId: offering._id
    });

    if (existing) {
      return res.status(400).json({ error: "Student is already registered for this section." });
    }

    const reg = await Registration.create({
      studentId: actualStudentId,
      offeringId: offering._id,
      term: term || offering.term || "2026-1",
      status: "Enrolled"
    });

    // Increment seat occupancy on offering
    offering.enrolled = (offering.enrolled || 0) + 1;
    await offering.save();

    res.status(201).json(reg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/registrations/:id - Drop course registration
router.delete("/:id", requireRole("advisor"), async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) {
      return res.status(404).json({ error: "Registration not found" });
    }

    if (reg.offeringId) {
      await Offering.findByIdAndUpdate(reg.offeringId, {
        $inc: { enrolled: -1 }
      });
    }

    await Registration.findByIdAndDelete(req.params.id);
    res.json({ message: "Registration removed successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

