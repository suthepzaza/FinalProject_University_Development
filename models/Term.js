const mongoose = require("mongoose");
module.exports = mongoose.model("Term", new mongoose.Schema({
  code: { type: String, required: true, unique: true, match: require("./validation").term },
  finalized: { type: Boolean, default: false },
  revision: { type: Number, default: 0 }
}, { timestamps: true }));
