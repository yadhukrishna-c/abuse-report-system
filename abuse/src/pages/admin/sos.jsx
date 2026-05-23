import React, { useEffect, useState } from "react";
import "./SOSAlerts.css";

const SOSAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔄 Fetch SOS Alerts from Backend
  const fetchAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/sos");
      const data = await response.json();

      // Convert MongoDB date objects if needed
      const formatted = data.map((alert) => ({
        ...alert,
        _id: alert._id.$oid || alert._id, // handle possible BSON ObjectId structure
        createdAt: alert.createdAt?.$date
          ? new Date(alert.createdAt.$date)
          : new Date(alert.createdAt),
      }));

      setAlerts(formatted);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // ✅ Mark as Resolved & trigger user notification
  const handleResolve = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/sos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to resolve alert");
      }

      // Refresh list after resolving
      fetchAlerts();
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  return (
    <div className="sos-container">
      <div className="sos-header">
        <h2>🚨 SOS Emergency Alerts</h2>
        <p>Live emergency alerts from users</p>
      </div>

      {loading ? (
        <p>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p>No SOS alerts received.</p>
      ) : (
        <div className="sos-grid">
          {alerts.map((alert) => (
            <div key={alert._id} className="sos-card">
              <div className="sos-card-header">
                <h3>{alert.user}</h3>
                <span
                  className={`status-badge ${
                    alert.status === "Resolved" ? "resolved" : "active"
                  }`}
                >
                  {alert.status}
                </span>
              </div>

              <div className="sos-details">
                <p>
                  <strong>Message:</strong> {alert.message}
                </p>
                <p>
                  <strong>Location:</strong> {alert.location}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>

              {alert.status !== "Resolved" && (
                <button
                  className="view-btn"
                  onClick={() => handleResolve(alert._id)}
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SOSAlerts;