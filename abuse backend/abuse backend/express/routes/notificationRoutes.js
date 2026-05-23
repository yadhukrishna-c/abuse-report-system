const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/User");

// ✅ Get notifications for a specific user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("role");

    const notificationQuery = { userId };
    if (user?.role !== "admin") {
      notificationQuery.$or = [
        { audience: { $exists: false } },
        { audience: "all" },
      ];
    }

    const notifications = await Notification.find(notificationQuery)
      .sort({ createdAt: -1 });

    res.json(
      notifications.map((notification) => ({
        ...notification.toObject(),
        time: notification.createdAt,
        unread: !notification.isRead,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ✅ Mark a notification as read
router.put("/read/:id", async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Notification not found" });

    res.json({
      ...updated.toObject(),
      time: updated.createdAt,
      unread: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
