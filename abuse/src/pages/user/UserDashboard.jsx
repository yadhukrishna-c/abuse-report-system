import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaComments,
  FaCalendarAlt,
  FaBell,
  FaUserShield,
  FaHandsHelping,
  FaSignOutAlt,
  FaExclamationTriangle,
} from "react-icons/fa";

import "./UserDashboard.css";

import DashboardHome from "./DashboardHomeModern";
import SupportChat from "./SupportChat";
import MySessions from "./MySessions";
import Notifications from "./Notifications";
import Profile from "./Profile";
import Help from "./Help";

const APP_FAVICON = `${process.env.PUBLIC_URL || ""}/logo.png`;

const UserDashboard = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 🔐 Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      navigate("/login");
    }
  };

  // Load logged-in user on mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  // 🚨 SOS Alert Function
  const handleSOS = async () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.id) {
    alert("User not logged in!");
    return;
  }

  // Extract actual string ID from possible BSON object
  const userId = typeof user.id === "object" ? user.id.$oid : user.id;

  try {
    await fetch("http://localhost:5000/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: user.username,
        userId: userId, // <-- send string ObjectId
        message: "SOS Emergency Activated",
        location: "User Current Location (Demo)",
      }),
    });
    alert("🚨 SOS sent to admin successfully!");
  } catch (err) {
    console.error("Error sending SOS:", err);
    alert("Error sending SOS");
  }
};
  // 📄 Page Render Switch
  const renderPage = () => {
    switch (activePage) {
      case "chat":
        return <SupportChat />;
      case "sessions":
        return <MySessions />;
      case "notifications":
        return <Notifications userId={user?.id.$oid || user?.id} />;
      case "profile":
        return <Profile />;
      case "help":
        return <Help />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="dashboard-app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-frame">
            <img className="sidebar-brand-icon" src={APP_FAVICON} alt="Secure ON" />
          </div>
          <div className="sidebar-brand-copy">
            <h2 className="logo">Secure ON</h2>
            <p>Your safety space</p>
          </div>
        </div>

        <nav className="nav">
          <NavItem icon={<FaHome />} label="Dashboard" onClick={() => setActivePage("dashboard")} />
          <NavItem icon={<FaComments />} label="Support Chat" onClick={() => setActivePage("chat")} />
          <NavItem icon={<FaCalendarAlt />} label="My Sessions" onClick={() => setActivePage("sessions")} />
          <NavItem icon={<FaBell />} label="Notifications" onClick={() => setActivePage("notifications")} />
          <NavItem icon={<FaUserShield />} label="Profile & Privacy" onClick={() => setActivePage("profile")} />
          <NavItem icon={<FaHandsHelping />} label="Help & Safety" onClick={() => setActivePage("help")} />
          <NavItem icon={<FaSignOutAlt />} label="Logout" onClick={handleLogout} />
        </nav>

        {/* 🚨 SOS BUTTON */}
        <div className="sos-button" onClick={handleSOS}>
          <FaExclamationTriangle />
          <span>SOS Emergency</span>
        </div>
      </aside>

      <main className="main-content">{renderPage()}</main>
    </div>
  );
};

// 📌 Reusable Nav Item Component
const NavItem = ({ icon, label, onClick }) => (
  <div className="nav-item" onClick={onClick}>
    {icon}
    <span>{label}</span>
  </div>
);

export default UserDashboard;
