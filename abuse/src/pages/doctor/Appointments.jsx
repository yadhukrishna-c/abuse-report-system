import React, { useCallback, useEffect, useState } from "react";
import "./Appointments.css";

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

const formatDateTime = (value) =>
  new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getUserResponseState = (session) => {
  const response = String(session?.userResponse || "pending").toLowerCase();
  const hasMeetLink = Boolean(String(session?.meetLink || "").trim());

  if (!hasMeetLink) {
    return {
      tone: "awaiting-link",
      label: "Awaiting Meet Link",
      note: "Share the Google Meet link to collect the patient response.",
      actionLabel: "Send Meet Link",
      canResend: true,
    };
  }

  if (response === "yes") {
    return {
      tone: "confirmed",
      label: "Patient Confirmed",
      note: "The patient accepted the current Meet timing.",
      actionLabel: "Open Meet Link",
      canResend: false,
    };
  }

  if (response === "no") {
    return {
      tone: "reschedule",
      label: "Flexible Timing Requested",
      note: session?.flexibleTiming
        ? `Patient flexible timing: ${session.flexibleTiming}`
        : "The patient asked for a different timing.",
      actionLabel: "Resend Meet Link",
      canResend: true,
    };
  }

  return {
    tone: "pending",
    label: "Waiting for Patient Reply",
    note: "Meet link shared. Waiting for the patient to answer Yes or No.",
    actionLabel: "Open Meet Link",
    canResend: false,
  };
};

const Appointments = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftLinks, setDraftLinks] = useState({});
  const [submittingId, setSubmittingId] = useState("");

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

  const updateDraftLink = (sessionId, value) => {
    setDraftLinks((currentDrafts) => ({
      ...currentDrafts,
      [sessionId]: value,
    }));
  };

  const submitMeetLink = async (session) => {
    const sessionId = session._id;
    const meetLink = (draftLinks[sessionId] ?? session.meetLink ?? "").trim();

    if (!meetLink) {
      setError("Enter the Google Meet link before sending it to the patient.");
      return;
    }

    try {
      setSubmittingId(sessionId);
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/meet-link`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ meetLink }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save the Google Meet link.");
      }

      setDraftLinks((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[sessionId];
        return nextDrafts;
      });
      setError("");
      fetchSessions();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the Google Meet link.");
    } finally {
      setSubmittingId("");
    }
  };

  return (
    <div className="page-content doctor-sessions-page">
      <h2>My Sessions</h2>

      {loading ? (
        <p>Loading sessions...</p>
      ) : error ? (
        <p className="appointments-error">{error}</p>
      ) : sessions.length === 0 ? (
        <div className="appointments-empty-state">
          <p>No sessions assigned yet.</p>
        </div>
      ) : (
        <div className="doctor-session-list">
          {sessions.map((session) => {
            const hasMeetLink = Boolean(session.meetLink);
            const userResponseState = getUserResponseState(session);
            const linkInputValue = draftLinks[session._id] ?? session.meetLink ?? "";

            return (
              <div key={session._id} className="doctor-session-card">
                <div>
                  <h3>{session.userName}</h3>
                  <p>{session.userEmail}</p>
                  <p><strong>Assigned:</strong> {formatDateTime(session.createdAt)}</p>
                  <p><strong>Status:</strong> {session.status}</p>
                  {hasMeetLink ? (
                    <p>
                      <strong>Google Meet Link:</strong>{" "}
                      <a
                        className="doctor-session-inline-link"
                        href={session.meetLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {session.meetLink}
                      </a>
                    </p>
                  ) : (
                    <p className="doctor-session-pending">
                      Create the Google Meet link and send it to the patient from here.
                    </p>
                  )}
                  {session.recommendation && (
                    <p><strong>Recommendation:</strong> {session.recommendation}</p>
                  )}
                  <div className={`doctor-session-response ${userResponseState.tone}`}>
                    <strong>{userResponseState.label}</strong>
                    <span>{userResponseState.note}</span>
                  </div>
                </div>

                <div className="doctor-session-actions">
                  {hasMeetLink && !userResponseState.canResend ? (
                    <a
                      className="doctor-session-link"
                      href={session.meetLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {userResponseState.actionLabel}
                    </a>
                  ) : (
                    <div className="doctor-session-link-form">
                      <input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={linkInputValue}
                        onChange={(event) => updateDraftLink(session._id, event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => submitMeetLink(session)}
                        disabled={submittingId === session._id}
                      >
                        {submittingId === session._id
                          ? "Sending..."
                          : userResponseState.actionLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Appointments;
