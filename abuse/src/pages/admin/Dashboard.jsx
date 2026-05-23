import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBell,
  FaExclamationTriangle,
  FaUserMd,
  FaUserShield,
  FaUsers,
  FaSignOutAlt,
} from "react-icons/fa";
import "./AdminDashboard.css";

import DashboardHome from "./DashboardHome";
import RegisteredUsers from "./users";
import SOSAlerts from "./sos";
import Doctors from "./doctors";
import Counsellors from "./counsellors";
import Notifications from "./Notifications";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const emptyDashboardStats = {
  registeredUsers: 0,
  activeCases: 0,
  sosAlerts: 0,
  unreadSosAlerts: 0,
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to load dashboard data.");
  }

  return data;
};

const isUnresolvedSosStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase() !== "resolved";

const parseJwtPayload = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getStoredUserId = () => {
  const storedUser = getStoredUser();
  if (storedUser) {
    if (typeof storedUser.id === "string") {
      return storedUser.id;
    }

    const resolvedId = storedUser.id?.$oid || storedUser._id || "";
    if (resolvedId) {
      return resolvedId;
    }
  }

  const tokenPayload = parseJwtPayload(localStorage.getItem("token") || "");
  return tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId || "";
};

const AdminDashboard = () => {
  const [activePage, setActivePage] = React.useState("dashboard");
  const [currentUser, setCurrentUser] = React.useState(null);
  const [adminNotifications, setAdminNotifications] = React.useState([]);
  const [dashboardStats, setDashboardStats] = React.useState(emptyDashboardStats);
  const navigate = useNavigate();

  React.useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const adminUserId = React.useMemo(() => getStoredUserId(), []);

  const fetchAdminNotifications = React.useCallback(async () => {
    if (!adminUserId) {
      setAdminNotifications([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${adminUserId}`);
      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "Unable to fetch notifications.");
      }

      setAdminNotifications(data);
    } catch (error) {
      setAdminNotifications([]);
    }
  }, [adminUserId]);

  React.useEffect(() => {
    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchAdminNotifications]);

  const fetchDashboardStats = React.useCallback(async () => {
    const [usersResult, casesResult, sosResult] = await Promise.allSettled([
      fetchJson(`${API_BASE_URL}/admin/users`),
      fetchJson(`${API_BASE_URL}/admin/cases`),
      fetchJson(`${API_BASE_URL}/sos`),
    ]);

    const users = usersResult.status === "fulfilled" && Array.isArray(usersResult.value)
      ? usersResult.value
      : [];
    const cases = casesResult.status === "fulfilled" && Array.isArray(casesResult.value)
      ? casesResult.value
      : [];
    const sosAlerts = sosResult.status === "fulfilled" && Array.isArray(sosResult.value)
      ? sosResult.value
      : [];

    setDashboardStats({
      registeredUsers: users.length,
      activeCases: cases.filter((caseItem) => String(caseItem?.status || "").trim().toLowerCase() !== "resolved").length,
      sosAlerts: sosAlerts.length,
      unreadSosAlerts: sosAlerts.filter((alert) => isUnresolvedSosStatus(alert?.status)).length,
    });
  }, []);

  React.useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  const displayName = currentUser?.name || currentUser?.username || "Admin User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  const fallbackAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>
      <rect width='100%' height='100%' fill='#0f766e'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='34' font-family='Segoe UI, Arial' fill='#ffffff' font-weight='700'>
        ${initials || "AU"}
      </text>
    </svg>`
  )}`;
  const profilePhoto =
    currentUser?.photo ||
    currentUser?.image ||
    currentUser?.profileImage ||
    currentUser?.avatar ||
    currentUser?.avatarUrl ||
    currentUser?.profilePic ||
    fallbackAvatar;

  const unreadSupportAlerts = adminNotifications.filter(
    (notification) =>
      notification.title === "Support Chat Recommendation" && notification.unread
  );
  const recentSupportAlerts = adminNotifications.filter(
    (notification) => notification.title === "Support Chat Recommendation"
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { key: "dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
    { key: "users", icon: <FaUsers />, label: "Registered Users" },
    { key: "sos", icon: <FaExclamationTriangle />, label: "SOS Alerts" },
    { key: "doctors", icon: <FaUserMd />, label: "Doctors" },
    { key: "counsellors", icon: <FaUserShield />, label: "Counsellors" },
    {
      key: "notifications",
      icon: <FaBell />,
      label: "Notifications",
      badge: unreadSupportAlerts.length,
    },
    { key: "logout", icon: <FaSignOutAlt />, label: "Logout", onClick: handleLogout },
  ];

  const renderPage = () => {
    switch (activePage) {
      case "users":
        return <RegisteredUsers />;
      case "sos":
        return <SOSAlerts />;
      case "doctors":
        return <Doctors />;
      case "counsellors":
        return <Counsellors />;
      case "notifications":
        return <Notifications />;
      default:
        return (
          <DashboardHome
            stats={dashboardStats}
            recentSupportAlerts={recentSupportAlerts}
            onOpenNotifications={() => setActivePage("notifications")}
          />
        );
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>SAFE CONNECT</h2>
          <p>Admin Console</p>
        </div>

        <div className="admin-user">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={displayName}
              className="admin-user-photo"
            />
          ) : (
            <div className="admin-user-fallback">
              {initials || "AU"}
            </div>
          )}
          <div className="admin-user-meta">
            <div className="admin-user-name">{displayName}</div>
            <div className="admin-user-role">{currentUser?.role || "Administrator"}</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={activePage === item.key}
              onClick={item.onClick || (() => setActivePage(item.key))}
            />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {renderPage()}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, badge, onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    className={`admin-nav-item ${active ? "active" : ""}`}
  >
    {icon}
    <span>{label}</span>
    {badge ? <span className="admin-nav-badge">{badge}</span> : null}
  </button>
);

export default AdminDashboard;