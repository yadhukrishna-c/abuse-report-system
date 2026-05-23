import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaCalendarAlt,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";
import "./counsellor.css";

const CounsellorLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="logo">SAFE CONNECT</h2>

        <div className="sidebar-profile-box">
          <img src="https://i.pravatar.cc/80" alt="profile" />
          <div>
            <h4>Dr. Smith</h4>
            <p>Counsellor</p>
          </div>
        </div>

        <nav>
          <Link to="dashboard"><FaHome /> Dashboard</Link>
          <Link to="sessions"><FaCalendarAlt /> Sessions</Link>
          <Link to="profile"><FaUser /> Profile</Link>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default CounsellorLayout;
