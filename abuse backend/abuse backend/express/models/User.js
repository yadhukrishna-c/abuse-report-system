const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["user", "admin", "doctor", "counsellor"],
      default: "user",
    },

    // 🔹 Profile Fields
    accountType: {
      type: String,
      default: "Confidential Reporting",
    },

    emergencyName: String,
    emergencyPhone: String,

    anonymousMode: {
      type: Boolean,
      default: true,
    },

    locationSharing: {
      type: Boolean,
      default: true,
    },

    encryption: {
      type: Boolean,
      default: true,
    },

    photo: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);