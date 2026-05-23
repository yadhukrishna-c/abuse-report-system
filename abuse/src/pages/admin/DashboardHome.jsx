import React from "react";

const formatSeverity = (notification) =>
  notification?.meta?.severity || "general";

const DashboardHome = ({
  stats,
  recentSupportAlerts = [],
  onOpenNotifications,
}) => {
  const {
    registeredUsers = 0,
    sosAlerts = 0,
    unreadSosAlerts = 0,
  } = stats || {};

  return (
    <div className="admin-home">
      <h1>Admin Dashboard</h1>

      <div className="admin-stat-grid">
        <StatCard title="Registered Users" value={registeredUsers} />
        <StatCard title="SOS Alerts" value={sosAlerts} />
        <StatCard title="Unread SOS Alerts" value={unreadSosAlerts} />
      </div>

      <div className="admin-alert-panel">
        <div className="admin-alert-panel-top">
          <div>
            <h2>Recent Support Chat Alerts</h2>
            <p>High-risk chats appear here and in the Notifications tab.</p>
          </div>
          <button type="button" className="view-btn" onClick={onOpenNotifications}>
            Open Notifications
          </button>
        </div>

        {recentSupportAlerts.length === 0 ? (
          <p className="admin-alert-empty">No support chat alerts yet.</p>
        ) : (
          <div className="admin-alert-list">
            {recentSupportAlerts.slice(0, 5).map((notification) => (
              <div key={notification._id} className="admin-alert-card">
                <div className="admin-alert-card-top">
                  <strong>{notification.meta?.sourceUsername || "User"}</strong>
                  <span
                    className={`admin-alert-severity ${formatSeverity(notification).toLowerCase()}`}
                  >
                    {formatSeverity(notification)}
                  </span>
                </div>
                <p>{notification.message}</p>
                <span className="admin-alert-time">
                  {new Date(notification.time || notification.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="admin-stat-card">
    <p className="admin-stat-title">{title}</p>
    <h2 className="admin-stat-value">{value}</h2>
  </div>
);

export default DashboardHome;
