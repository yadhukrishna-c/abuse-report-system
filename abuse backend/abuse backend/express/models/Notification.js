const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: String,
    message: String,
    type: {
      type: String,
      enum: ["SOS", "REPORT", "GENERAL"],
      default: "GENERAL",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    audience: {
      type: String,
      enum: ["all", "admin"],
      default: "all",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
