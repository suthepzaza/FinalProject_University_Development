const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const express = require("express");
const { seed } = require("../seed");
const User = require("../models/User");
const Course = require("../models/Course");
const Offering = require("../models/Offering");
const AcademicRecord = require("../models/AcademicRecord");
const Term = require("../models/Term");
const Registration = require("../models/Registration");
const models = [User, Course, Offering, AcademicRecord, Registration, Term];

test("seed creates the complete validated dataset with hashed passwords and working role logins", async t => {
  const stored = new Map(models.map(model => [model, []]));
  const output = [];
  const oldUri = process.env.MONGODB_URI;
  const oldSecret = process.env.JWT_SECRET;
  process.env.MONGODB_URI = "mongodb://seed-test.invalid/test";
  process.env.JWT_SECRET = "seed-test-secret";
  t.after(() => {
    if (oldUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = oldUri;
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  t.mock.method(mongoose, "connect", async () => {});
  t.mock.method(mongoose, "disconnect", async () => {});
  t.mock.method(console, "log", line => output.push(line));
  t.mock.method(User, "findOne", async filter => stored.get(User).find(user =>
    (!filter._id || String(user._id) === String(filter._id)) &&
    (!filter.role || user.role === filter.role)));
  for (const model of models) {
    t.mock.method(model, "exists", async () => null);
    t.mock.method(model, "init", async () => model);
    if (model !== User) {
      t.mock.method(model, "insertMany", async data => {
        const documents = data.map(row => new model(row));
        await Promise.all(documents.map(doc => doc.validate()));
        stored.get(model).push(...documents);
        return documents;
      });
    }
  }
  t.mock.method(Term, "create", async data => { const doc = new Term(data); await doc.validate(); return doc; });
  // Keep User.create/save real so Mongoose validation and the bcrypt hook run.
  t.mock.method(User.collection, "insertOne", async document => {
    stored.get(User).push(document);
    return { acknowledged: true, insertedId: document._id };
  });
  await seed();
  const users = stored.get(User), courses = stored.get(Course);
  const offerings = stored.get(Offering), records = stored.get(AcademicRecord);
  assert.equal(users.filter(user => user.role === "student").length, 25);
  assert.equal(users.filter(user => user.role === "advisor").length, 4);
  assert.equal(users.filter(user => user.role === "admin").length, 1);
  assert.equal(courses.length, 18);
  assert.ok(courses.every(course => course.credits === 4));
  assert.equal(courses.find(course => course.code === "ITE220").title, "Web Development II");
  assert.equal(courses.find(course => course.code === "ITE441").title, "Database Management Systems I");
  assert.equal(courses.find(course => course.code === "MAT101").title, "Fundamentals of Algebra");
  assert.ok(courses.every(course => !course.code.startsWith("CSC")));
  assert.equal(offerings.length, 26);
  assert.equal(records.length, 312);
  assert.equal(new Set(users.map(user => user.email)).size, 30);
  assert.equal(new Set(users.map(user => user.studentId)).size, 30);
  for (const student of users.filter(user => user.role === "student")) {
    assert.match(student.studentId, /^DEMO2026\d{3}$/);
    assert.ok(users.some(advisor => advisor.role === "advisor" && advisor._id.equals(student.advisorId)));
  }
  assert.ok(courses.every(course => course.description.length > 0));
  for (const user of users) {
    assert.notEqual(user.password, "password123");
    assert.equal(await bcrypt.compare("password123", user.password), true);
  }
  for (const student of users.filter(user => user.role === "student")) {
    assert.ok(records.filter(record => String(record.studentId) === String(student._id)).length >= 12);
  }
  for (const offering of offerings) {
    assert.equal(offering.term, "2026-1");
    assert.equal(offering.enrolled, 0);
    assert.ok(courses.some(course => course._id.equals(offering.courseId)));
  }
  for (const record of records) {
    assert.ok(users.some(user => user.role === "student" && user._id.equals(record.studentId)));
    const course = courses.find(course => course._id.equals(record.courseId));
    assert.ok(course);
  }
  const failures = records.filter(record => record.grade === "F");
  assert.equal(failures.length, 2);
  for (const failure of failures) assert.ok(offerings.some(offering => offering.courseId.equals(failure.courseId)));
  assert.deepEqual(output.slice(0, 3), [
    "25 students, 4 advisors, 1 admin created",
    "18 courses, 26 sections created for term 2026-1",
    "312 completed-course records created"
  ]);
  t.mock.method(User, "findOne", async filter => users.find(user => user.email === filter.email));
  const app = express();
  app.use(express.json());
  app.use("/api/auth", require("../routes/auth"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    for (const [role, email] of [["admin", "admin@stamford.edu"], ["advisor", "advisor@stamford.edu"], ["student", "sami@stamford.edu"]]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" })
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.user.role, role);
      assert.ok(result.token);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("seed refuses populated databases before writing anything", async t => {
  const oldUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "mongodb://seed-test.invalid/test";
  t.after(() => {
    if (oldUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = oldUri;
  });
  t.mock.method(mongoose, "connect", async () => {});
  const disconnect = t.mock.method(mongoose, "disconnect", async () => {});
  for (const model of models) t.mock.method(model, "exists", async () => model === User ? { _id: "existing" } : null);
  const create = t.mock.method(User, "create", async () => { throw new Error("Unexpected write"); });
  await assert.rejects(seed(), /requires an empty database/);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(disconnect.mock.callCount(), 1);
});
