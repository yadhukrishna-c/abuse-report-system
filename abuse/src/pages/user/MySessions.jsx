import React, { useCallback, useEffect, useState } from "react";
import "./MySessions.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) {
    return token;
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.token || user?.accessToken || user?.jwt || "";
  } catch {
    return "";
  }
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getResponseState = (session) => {
  const response = String(session?.userResponse || "pending").toLowerCase();

  if (response === "yes") {
    return {
      statusClass: "confirmed",
      statusLabel: "Confirmed",
      noteClass: "confirmed",
      note: "You confirmed that this Meet timing works for you.",
    };
  }

  if (response === "no") {
    return {
      statusClass: "attention",
      statusLabel: "Flexible Timing Requested",
      noteClass: "attention",
      note: session?.flexibleTiming
        ? `You asked for flexible timing: ${session.flexibleTiming}`
        : "You asked your doctor or counsellor for a flexible timing.",
    };
  }

  return {
    statusClass: "pending",
    statusLabel: "Awaiting Your Reply",
    noteClass: "pending",
    note: "Reply to the Meet link notification with Yes or No so your doctor or counsellor can proceed.",
  };
};

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/my`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load sessions.");
      }

      setSessions(Array.isArray(data) ? data : []);
      setError("");
    } catch (fetchError) {
      setError(fetchError.message || "Unable to load sessions.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return (
    <div className="sessions-container">
      <h2 className="sessions-title">My Sessions</h2>

      {loading ? (
        <p>Loading sessions...</p>
      ) : error ? (
        <p className="session-note error">{error}</p>
      ) : sessions.length === 0 ? (
        <div className="session-empty-state">
          <p>No sessions arranged yet.</p>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => {
            const hasMeetLink = Boolean(session.meetLink);
            const responseState = getResponseState(session);
            const statusClass = hasMeetLink ? responseState.statusClass : "pending";
            const statusLabel = hasMeetLink ? responseState.statusLabel : session.status;

            return (
              <div key={session._id} className="session-card">
                <div className="session-header">
                  <div>
                    <h3>{session.assignedName}</h3>
                    <p className="session-participant">
                      Assigned {session.assignedRole === "doctor" ? "Doctor" : "Counsellor"}
                    </p>
                  </div>
                  <span className={`status ${statusClass}`}>{statusLabel}</span>
                </div>

                <div className="session-details">
                  <p><strong>Date:</strong> {formatDate(session.createdAt)}</p>
                  <p><strong>Time:</strong> {formatTime(session.createdAt)}</p>
                  <p><strong>Mode:</strong> Google Meet</p>
                  {hasMeetLink ? (
                    <p>
                      <strong>Google Meet Link:</strong>{" "}
                      <a
                        className="session-inline-link"
                        href={session.meetLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {session.meetLink}
                      </a>
                     </p>
                   ) : (
                     <p className="session-waiting-note">
                       Your assigned {session.assignedRole === "doctor" ? "doctor" : "counsellor"} will share the Google Meet link here soon.
                     </p>
                   )}
                   {hasMeetLink && (
                     <div className={`session-response-banner ${responseState.noteClass}`}>
                       {responseState.note}
                     </div>
                   )}
                   {session.recommendation && (
                     <p><strong>Recommendation:</strong> {session.recommendation}</p>
                   )}
                 </div>

                {hasMeetLink ? (
                  <a
                    className="join-btn"
                    href={session.meetLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join Session
                  </a>
                ) : (
                  <div className="session-waiting-banner">
                    Waiting for the Google Meet link from your assigned {session.assignedRole}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MySessions;
