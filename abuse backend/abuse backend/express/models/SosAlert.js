const mongoose = require("mongoose");

const SosAlertSchema = new mongoose.Schema({
  user: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // <-- add this
  message: { type: String, required: true },
  location: { type: String },
  status: { type: String, default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SosAlert", SosAlertSchema);