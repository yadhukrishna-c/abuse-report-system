import React from "react";
import "./Sidebar.css";

const Sidebar = ({ activePage, setActivePage, onLogout, notifications }) => {
  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => n.unread).length
    : 0;

  return (
    <aside className="doctor-sidebar">
      <h2>Doctor Dashboard</h2>

      <ul className="doctor-sidebar-menu">
        <li
          className={activePage === "profile" ? "active" : ""}
          onClick={() => setActivePage("profile")}
        >
          Profile
        </li>
        <li
          className={activePage === "appointments" ? "active" : ""}
          onClick={() => setActivePage("appointments")}
        >
          Sessions
        </li>
        <li
          className={activePage === "notifications" ? "active" : ""}
          onClick={() => setActivePage("notifications")}
        >
          Notifications {unreadCount > 0 && <span className="doctor-badge">{unreadCount}</span>}
        </li>
        <li onClick={onLogout}>Logout</li>
      </ul>
    </aside>
  );
};

export default Sidebar;
