const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const { verifyToken } = require("../middleware/authMiddleware");

// GET Logged-in Doctor Profile
router.get("/", verifyToken, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.id).select("-password");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctor profile" });
  }
});

// UPDATE Logged-in Doctor Profile
router.put("/", verifyToken, async (req, res) => {
  try {
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true }
    ).select("-password");

    res.json(updatedDoctor);
  } catch (error) {
    res.status(500).json({ message: "Error updating doctor profile" });
  }
});

module.exports = router;