const mongoose = require("mongoose");

const counsellorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  name: { type: String, required: true },
  specialization: { type: String },
  experience: { type: String },
  location: { type: String },
  availability: {
    type: String,
    enum: ["Available", "Busy"],
    default: "Available"
  },

  email: { type: String, required: true },

  // 🔥 ADD THIS FIELD
  image: {
    type: String,
    default: ""
  }

}, { timestamps: true });

module.exports = mongoose.model("Counsellor", counsellorSchema);