const Counsellor = require("../models/Counsellor");

// GET Profile
exports.getCounsellorProfile = async (req, res) => {
  try {
    const counsellor = await Counsellor
      .findById(req.user.id)
      .select("-password");

    if (!counsellor) {
      return res.status(404).json({ message: "Counsellor not found" });
    }

    res.json(counsellor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE Profile
exports.updateCounsellorProfile = async (req, res) => {
  try {
    const updatedCounsellor = await Counsellor.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true }
    ).select("-password");

    res.json(updatedCounsellor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};