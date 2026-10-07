require("dotenv").config({ path: require("node:path").join(__dirname, ".env"), quiet: true });
const mongoose = require("mongoose");
const User = require("./models/User");
const Course = require("./models/Course");
const Offering = require("./models/Offering");
const AcademicRecord = require("./models/AcademicRecord");
const Registration = require("./models/Registration");
const Student = require("./models/Student");

const TERM = "2026-1";
const PASSWORD = "password123";
// Synthetic, deterministic coursework fixture; prerequisites are course codes.
const catalogue = [
  ["CSC101", "Introduction to Computer Science", 3, []],
  ["CSC102", "Data Structures & Algorithms", 4, ["CSC101"]],
  ["CSC220", "Web Application Development", 3, ["CSC101"]],
  ["MAT101", "Calculus I", 3, []],
  ["ENG101", "Academic English Writing", 3, []],
  ["CSC103", "Programming Fundamentals", 3, ["CSC101"]],
  ["CSC201", "Object Oriented Programming", 3, ["CSC103"]],
  ["CSC202", "Database Systems", 3, ["CSC102"]],
  ["CSC203", "Computer Architecture", 3, ["CSC101"]],
  ["CSC204", "Operating Systems", 3, ["CSC203"]],
  ["CSC205", "Computer Networks", 3, ["CSC101"]],
  ["MAT102", "Calculus II", 3, ["MAT101"]],
  ["MAT201", "Discrete Mathematics", 3, ["MAT101"]],
  ["STA101", "Introduction to Statistics", 3, []],
  ["ENG102", "English Communication", 3, ["ENG101"]],
  ["CSC301", "Software Engineering", 3, ["CSC201", "CSC202"]],
  ["CSC302", "Artificial Intelligence", 3, ["CSC102", "MAT201"]],
  ["CSC303", "Information Security", 3, ["CSC205"]]
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and set your database URI.");
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const models = [User, Course, Offering, AcademicRecord, Registration, Student];
    const existing = await Promise.all(models.map(model => model.exists({})));
    if (existing.some(Boolean)) {
      throw new Error("Seed requires an empty database. Use a new database in MONGODB_URI; existing data has not been changed.");
    }
    await Promise.all(models.map(model => model.init()));

    // create() runs User's save hook so every password is bcrypt hashed.
    await User.create({ name: "System Admin", email: "admin@stamford.edu", password: PASSWORD, role: "admin", studentId: "ADM001", active: true });
    const advisors = [];
    for (let i = 0; i < 4; i++) {
      advisors.push(await User.create({ name: `Dr. Advisor ${i + 1}`, email: i === 0 ? "advisor@stamford.edu" : `advisor${i + 1}@stamford.edu`, password: PASSWORD, role: "advisor", studentId: `ADV00${i + 1}`, active: true }));
    }
    const students = [];
    for (let i = 0; i < 25; i++) {
      students.push(await User.create({
        name: i === 0 ? "Sami Parilti" : i === 1 ? "Alice Johnson" : `Student ${String(i + 1).padStart(2, "0")}`,
        email: i === 0 ? "sami@stamford.edu" : i === 1 ? "alice@stamford.edu" : `student${String(i + 1).padStart(2, "0")}@stamford.edu`,
        password: PASSWORD, role: "student", studentId: String(2407080009 + i), active: true
      }));
    }
    const courses = await Course.insertMany(catalogue.map(([code, title, credits, prerequisites]) => ({
      code, title, credits, prerequisites,
      department: code.startsWith("CSC") ? "Computer Science" : code.startsWith("ENG") ? "Languages" : "Mathematics"
    })));
    const sections = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    courses.forEach((course, i) => {
      for (let section = 1; section <= (i < 8 ? 2 : 1); section++) {
        const slot = sections.length;
        const advisor = advisors[slot % advisors.length];
        sections.push({ courseId: course._id, code: course.code, title: course.title, section: String(section), term: TERM,
          day: days[slot % 5], startTime: slot % 2 === 0 ? "09:00" : "13:00", endTime: slot % 2 === 0 ? "12:00" : "16:00",
          room: `Room ${401 + slot}`, instructor: advisor.name, advisorEmail: advisor.email, seats: 30, enrolled: 0, addDropOpen: true });
      }
    });
    await Offering.insertMany(sections);

    // First 12 students have 13 completions; remaining 13 have 12: 312 total.
    // Prerequisites are completed in earlier terms, before their dependants.
    const history = [
      ["CSC101", "2024-1"], ["MAT101", "2024-1"], ["ENG101", "2024-1"], ["STA101", "2024-1"],
      ["CSC103", "2024-2"], ["CSC102", "2024-2"], ["CSC203", "2024-2"], ["MAT102", "2024-2"],
      ["ENG102", "2024-2"], ["MAT201", "2024-2"], ["CSC201", "2025-1"], ["CSC202", "2025-1"], ["CSC204", "2025-2"]
    ];
    const byCode = new Map(courses.map(course => [course.code, course]));
    const grades = ["A", "B+", "B", "C+", "C", "D+", "D"];
    const records = students.flatMap((student, i) => history.slice(0, i < 12 ? 13 : 12).map(([code, term], j) => ({
      studentId: student._id, courseId: byCode.get(code)._id, term, grade: grades[(i + j) % grades.length]
    })));
    await AcademicRecord.insertMany(records);
    console.log("25 students, 4 advisors, 1 admin created");
    console.log(`18 courses, 26 sections created for term ${TERM}`);
    console.log(`${records.length} completed-course records created`);
    console.log(`\nDemo logins (password: ${PASSWORD}):\n  Student: sami@stamford.edu\n  Advisor: advisor@stamford.edu\n  Admin:   admin@stamford.edu`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed().catch(error => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  });
}
module.exports = { seed };
