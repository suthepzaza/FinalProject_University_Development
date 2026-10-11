const { test } = require("node:test");
const assert = require("node:assert/strict");
const { evaluate, passedGrades } = require("../services/registration");
const offering = { code: "CSC220", section: "1", day: "Monday", startTime: "09:00", endTime: "12:00", seats: 30, enrolled: 0 };
test("all passing grades exclude a course with an explanation", () => {
  for (const grade of passedGrades) assert.match(evaluate(offering, [{ code: "CSC220", grade }], []).reason, /Already passed/);
});
test("F requires a retake, W allows registration, and a later pass removes retake eligibility", () => {
  assert.equal(evaluate(offering, [{ code: "CSC220", grade: "F" }], []).isRetake, true);
  assert.equal(evaluate(offering, [{ code: "CSC220", grade: "W" }], []).isEligible, true);
  assert.match(evaluate(offering, [{ code: "CSC220", grade: "F" }, { code: "CSC220", grade: "B" }], []).reason, /Already passed/);
});
test("zero-capacity and full sections cannot be selected", () => {
  assert.match(evaluate({ ...offering, seats: 0 }, [], []).reason, /Full/);
  assert.match(evaluate({ ...offering, enrolled: 30 }, [], []).reason, /Full/);
});
test("time clashes name the conflicting section; adjacent classes and different days are allowed", () => {
  const registration = { offeringId: { ...offering, code: "CSC205", section: "2", startTime: "11:00", endTime: "14:00" } };
  assert.match(evaluate(offering, [], [registration]).reason, /CSC205 Section 2/);
  assert.equal(evaluate({ ...offering, day: "Tuesday" }, [], [registration]).isEligible, true);
  assert.equal(evaluate({ ...offering, endTime: "11:00" }, [], [registration]).isEligible, true);
});
