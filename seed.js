require("dotenv").config();
const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
const User = require("./models/User");
const Course = require("./models/Course");
const Offering = require("./models/Offering");
const AcademicRecord = require("./models/AcademicRecord");
const Registration = require("./models/Registration");

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully!");

    // 1. Clear existing seed collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Offering.deleteMany({});
    await AcademicRecord.deleteMany({});
    await Registration.deleteMany({});
    console.log("Cleared existing collections.");

    // 2. Create Default Users (Admin, Advisor, and Student)
    const admin = await User.create({
      name: "System Admin",
      email: "admin@stamford.edu",
      password: "password123",
      role: "admin",
      studentId: "ADM001",
      active: true
    });

    const advisor = await User.create({
      name: "Dr. Advisor",
      email: "advisor@stamford.edu",
      password: "password123",
      role: "advisor",
      studentId: "ADV001",
      active: true
    });

    const studentSami = await User.create({
      name: "Sami Parilti",
      email: "sami@stamford.edu",
      password: "password123",
      role: "student",
      studentId: "2407080009",
      active: true
    });

    const studentAlice = await User.create({
      name: "Alice Johnson",
      email: "alice@stamford.edu",
      password: "password123",
      role: "student",
      studentId: "2407080010",
      active: true
    });

    console.log("Created 4 test users (Admin, Advisor, Sami, Alice).");

    // 3. Create Sample Courses
    const c1 = await Course.create({
      code: "CSC101",
      title: "Introduction to Computer Science",
      credits: 3,
      prerequisites: [],
      department: "Computer Science"
    });

    const c2 = await Course.create({
      code: "CSC102",
      title: "Data Structures & Algorithms",
      credits: 4,
      prerequisites: ["CSC101"],
      department: "Computer Science"
    });

    const c3 = await Course.create({
      code: "CSC220",
      title: "Web Application Development",
      credits: 3,
      prerequisites: ["CSC101"],
      department: "Computer Science"
    });

    const c4 = await Course.create({
      code: "MAT101",
      title: "Calculus I",
      credits: 3,
      prerequisites: [],
      department: "Mathematics"
    });

    const c5 = await Course.create({
      code: "ENG101",
      title: "Academic English Writing",
      credits: 3,
      prerequisites: [],
      department: "Languages"
    });

    console.log("Created 5 sample courses (CSC101, CSC102, CSC220, MAT101, ENG101).");

    // 4. Create Current Term Offerings (2026-1)
    const off1 = await Offering.create({
      courseId: c3._id,
      code: c3.code,
      title: c3.title,
      section: "1",
      term: "2026-1",
      day: "Monday",
      startTime: "09:00",
      endTime: "12:00",
      room: "Room 401",
      instructor: "Dr. Advisor",
      advisorEmail: "advisor@stamford.edu",
      seats: 30,
      enrolled: 1,
      addDropOpen: true
    });

    const off2 = await Offering.create({
      courseId: c2._id,
      code: c2.code,
      title: c2.title,
      section: "2",
      term: "2026-1",
      day: "Wednesday",
      startTime: "13:00",
      endTime: "16:00",
      room: "Lab 3",
      instructor: "Prof. Alan Turing",
      advisorEmail: "advisor@stamford.edu",
      seats: 25,
      enrolled: 1,
      addDropOpen: true
    });

    const off3 = await Offering.create({
      courseId: c4._id,
      code: c4.code,
      title: c4.title,
      section: "1",
      term: "2026-1",
      day: "Friday",
      startTime: "10:00",
      endTime: "13:00",
      room: "Hall B",
      instructor: "Dr. Newton",
      advisorEmail: "advisor@stamford.edu",
      seats: 40,
      enrolled: 0,
      addDropOpen: false
    });

    console.log("Created 3 course offerings for term 2026-1.");

    // 5. Create Academic Record (Prior Completed Courses for Sami)
    await AcademicRecord.create({
      studentId: studentSami._id,
      courseId: c1._id,
      term: "2025-2",
      grade: "A"
    });

    await AcademicRecord.create({
      studentId: studentSami._id,
      courseId: c5._id,
      term: "2025-2",
      grade: "B+"
    });

    console.log("Created academic history for Sami (CSC101: A, ENG101: B+).");

    // 6. Create Current Enrolled Registrations for Sami
    await Registration.create({
      studentId: studentSami._id,
      offeringId: off1._id,
      term: "2026-1",
      status: "Enrolled"
    });

    await Registration.create({
      studentId: studentSami._id,
      offeringId: off2._id,
      term: "2026-1",
      status: "Enrolled"
    });

    console.log("Enrolled Sami into CSC220 & CSC102 for 2026-1.");

    console.log("\n==========================================");
    console.log("✅ SEEDING COMPLETE!");
    console.log("Accounts created:");
    console.log("  👤 Admin:   admin@stamford.edu   | Password: password123");
    console.log("  👤 Advisor: advisor@stamford.edu | Password: password123");
    console.log("  👤 Student: sami@stamford.edu    | Password: password123");
    console.log("  👤 Student: alice@stamford.edu   | Password: password123");
    console.log("==========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();

