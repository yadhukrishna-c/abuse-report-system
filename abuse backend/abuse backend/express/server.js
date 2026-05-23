const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("dotenv").config();

console.log("JWT_SECRET:", process.env.JWT_SECRET);
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const sosRoutes = require("./routes/sosRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const counsellorRoutes = require("./routes/counsellorRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiChatRoutes = require("./routes/aiChat.Routes");
const sessionRoutes = require("./routes/sessionRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/counsellors", counsellorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai-chat", aiChatRoutes);
app.use("/api/sessions", sessionRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 SafeConnect API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { 
  console.log(`🔥 Server running on port ${PORT}`);
});
