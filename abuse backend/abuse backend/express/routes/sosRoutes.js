const express = require("express");
const router = express.Router();
const SosAlert = require("../models/SosAlert");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// Create SOS Alert
router.post("/", async (req, res) => {
  try {
    const { user, userId, message, location } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Valid userId is required" });
    }

    const newAlert = new SosAlert({
      user,
      userId,
      message,
      location,
    });

    await newAlert.save();
    res.status(201).json(newAlert);
  } catch (error) {
    console.error("Error creating SOS alert:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Get All SOS Alerts (Admin)
router.get("/", async (req, res) => {
  try {
    const alerts = await SosAlert.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    console.error("Error fetching SOS alerts:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Mark as Resolved
router.put("/:id", async (req, res) => {
  try {
    const alert = await SosAlert.findById(req.params.id);

    if (!alert) return res.status(404).json({ error: "Alert not found" });

    alert.status = "Resolved";
    await alert.save();

    // ✅ Notify user if userId exists
    if (alert.userId && mongoose.Types.ObjectId.isValid(alert.userId)) {
      const notification = new Notification({
        userId: alert.userId,
        type: "SOS", // must match enum
        message: `
🚨 SOS Alert Resolved

Hello ${alert.user},

Your SOS alert has been successfully resolved by the admin team.

📍 Location: ${alert.location}
🕒 Time: ${new Date().toLocaleString()}

📞 Important Contacts:
- Police Helpline: 100
- Women Helpline: 1091
- Abusive Call/Complaint Reporting: 98765XXXXX
- Emergency Support Team (Local): 112

Please stay safe and reach out to the above numbers if needed.
        `,
        time: new Date(),
        unread: true,
      });

      await notification.save();
    }

    res.json(alert);
  } catch (err) {
    console.error("Error resolving alert:", err);
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

module.exports = router;