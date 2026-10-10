const express = require("express");
const auth = require("../middleware/auth");
const Registration = require("../models/Registration");
const AcademicRecord = require("../models/AcademicRecord");

const requireRole = require("../middleware/requireRole");
const router = express.Router();
router.use(auth, requireRole("student"));

// GET /api/me/registrations - student's current term registrations
router.get("/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find({ studentId: req.user.id })
      .populate({
        path: "offeringId",
        populate: { path: "courseId" }
      });
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: "Failed to load registrations: " + err.message });
  }
});

// GET /api/me/record - student's completed academic history
router.get("/record", async (req, res) => {
  try {
    const record = await AcademicRecord.find({ studentId: req.user.id })
      .populate("courseId");
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to load academic record: " + err.message });
  }
});

module.exports = router;

