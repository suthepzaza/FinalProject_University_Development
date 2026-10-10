const Term = require("../models/Term");
const service = require("../services/registration");
exports.status = async (req, res) => {
  if (!require("../models/validation").term.test(req.params.code)) return res.status(400).json({ error: "Invalid term" });
  try { res.json(await Term.findOne({ code: req.params.code }) || { code: req.params.code, finalized: false }); }
  catch (error) { res.status(500).json({ error: "Failed to load term status" }); }
};
exports.finalize = async (req, res) => {
  try { res.json(await service.finalize(req.params.code)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
