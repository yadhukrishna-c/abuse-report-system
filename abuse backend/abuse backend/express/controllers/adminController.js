const User = require("../models/User");
const Case = require("../models/Case");
const SOS = require("../models/SOS");
const Doctor = require("../models/Doctor");
const Counsellor = require("../models/Counsellor");
const Feedback = require("../models/Feedback");

// Dashboard Summary
exports.dashboardSummary = async (req, res) => {
  const totalCases = await Case.countDocuments();
  const resolvedCases = await Case.countDocuments({ status: "Resolved" });

  res.json({
    totalCases,
    pendingCases: totalCases - resolvedCases,
    resolvedCases,
  });
};

// Users
exports.getUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

// Cases
exports.getCases = async (req, res) => {
  const cases = await Case.find();
  res.json(cases);
};

// SOS
exports.getSOS = async (req, res) => {
  const alerts = await SOS.find().sort({ createdAt: -1 });
  res.json(alerts);
};

// Doctors
exports.getDoctors = async (req, res) => {
  const doctors = await Doctor.find();
  res.json(doctors);
};

// Counsellors
exports.getCounsellors = async (req, res) => {
  const counsellors = await Counsellor.find();
  res.json(counsellors);
};

// Feedback
exports.getFeedback = async (req, res) => {
  const feedback = await Feedback.find();
  res.json(feedback);
};
