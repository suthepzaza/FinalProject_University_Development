const Offering = require("../models/Offering");
const Course = require("../models/Course");
const mongoose = require("mongoose");
const Registration = require("../models/Registration");

// GET /api/offerings?term=...
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.term) filter.term = req.query.term;
    const offerings = await Offering.find(filter).populate("courseId");
    res.json(offerings);
  } catch (err) {
    res.status(500).json({ error: "Failed to load offerings: " + err.message });
  }
};

// POST /api/offerings - Create offering (Advisor)
exports.create = async (req, res) => {
  try {
    const { code, title, section, term, day, startTime, endTime, room, instructor, seats, addDropOpen, addDropClosesAt } = req.body;
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
      seats: seats === undefined ? 30 : Number(seats),
      addDropOpen: addDropOpen === true,
      addDropClosesAt: addDropClosesAt || undefined,
      advisorEmail: req.user.email
    });

    res.status(201).json(offering);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PATCH /api/offerings/:id - Toggle add/drop window
exports.update = async (req, res) => {
  try {
    const updated = await mongoose.connection.transaction(async session => {
      const offering = await Offering.findById(req.params.id).session(session);
      if (!offering) { const error = new Error("Offering not found"); error.status = 404; throw error; }
      for (const key of ["section", "day", "startTime", "endTime", "room", "instructor", "seats", "addDropOpen", "addDropClosesAt"]) {
        if (Object.hasOwn(req.body, key)) offering[key] = req.body[key];
      }
      await offering.save({ session });
      return offering;
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/offerings/:id - Delete offering
exports.remove = async (req, res) => {
  try {
    await mongoose.connection.transaction(async session => {
      const offering = await Offering.findById(req.params.id).session(session);
      if (!offering) throw new Error("Offering not found");
      if (await Registration.exists({ offeringId: offering._id }).session(session)) {
        throw new Error("Cannot remove an offering with registrations");
      }
      await Offering.deleteOne({ _id: offering._id }, { session });
    });
    res.status(200).json({ message: "Offering deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
