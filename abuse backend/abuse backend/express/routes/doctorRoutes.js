// routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Notification = require("../models/Notification");

const JWT_SECRET = process.env.JWT_SECRET || "super_secure_random_secret_key_12345";

// ============================
// AUTH MIDDLEWARE
// ============================
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized, token missing" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized, invalid token" });
  }
};

// ============================
// ADMIN MIDDLEWARE
// ============================
const adminMiddleware = (req, res, next) => {
  if (req.role !== "admin") {
    return res.status(403).json({ message: "Forbidden, admin only" });
  }
  next();
};

// ============================
// GET ALL DOCTORS (admin)
// ============================
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find().populate("userId", "-password");
    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ============================
// REGISTER DOCTOR (admin)
// ============================
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, specialization, hospital, experience, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username: name,
      email,
      password: hashedPassword,
      role: "doctor",
    });

    // Create doctor profile
    const doctor = await Doctor.create({
      userId: user._id,
      name,
      specialization,
      hospital,
      experience,
      email,
    });

    res.status(201).json({ message: "Doctor registered successfully", doctor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ============================
// GET LOGGED-IN DOCTOR PROFILE
// ============================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.userId });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ============================
// GET LOGGED-IN DOCTOR NOTIFICATIONS
// ============================
router.get("/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(
      notifications.map((notification) => ({
        ...notification.toObject(),
        time: notification.createdAt,
        unread: !notification.isRead,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ============================
// MARK NOTIFICATION AS READ
// ============================
router.put("/notifications/read/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    if (notification.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Cannot update this notification" });

    notification.isRead = true;
    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification: {
        ...notification.toObject(),
        time: notification.createdAt,
        unread: false,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


module.exports = router;
