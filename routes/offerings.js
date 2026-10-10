const express = require("express");
const Offering = require("../models/Offering");
const Course = require("../models/Course");
const auth = require("../middleware/auth");

const requireRole = require("../middleware/requireRole");
const router = express.Router();
router.use(auth);

// GET /api/offerings?term=...
router.get("/", requireRole("advisor", "student"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.term) filter.term = req.query.term;
    const offerings = await Offering.find(filter).populate("courseId");
    res.json(offerings);
  } catch (err) {
    res.status(500).json({ error: "Failed to load offerings: " + err.message });
  }
});

// POST /api/offerings - Create offering (Advisor)
router.post("/", requireRole("advisor"), async (req, res) => {
  try {
    const { code, title, section, term, day, startTime, endTime, room, instructor, seats } = req.body;
    let course = await Course.findOne({ code: code.toUpperCase() });
    if (!course) {
      course = await Course.create({
        code: code.toUpperCase(),
        title: title || code,
        credits: 3
      });
    }

    const offering = await Offering.create({
      courseId: course._id,
      code: course.code,
      title: course.title,
      section: section || "1",
      term: term || "2026-1",
      day: day || "Monday",
      startTime: startTime || "09:00",
      endTime: endTime || "12:00",
      room: room || "Room 401",
      instructor: instructor || "Dr. Smith",
      seats: seats ? Number(seats) : 30,
      addDropOpen: true
    });

    res.status(201).json(offering);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/offerings/:id - Toggle add/drop window
router.patch("/:id", requireRole("advisor"), async (req, res) => {
  try {
    const updated = await Offering.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/offerings/:id - Delete offering
router.delete("/:id", requireRole("advisor"), async (req, res) => {
  try {
    await Offering.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Offering deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

