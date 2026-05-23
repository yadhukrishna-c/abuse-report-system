const express = require("express");
const mongoose = require("mongoose");

const Session = require("../models/Session");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

const getAssignedRoleLabel = (session) =>
  session.assignedRole === "doctor" ? "Doctor" : "Counsellor";

const SESSION_NOTIFICATION_MESSAGES = {
  userAwaitingLink: (session) =>
    [
      `Your support session has been assigned to ${getAssignedRoleLabel(session)}: ${session.assignedName}.`,
      `${getAssignedRoleLabel(session)} will create the Google Meet link and share it with you soon.`,
    ].join("\n"),
  practitionerAwaitingLink: (session) =>
    [
      `A new session has been assigned with patient: ${session.userName}.`,
      "Create the Google Meet link from your Sessions page and share it with the patient.",
    ].join("\n"),
  userMeetLinkShared: (session) =>
    [
      `${getAssignedRoleLabel(session)} ${session.assignedName} has shared your Google Meet link.`,
      `Google Meet Link: ${session.meetLink}`,
      "Please reply Yes if the timing works for you, or No and share your flexible timing.",
    ].join("\n"),
  practitionerUserConfirmed: (session) =>
    [
      `${session.userName} confirmed the session with your shared Google Meet link.`,
      `Google Meet Link: ${session.meetLink}`,
    ].join("\n"),
  practitionerFlexibleTimingRequested: (session) =>
    [
      `${session.userName} cannot join at the proposed time.`,
      `Flexible timing requested: ${session.flexibleTiming}`,
      `Google Meet Link: ${session.meetLink}`,
    ].join("\n"),
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

router.get("/options", verifyToken, isAdmin, async (req, res) => {
  try {
    const [users, doctors, counsellors] = await Promise.all([
      User.find({ role: "user" }).select("_id username email role").sort({ username: 1 }).lean(),
      User.find({ role: "doctor" }).select("_id username email role").sort({ username: 1 }).lean(),
      User.find({ role: "counsellor" }).select("_id username email role").sort({ username: 1 }).lean(),
    ]);

    res.json({ users, doctors, counsellors });
  } catch (error) {
    console.error("Session options error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { userId, doctorId, counsellorId, notificationId } = req.body;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid user is required." });
    }

    if ((doctorId && counsellorId) || (!doctorId && !counsellorId)) {
      return res.status(400).json({ message: "Select either a doctor or a counsellor." });
    }

    const assignedRole = doctorId ? "doctor" : "counsellor";
    const assignedUserId = doctorId || counsellorId;

    if (!isValidObjectId(assignedUserId)) {
      return res.status(400).json({ message: "Assigned participant is invalid." });
    }

    const [patient, assignedUser, sourceNotification] = await Promise.all([
      User.findById(userId).select("_id username email role").lean(),
      User.findById(assignedUserId).select("_id username email role").lean(),
      notificationId && isValidObjectId(notificationId)
        ? Notification.findById(notificationId)
        : Promise.resolve(null),
    ]);

    if (!patient || patient.role !== "user") {
      return res.status(404).json({ message: "Selected patient was not found." });
    }

    if (!assignedUser || assignedUser.role !== assignedRole) {
      return res.status(404).json({ message: `Selected ${assignedRole} was not found.` });
    }

    const session = await Session.create({
      userId: patient._id,
      userName: patient.username,
      userEmail: patient.email,
      assignedRole,
      assignedUserId: assignedUser._id,
      assignedName: assignedUser.username,
      assignedEmail: assignedUser.email,
      meetLink: "",
      userResponse: "pending",
      flexibleTiming: "",
      userRespondedAt: null,
      recommendation: sourceNotification?.meta?.recommendation || "",
      severity: sourceNotification?.meta?.severity || "low",
      status: "Awaiting Meet Link",
      createdBy: req.user.id,
      sourceNotificationId: sourceNotification?._id || null,
    });

    await Notification.insertMany([
      {
        userId: patient._id,
        title: "Session Assigned",
        type: "GENERAL",
        message: SESSION_NOTIFICATION_MESSAGES.userAwaitingLink(session),
        meta: {
          sessionId: session._id.toString(),
          assignedRole: session.assignedRole,
          status: session.status,
        },
      },
      {
        userId: assignedUser._id,
        title: "Session Assigned",
        type: "GENERAL",
        message: SESSION_NOTIFICATION_MESSAGES.practitionerAwaitingLink(session),
        meta: {
          sessionId: session._id.toString(),
          patientId: session.userId.toString(),
          status: session.status,
        },
      },
    ]);

    if (sourceNotification) {
      sourceNotification.isRead = true;
      sourceNotification.meta = {
        ...(sourceNotification.meta || {}),
        arrangedSessionId: session._id.toString(),
      };
      await sourceNotification.save();
    }

    res.status(201).json(session);
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/:sessionId/meet-link", verifyToken, async (req, res) => {
  try {
    if (!["doctor", "counsellor"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only the assigned doctor or counsellor can add the Meet link." });
    }

    const { sessionId } = req.params;
    const { meetLink } = req.body;

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session." });
    }

    if (!meetLink || typeof meetLink !== "string" || !meetLink.trim()) {
      return res.status(400).json({ message: "Google Meet link is required." });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (
      session.assignedUserId.toString() !== req.user.id ||
      session.assignedRole !== req.user.role
    ) {
      return res.status(403).json({ message: "You can only update your assigned sessions." });
    }

    session.meetLink = meetLink.trim();
    session.userResponse = "pending";
    session.flexibleTiming = "";
    session.userRespondedAt = null;
    session.status = "Scheduled";
    await session.save();

    await Notification.create({
      userId: session.userId,
      title: "Session Link Shared",
      type: "GENERAL",
      message: SESSION_NOTIFICATION_MESSAGES.userMeetLinkShared(session),
      meta: {
        sessionId: session._id.toString(),
        meetLink: session.meetLink,
        assignedRole: session.assignedRole,
        assignedName: session.assignedName,
        status: session.status,
        userResponse: session.userResponse,
      },
    });

    res.json(session);
  } catch (error) {
    console.error("Update session meet link error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/:sessionId/response", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only the assigned user can reply to the Meet notification." });
    }

    const { sessionId } = req.params;
    const normalizedResponse = String(req.body?.response || "").trim().toLowerCase();
    const flexibleTiming =
      typeof req.body?.flexibleTiming === "string" ? req.body.flexibleTiming.trim() : "";

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session." });
    }

    if (!["yes", "no"].includes(normalizedResponse)) {
      return res.status(400).json({ message: "Select Yes or No before sending your response." });
    }

    if (normalizedResponse === "no" && !flexibleTiming) {
      return res.status(400).json({ message: "Please share your flexible timing when selecting No." });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only respond to your own sessions." });
    }

    if (!String(session.meetLink || "").trim()) {
      return res.status(400).json({ message: "Wait until the Meet link is shared before replying." });
    }

    session.userResponse = normalizedResponse;
    session.flexibleTiming = normalizedResponse === "no" ? flexibleTiming : "";
    session.userRespondedAt = new Date();
    await session.save();

    const notificationTitle =
      normalizedResponse === "yes" ? "Session Confirmed" : "Flexible Timing Requested";
    const notificationMessage =
      normalizedResponse === "yes"
        ? SESSION_NOTIFICATION_MESSAGES.practitionerUserConfirmed(session)
        : SESSION_NOTIFICATION_MESSAGES.practitionerFlexibleTimingRequested(session);

    await Notification.create({
      userId: session.assignedUserId,
      title: notificationTitle,
      type: "GENERAL",
      message: notificationMessage,
      meta: {
        sessionId: session._id.toString(),
        patientId: session.userId.toString(),
        patientName: session.userName,
        response: session.userResponse,
        flexibleTiming: session.flexibleTiming,
        meetLink: session.meetLink,
      },
    });

    res.json(session);
  } catch (error) {
    console.error("Update session response error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/my", verifyToken, async (req, res) => {
  try {
    let query = null;

    if (req.user.role === "user") {
      query = { userId: req.user.id };
    } else if (req.user.role === "doctor" || req.user.role === "counsellor") {
      query = {
        assignedUserId: req.user.id,
        assignedRole: req.user.role,
      };
    } else {
      return res.json([]);
    }

    const sessions = await Session.find(query).sort({ createdAt: -1 }).lean();
    res.json(sessions);
  } catch (error) {
    console.error("Fetch sessions error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
