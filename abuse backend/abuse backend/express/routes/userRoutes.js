const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/case/:username", userController.getUserCases);
router.post("/sos", userController.sendSOS);
router.post("/chat", userController.chatSupport);
router.get("/notifications", userController.getNotifications);
router.post("/feedback", userController.submitFeedback);

module.exports = router;
