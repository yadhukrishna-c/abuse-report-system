const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    user: String,
    location: String,
    status: { type: String, default: "NEW" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SOS", sosSchema);
