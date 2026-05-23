const express = require("express");
const router = express.Router();
const Counsellor = require("../models/Counsellor");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// ✅ IMPORT CORRECTLY (VERY IMPORTANT)
const { verifyToken } = require("../middleware/authMiddleware");

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const buildCounsellorResponse = (user, counsellor) => {
  const profile = counsellor || {};
  const account = user || {};
  const image = profile.image || account.photo || "";

  return {
    _id: profile._id || account._id,
    userId: profile.userId || account._id,
    name: profile.name || account.username || "",
    email: profile.email || account.email || "",
    specialization: profile.specialization || "",
    experience: profile.experience || "",
    location: profile.location || "",
    availability: profile.availability || "Available",
    image,
    photo: image,
    role: account.role || "counsellor",
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};


/* =====================================================
   GET Logged-in Counsellor Profile
   ===================================================== */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const counsellor = await Counsellor.findOne({ userId: req.user.id }).lean();

    res.json(buildCounsellorResponse(user, counsellor));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


/* =====================================================
   UPDATE Logged-in Counsellor Profile
   ===================================================== */
router.put("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingCounsellor = await Counsellor.findOne({ userId: req.user.id }).lean();
    const updates = {};

    if (hasOwn(req.body, "name") && typeof req.body.name === "string") {
      const name = req.body.name.trim();
      if (name) {
        updates.name = name;
        user.username = name;
      }
    }

    if (hasOwn(req.body, "specialization") && typeof req.body.specialization === "string") {
      updates.specialization = req.body.specialization.trim();
    }

    if (hasOwn(req.body, "experience") && typeof req.body.experience === "string") {
      updates.experience = req.body.experience.trim();
    }

    if (hasOwn(req.body, "location") && typeof req.body.location === "string") {
      updates.location = req.body.location.trim();
    }

    if (
      hasOwn(req.body, "availability") &&
      typeof req.body.availability === "string" &&
      ["Available", "Busy"].includes(req.body.availability)
    ) {
      updates.availability = req.body.availability;
    }

    if (hasOwn(req.body, "image") && typeof req.body.image === "string") {
      updates.image = req.body.image.trim();
      user.photo = updates.image;
    }

    await user.save();

    const nextProfile = {
      name: updates.name || existingCounsellor?.name || user.username || "Counsellor",
      specialization: hasOwn(updates, "specialization")
        ? updates.specialization
        : existingCounsellor?.specialization || "",
      experience: hasOwn(updates, "experience")
        ? updates.experience
        : existingCounsellor?.experience || "",
      location: hasOwn(updates, "location")
        ? updates.location
        : existingCounsellor?.location || "",
      availability: updates.availability || existingCounsellor?.availability || "Available",
      email: user.email,
      image: hasOwn(updates, "image")
        ? updates.image
        : existingCounsellor?.image || user.photo || "",
    };

    const updatedCounsellor = await Counsellor.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: nextProfile,
        $setOnInsert: { userId: req.user.id },
      },
      {
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    ).lean();

    res.json(
      buildCounsellorResponse(
        user.toObject({ depopulate: true }),
        updatedCounsellor
      )
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


/* =====================================================
   GET All Counsellors
   ===================================================== */
router.get("/", async (req, res) => {
  try {
    const counsellors = await Counsellor
      .find()
      .populate("userId", "-password");

    res.json(counsellors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


/* =====================================================
   REGISTER Counsellor
   ===================================================== */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      specialization,
      experience,
      location,
      availability,
      email,
      password,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: name,
      email,
      password: hashedPassword,
      role: "counsellor",
    });

    const counsellor = await Counsellor.create({
      userId: user._id,
      name,
      specialization,
      experience,
      location,
      availability,
      email,
      image: "",
    });

    res.status(201).json({
      message: "Counsellor registered successfully",
      counsellor: buildCounsellorResponse(
        user.toObject({ depopulate: true }),
        counsellor.toObject({ depopulate: true })
      ),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
