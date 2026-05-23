const Case = require("../models/Case");
const SOS = require("../models/SOS");
const Feedback = require("../models/Feedback");

// Case Status
exports.getUserCases = async (req, res) => {
  const cases = await Case.find({ userName: req.params.username });
  res.json(cases);
};

// SOS
exports.sendSOS = async (req, res) => {
  const { user, location } = req.body;
  await SOS.create({ user, location });
  res.json({ message: "SOS sent successfully" });
};

// Chat
exports.chatSupport = (req, res) => {
  res.json({
    reply: "Thank you for sharing. You're not alone 💙",
  });
};

// Notifications
exports.getNotifications = (req, res) => {
  res.json([
    "Case assigned to counsellor",
    "New support chat message",
  ]);
};

// Feedback
exports.submitFeedback = async (req, res) => {
  const { user, rating, comment } = req.body;
  await Feedback.create({ user, rating, comment });
  res.json({ message: "Feedback submitted" });
};
