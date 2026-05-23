const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  specialization: String,
  hospital: String,
  experience: String,
  email: { type: String, required: true },
});

module.exports = mongoose.model("Doctor", doctorSchema);