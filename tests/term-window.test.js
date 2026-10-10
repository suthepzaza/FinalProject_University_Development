const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Term = require("../models/Term");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const service = require("../services/registration");
test("finalized terms reject registration removal before changing seats", async t => {
  t.mock.method(mongoose.connection, "transaction", async callback => callback({}));
  t.mock.method(Registration, "findById", () => ({ session: async () => ({ term: "2026-1", status: "Enrolled" }) }));
  t.mock.method(Term, "findOneAndUpdate", async () => ({ finalized: true }));
  const seats = t.mock.method(Offering, "findOneAndUpdate", async () => { throw new Error("Unexpected seat update"); });
  await assert.rejects(service.drop("test"), /Term is finalized/);
  assert.equal(seats.mock.callCount(), 0);
});
test("finalisation saves the term lock", async t => {
  t.mock.method(mongoose.connection, "transaction", async callback => callback({}));
  const term = { finalized: false, save: async () => {} };
  t.mock.method(Term, "findOneAndUpdate", async () => term);
  const saved = t.mock.method(term, "save", async () => {});
  assert.equal((await service.finalize("2026-1")).finalized, true);
  assert.equal(saved.mock.callCount(), 1);
});
test("add/drop requires a future deadline and closes for finalized terms", async t => {
  let finalized = false;
  t.mock.method(Term, "findOne", async () => ({ finalized }));
  const open = { term: "2026-1", addDropOpen: true, addDropClosesAt: new Date(Date.now() + 86400000) };
  assert.equal((await service.addDropStatus(open)).addDropOpen, true);
  assert.equal((await service.addDropStatus({ ...open, addDropOpen: false })).addDropOpen, false);
  assert.equal((await service.addDropStatus({ ...open, addDropClosesAt: new Date(0) })).addDropOpen, false);
  assert.equal((await service.addDropStatus({ ...open, addDropClosesAt: null })).addDropOpen, false);
  finalized = true;
  assert.equal((await service.addDropStatus(open)).addDropOpen, false);
});
test("an open offering cannot save without a future closing date", async () => {
  const data = { courseId: new mongoose.Types.ObjectId(), code: "ITE220", title: "Web Development II", addDropOpen: true };
  await assert.rejects(new Offering(data).validate(), /future closing date/);
  await assert.rejects(new Offering({ ...data, addDropClosesAt: new Date(0) }).validate(), /future closing date/);
  await new Offering({ ...data, addDropClosesAt: new Date(Date.now() + 86400000) }).validate();
});
