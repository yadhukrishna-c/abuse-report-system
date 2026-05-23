const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.get("/dashboard/summary", adminController.dashboardSummary);
router.get("/users", adminController.getUsers);
router.get("/cases", adminController.getCases);
router.get("/sos", adminController.getSOS);
router.get("/doctors", adminController.getDoctors);
router.get("/counsellors", adminController.getCounsellors);
router.get("/feedback", adminController.getFeedback);

module.exports = router;
