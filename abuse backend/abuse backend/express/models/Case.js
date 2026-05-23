const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    userName: String,
    type: String,
    risk: String,
    assignedTo: String,
    status: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);
