import React from "react";
import "./Notifications.css";

const Notifications = ({ data }) => {
  const list = Array.isArray(data) ? data : [];

  return (
    <div className="page-content">
      <h2>Notifications</h2>
      {list.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul className="notification-list">
          {list.map((n) => (
            <li key={n._id}>{n.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
