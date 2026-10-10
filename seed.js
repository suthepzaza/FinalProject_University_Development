require("dotenv").config({ path: require("node:path").join(__dirname, ".env"), quiet: true });
const mongoose = require("mongoose");
const User = require("./models/User");
const Course = require("./models/Course");
const Offering = require("./models/Offering");
const AcademicRecord = require("./models/AcademicRecord");
const Term = require("./models/Term");
const Registration = require("./models/Registration");

const TERM = "2026-1";
const PASSWORD = "password123";
// Invented demo identities, unrelated to classmates or real academic records.
const studentNames = ["Mira Maple", "Arun Cedar", "Lina Willow", "Theo Birch", "Nora Aspen", "Kai Rowan", "Ella Clover", "Owen Fern", "Zara Hazel", "Leo Alder", "Iris Elm", "Finn Laurel", "Maya Linden", "Evan Oak", "Rhea Pine", "Noah Reed", "Anya Sage", "Luca Spruce", "Sora Violet", "Milo Juniper", "Ada Moss", "Remy Olive", "Tara Palm", "Jude Cypress", "Nila Lotus"];
function variedTerm(term, i) { return `${Number(term.slice(0, 4)) - (i % 2)}${term.slice(4)}`; }
function profile(i) { return { name: studentNames[i], studentId: 'DEMO2026' + String(i + 1).padStart(3, '0') }; }
// Source: BSC_CIS_IT curriculum 2025_update 9_July.docx.
// Four credits per subject derived from the document's category totals.
const catalogue = [
  ["BSC101","Introduction to Computing and Intelligence Systems",4],
  ["BSC103","Introduction to Data structures and algorithms analysis",4],
  ["ITE220","Web Development II",4],
  ["MAT101","Fundamentals of Algebra",4],
  ["ENG101","Introduction to Academic Writing",4],
  ["ITE221","IT Programming I",4],
  ["ITE222","IT Programming II",4],
  ["ITE441","Database Management Systems I",4],
  ["BSC104","Computer Organization",4],
  ["ITE240","Operating Systems",4],
  ["ITE475","Network I",4],
  ["MAT102","Business Mathematics with MS Excel",4],
  ["BSC102","Discrete mathematics structures",4],
  ["STA101","Statistics for Everyday Life and Beyond",4],
  ["ENG102","Academic Writing",4],
  ["BSC321","System Analysis, Design, and Implementation",4],
  ["BSC224","Introduction to Data Science",4],
  ["ITE420","Information Assurance and Security I",4]
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and set your database URI.");
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const models = [User, Course, Offering, AcademicRecord, Registration, Term];
    const existing = await Promise.all(models.map(model => model.exists({})));
    if (existing.some(Boolean)) {
      throw new Error("Seed requires an empty database. Use a new database in MONGODB_URI; existing data has not been changed.");
    }
    await Promise.all(models.map(model => model.init()));

    await Term.create({ code: TERM, finalized: false });

    // create() runs User's save hook so every password is bcrypt hashed.
    await User.create({ name: "System Admin", email: "admin@stamford.edu", password: PASSWORD, role: "admin", studentId: "ADM001", active: true });
    const advisors = [];
    for (let i = 0; i < 4; i++) {
      advisors.push(await User.create({ name: `Dr. Advisor ${i + 1}`, email: i === 0 ? "advisor@stamford.edu" : `advisor${i + 1}@stamford.edu`, password: PASSWORD, role: "advisor", studentId: `ADV00${i + 1}`, active: true }));
    }
    const students = [];
    for (let i = 0; i < 25; i++) {
      students.push(await User.create({
        ...profile(i),
        advisorId: advisors[i % advisors.length]._id,
        email: i === 0 ? "sami@stamford.edu" : i === 1 ? "alice@stamford.edu" : `student${String(i + 1).padStart(2, "0")}@stamford.edu`,
        password: PASSWORD, role: "student", active: true
      }));
    }
    const courses = await Course.insertMany(catalogue.map(([code, title, credits]) => ({
      code, title, credits, description: `Study of ${title.toLowerCase()}, with practical exercises and academic assessment.`
    })));
    const sections = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    courses.forEach((course, i) => {
      for (let section = 1; section <= (i < 8 ? 2 : 1); section++) {
        const slot = sections.length;
        const advisor = advisors[slot % advisors.length];
        sections.push({ courseId: course._id, code: course.code, title: course.title, section: String(section), term: TERM,
          day: days[slot % 5], startTime: slot % 2 === 0 ? "09:00" : "13:00", endTime: slot % 2 === 0 ? "12:00" : "16:00",
          room: `Room ${401 + slot}`, instructor: advisor.name, advisorEmail: advisor.email, seats: 30, enrolled: 0, addDropOpen: false });
      }
    });
    await Offering.insertMany(sections);

    // First 12 students have 13 records; remaining 13 have 12: 312 total.
    // Earlier-term grades include two failed courses for retake demonstrations.
    const history = [
      ["BSC101", "2024-1"], ["MAT101", "2024-1"], ["ENG101", "2024-1"], ["STA101", "2024-2"],
      ["ITE221", "2024-2"], ["BSC103", "2024-1"], ["BSC104", "2024-2"], ["MAT102", "2024-2"],
      ["ENG102", "2024-2"], ["BSC102", "2024-2"], ["ITE222", "2025-1"], ["ITE441", "2025-1"], ["ITE240", "2025-2"]
    ];
    const byCode = new Map(courses.map(course => [course.code, course]));
    const grades = ["A", "B+", "B", "C+", "C", "D+", "D"];
    const records = students.flatMap((student, i) => history.slice(0, i < 12 ? 13 : 12).map(([code, term], j) => ({
      studentId: student._id, courseId: byCode.get(code)._id, term: variedTerm(term, i),
      // Fail only terminal courses: later histories never depend on these failures.
      grade: (i === 0 && code === "ITE240") || (i === 12 && code === "ITE441")
        ? "F" : grades[(i + j) % grades.length]
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
module.exports = { seed, catalogue };
