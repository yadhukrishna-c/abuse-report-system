const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: String,
    rating: Number,
    comment: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
