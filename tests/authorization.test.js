const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AcademicRecord = require("../models/AcademicRecord");

const ids = { admin: "000000000000000000000001", advisor: "000000000000000000000002", student: "000000000000000000000003" };
const accounts = Object.fromEntries(Object.entries(ids).map(([role, id]) => [id, { _id: id, role, active: true, studentId: role === "student" ? "2400000001" : undefined }]));
let server, base;
const originalFind = User.findById;
const originalFindOne = User.findOne;
const originalRecords = AcademicRecord.find;
const originalSecret = process.env.JWT_SECRET;
before(async () => {
  process.env.JWT_SECRET = "authorization-test-secret";
  const query = account => ({ select: async () => account, then: (resolve, reject) => Promise.resolve(account).then(resolve, reject) });
  User.findById = id => query(accounts[id] || null);
  User.findOne = filter => query(Object.values(accounts).find(account => account.studentId === filter.studentId) || null);
  AcademicRecord.find = filter => ({ populate: async () => [{ studentId: String(filter.studentId) }] });
  const app = express();
  app.use(express.json());
  for (const route of ["auth", "users", "students", "offerings", "registrations", "me"]) {
    app.use(`/api/${route}`, require(`../routes/${route}`));
  }
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  User.findById = originalFind;
  User.findOne = originalFindOne;
  AcademicRecord.find = originalRecords;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});
function request(method, path, role, claims = {}) {
  const headers = role ? { Authorization: `Bearer ${jwt.sign({ id: ids[role], role, ...claims }, process.env.JWT_SECRET)}` } : {};
  return fetch(base + path, { method, headers });
}
const protectedRoutes = [
  ["GET", "/api/users", ["student", "advisor"]],
  ["POST", "/api/users", ["student", "advisor"]],
  ["PATCH", `/api/users/${ids.student}`, ["student", "advisor"]],
  ["DELETE", `/api/users/${ids.student}`, ["student", "advisor"]],
  ["GET", "/api/students", ["student"]],
  ["GET", `/api/students/${ids.advisor}/record`, ["student", "admin"]],
  ["GET", `/api/students/${ids.advisor}`, ["student", "admin"]],
  ["GET", `/api/students/${ids.student}/eligible`, ["student", "admin"]],
  ["GET", "/api/offerings", ["admin"]],
  ["POST", "/api/offerings", ["student", "admin"]],
  ["PATCH", `/api/offerings/${ids.student}`, ["student", "admin"]],
  ["DELETE", `/api/offerings/${ids.student}`, ["student", "admin"]],
  ["GET", "/api/registrations", ["student", "admin"]],
  ["POST", "/api/registrations", ["student", "admin"]],
  ["DELETE", `/api/registrations/${ids.student}`, ["student", "admin"]],
  ["GET", "/api/me/record", ["advisor", "admin"]],
  ["GET", "/api/me/profile", ["advisor", "admin"]],
  ["GET", "/api/me/registrations", ["advisor", "admin"]]
];
test("protected endpoints reject anonymous users and forbidden roles before accessing data", async () => {
  for (const [method, path, roles] of protectedRoutes) {
    assert.equal((await request(method, path)).status, 401, `${method} ${path}: anonymous`);
    for (const role of roles) assert.equal((await request(method, path, role)).status, 403, `${method} ${path}: ${role}`);
  }
});
test("students can read their own history by account ID or student ID; advisors can read it", async () => {
  for (const [id, role] of [[ids.student, "student"], ["2400000001", "student"], [ids.student, "advisor"]]) {
    const response = await request("GET", `/api/students/${id}/record`, role);
    assert.equal(response.status, 200);
    assert.equal((await response.json())[0].studentId, ids.student);
  }
  assert.equal((await request("GET", "/api/me/record", "student")).status, 200);
});
test("forged token role cannot grant administrator access", async () => {
  assert.equal((await request("GET", "/api/users", "student", { role: "admin" })).status, 403);
});
test("inactive and deleted accounts cannot reuse existing tokens", async () => {
  accounts[ids.student].active = false;
  assert.equal((await request("GET", "/api/me/record", "student")).status, 401);
  accounts[ids.student].active = true;
  assert.equal((await request("GET", "/api/me/record", "student", { id: "000000000000000000000099" })).status, 401);
});
test("invalid and expired tokens are rejected", async () => {
  for (const token of ["invalid", jwt.sign({ id: ids.student }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    assert.equal((await fetch(base + "/api/me/record", { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  }
});
