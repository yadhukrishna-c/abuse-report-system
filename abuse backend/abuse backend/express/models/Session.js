const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    assignedRole: {
      type: String,
      enum: ["doctor", "counsellor"],
      required: true,
    },
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedName: {
      type: String,
      required: true,
    },
    assignedEmail: {
      type: String,
      required: true,
    },
    meetLink: {
      type: String,
      default: "",
    },
    userResponse: {
      type: String,
      enum: ["pending", "yes", "no"],
      default: "pending",
    },
    flexibleTiming: {
      type: String,
      default: "",
    },
    userRespondedAt: {
      type: Date,
      default: null,
    },
    recommendation: {
      type: String,
      default: "",
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "low",
    },
    status: {
      type: String,
      enum: ["Awaiting Meet Link", "Scheduled"],
      default: "Awaiting Meet Link",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sourceNotificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
