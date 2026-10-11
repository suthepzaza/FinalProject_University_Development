const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Offering = require("../models/Offering");
const Course = require("../models/Course");
const AcademicRecord = require("../models/AcademicRecord");
const User = require("../models/User");
const offering = overrides => new Offering({ courseId: new mongoose.Types.ObjectId(), code: "CSC220", title: "Web Development", ...overrides });
test("offering rejects invalid capacity, timetable, day and term", async () => {
  for (const invalid of [{ seats: -1 }, { seats: 1.5 }, { enrolled: -1 }, { seats: 2, enrolled: 3 },
    { startTime: "25:00" }, { endTime: "08:00" }, { endTime: "09:00" }, { day: "Funday" }, { term: "2026-4" }]) {
    await assert.rejects(offering(invalid).validate(), mongoose.Error.ValidationError);
  }
  await offering({ seats: 0 }).validate();
  await offering({ seats: 30, enrolled: 30 }).validate();
});
test("credits must be positive integers and record terms must use trimester format", async () => {
  for (const credits of [-1, 0, 1.5, 7]) {
    await assert.rejects(new Course({ code: "CSC220", title: "Web", credits }).validate());
  }
  await assert.rejects(new AcademicRecord({ studentId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), term: "bad", grade: "A" }).validate());
});
test("student IDs are required and advisor references must resolve to active advisors", async t => {
  await assert.rejects(new User({ name: "Test Student", email: "test@example.com", password: "password123", role: "student" }).validate());
  t.mock.method(User, "findOne", async () => null);
  await assert.rejects(new User({ name: "Test Student", email: "test@example.com", password: "password123", studentId: "DEMO001", advisorId: new mongoose.Types.ObjectId() }).validate());
});
