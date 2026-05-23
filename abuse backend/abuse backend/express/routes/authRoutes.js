const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);

// Only Admin can create doctor
router.post(
  "/create-doctor",
  verifyToken,
  isAdmin,
  authController.createDoctor
);

module.exports = router;