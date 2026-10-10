const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const User = require("../models/User");
const AcademicRecord = require("../models/AcademicRecord");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const requireOwnStudent = require("../middleware/requireOwnStudent");
const router = express.Router();
router.use(auth);

// Helper to resolve student ObjectId from MongoDB _id or studentId string
async function resolveStudentId(paramId) {
  if (mongoose.Types.ObjectId.isValid(paramId)) {
    const user = await User.findById(paramId);
    if (user) return user._id;
  }
  const user = await User.findOne({ studentId: paramId });
  if (user) return user._id;
  return paramId;
}

// GET /api/students/:id/record - Student's past academic records
router.get("/:id/record", requireOwnStudent, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.params.id);
    const records = await AcademicRecord.find({ studentId }).populate("courseId");
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to load student record: " + error.message });
  }
});

// GET /api/students/:id/eligible - Rules Engine: Prerequisite, Retake, Seat, and Clash Validation
router.get("/:id/eligible", requireRole("advisor"), async (req, res) => {
  try {
    const term = req.query.term || "2026-1";
    const studentId = await resolveStudentId(req.params.id);

    // 1. Fetch student's prior academic record
    const records = await AcademicRecord.find({ studentId }).populate("courseId");

    // 2. Fetch student's current active registrations for this term
    const currentRegs = await Registration.find({ studentId, term }).populate({
      path: "offeringId",
      populate: { path: "courseId" }
    });

    // 3. Fetch all course offerings for this term
    const offerings = await Offering.find({ term }).populate("courseId");

    const eligible = [];
    const excluded = [];

    // Helper: parse "HH:MM" to minutes
    const parseMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + (m || 0);
    };

    // Helper: test overlapping timetable
    const hasOverlap = (off1, off2) => {
      if (!off1.day || !off2.day || off1.day !== off2.day) return false;
      const s1 = parseMinutes(off1.startTime);
      const e1 = parseMinutes(off1.endTime);
      const s2 = parseMinutes(off2.startTime);
      const e2 = parseMinutes(off2.endTime);
      return s1 < e2 && e1 > s2;
    };

    for (const off of offerings) {
      const courseCode = off.courseId?.code || off.code;
      const courseTitle = off.courseId?.title || off.title;

      // Rule 1: Already registered for this course this term
      const alreadyRegistered = currentRegs.find((reg) => {
        const regCode = reg.offeringId?.courseId?.code || reg.offeringId?.code;
        return regCode === courseCode;
      });

      if (alreadyRegistered) {
        excluded.push({
          offering: off,
          reason: `Already enrolled this term in Sec ${alreadyRegistered.offeringId?.section || '1'}`
        });
        continue;
      }

      // Rule 2: Already passed in prior term (grade !== 'F' and grade !== 'W')
      const passedRecord = records.find((rec) => {
        const recCode = rec.courseId?.code || rec.code;
        return recCode === courseCode && rec.grade !== 'F' && rec.grade !== 'W';
      });

      if (passedRecord) {
        excluded.push({
          offering: off,
          reason: `Already passed in term ${passedRecord.term} with grade ${passedRecord.grade}`
        });
        continue;
      }

      // Rule 3: Missing Prerequisites
      const prerequisites = off.courseId?.prerequisites || [];
      const missingPrereqs = [];
      for (const prereqCode of prerequisites) {
        const hasPassedPrereq = records.some((rec) => {
          const recCode = rec.courseId?.code || rec.code;
          return recCode === prereqCode && rec.grade !== 'F' && rec.grade !== 'W';
        });
        if (!hasPassedPrereq) {
          missingPrereqs.push(prereqCode);
        }
      }

      if (missingPrereqs.length > 0) {
        excluded.push({
          offering: off,
          reason: `Missing prerequisite: ${missingPrereqs.join(', ')}`
        });
        continue;
      }

      // Rule 4: Seats Available
      const seatsTotal = off.seats || 30;
      const seatsTaken = off.seatsTaken || off.enrolled || 0;
      if (seatsTaken >= seatsTotal) {
        excluded.push({
          offering: off,
          reason: "Section full (0 seats remaining)"
        });
        continue;
      }

      // Rule 5: Time Clash with another registered course this term
      let clashFound = false;
      for (const reg of currentRegs) {
        if (reg.offeringId && hasOverlap(off, reg.offeringId)) {
          const clashCode = reg.offeringId.courseId?.code || reg.offeringId.code;
          excluded.push({
            offering: off,
            reason: `Time clash with ${clashCode} (${reg.offeringId.day} ${reg.offeringId.startTime}-${reg.offeringId.endTime})`
          });
          clashFound = true;
          break;
        }
      }
      if (clashFound) continue;

      // Rule 6: Retake Priority Flag (student failed previously with 'F')
      const failedRecord = records.find((rec) => {
        const recCode = rec.courseId?.code || rec.code;
        return recCode === courseCode && rec.grade === 'F';
      });

      eligible.push({
        offering: off,
        isEligible: true,
        isRetake: Boolean(failedRecord)
      });
    }

    res.json({ eligible, excluded });
  } catch (error) {
    res.status(500).json({ error: "Failed to evaluate student eligibility: " + error.message });
  }
});

// GET all students - advisor or admin
router.get("/", requireRole("advisor", "admin"), async (req, res) => {
    try {
        let students = await Student.find();
        if (!students || students.length === 0) {
            students = await User.find({ role: "student" }).select("-password");
        }
        res.json(students);
    } catch (error) {
        res.status(500).json({
            error: "Server error"
        });
    }
});

// GET one student - advisor or own student
router.get("/:id", requireOwnStudent, async (req, res) => {
    try {
        let student = null;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            student = await Student.findById(req.params.id);
            if (!student) {
                student = await User.findById(req.params.id).select("-password");
            }
        } else {
            student = await User.findOne({ studentId: req.params.id }).select("-password");
        }

        if (!student) {
            return res.status(404).json({
                error: "Student not found"
            });
        }

        res.json(student);
    } catch (error) {
        res.status(400).json({
            error: "Invalid student ID"
        });
    }
});

// POST student - token required
router.post("/", requireRole("admin"), async (req, res) => {
    try {
        const created = await Student.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// PATCH student - token required
router.patch("/:id", requireRole("admin"), async (req, res) => {
    try {
        const updated = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updated) {
            return res.status(404).json({
                error: "Student not found"
            });
        }

        res.json(updated);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// DELETE student - token required
router.delete("/:id", requireRole("admin"), async (req, res) => {
    try {
        const deleted = await Student.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: "Student not found"
            });
        }

        res.status(204).send();
    } catch (error) {
        res.status(400).json({
            error: "Invalid student ID"
        });
    }
});

module.exports = router;
