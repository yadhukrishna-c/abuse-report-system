import React from "react";
import "./UserDashboard.css";

const DashboardHome = () => {
  return (
    <div className="dashboard-home">
      <h1>Welcome Back 👋</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Cases</h3>
          <p>3</p>
        </div>

        <div className="stat-card">
          <h3>Upcoming Sessions</h3>
          <p>2</p>
        </div>

        <div className="stat-card">
          <h3>Unread Messages</h3>
          <p>5</p>
        </div>

        <div className="stat-card">
          <h3>Safety Alerts</h3>
          <p>1</p>
        </div>
      </div>

      <div className="info-box">
        <h3>Latest Update</h3>
        <p>Your next counseling session is scheduled for tomorrow at 4:00 PM.</p>
      </div>
    </div>
  );
};

export default DashboardHome;