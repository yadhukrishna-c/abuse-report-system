import React, { useEffect, useState, useCallback } from "react";
import "./Notifications.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) {
    return token;
  }

  const user = getStoredUser();
  return user?.token || user?.accessToken || user?.jwt || "";
};

const getSessionIdFromNotification = (note) =>
  typeof note?.meta?.sessionId === "string" ? note.meta.sessionId : "";

const createResponseDraft = (session) => ({
  response:
    session?.userResponse === "yes" || session?.userResponse === "no"
      ? session.userResponse
      : "",
  flexibleTiming: session?.flexibleTiming || "",
});

const getResponseSummary = (session) => {
  const response = String(session?.userResponse || "pending").toLowerCase();

  if (response === "yes") {
    return {
      tone: "accepted",
      title: "You confirmed this session",
      description: "Your doctor or counsellor has been informed.",
    };
  }

  if (response === "no") {
    return {
      tone: "reschedule",
      title: "You asked for a flexible timing",
      description: session?.flexibleTiming
        ? `Flexible timing: ${session.flexibleTiming}`
        : "Your doctor or counsellor has been informed that this timing does not work.",
    };
  }

  return {
    tone: "pending",
    title: "Reply required",
    description: "Choose Yes if this timing works, or No and share your flexible timing.",
  };
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [sessionsById, setSessionsById] = useState({});
  const [responseDrafts, setResponseDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittingSessionId, setSubmittingSessionId] = useState("");

  // Get logged-in user from localStorage
  const user = getStoredUser();
  const userId = user?.id || (user?.id?.$oid ? user.id.$oid : null);
  const isAdmin = user?.role === "admin";

  // Fetch notifications safely
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setErrorMsg("User not logged in. Cannot fetch notifications.");
      setLoading(false);
      return;
    }

    try {
      const authToken = getAuthToken();
      const headers = authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {};

      const [notificationResponse, sessionsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/notifications/${userId}`),
        authToken
          ? fetch(`${API_BASE_URL}/sessions/my`, { headers })
          : Promise.resolve(null),
      ]);

      const data = await notificationResponse.json();

      if (!Array.isArray(data)) {
        console.error("Expected array but got:", data);
        setNotifications([]);
        setErrorMsg(data.error || "Unexpected response from server.");
        setLoading(false);
        return;
      }

      let nextSessionsById = {};
      if (sessionsResponse) {
        const sessionData = await sessionsResponse.json();
        if (sessionsResponse.ok && Array.isArray(sessionData)) {
          nextSessionsById = sessionData.reduce((accumulator, session) => {
            if (session?._id) {
              accumulator[session._id] = session;
            }
            return accumulator;
          }, {});
        }
      }

      // Sort newest first
      const sorted = data
        .map((note) => ({
          ...note,
          // Use current date if backend date is missing or invalid
          time: note.time ? new Date(note.time) : new Date(),
        }))
        .filter((note) => isAdmin || note.title !== "Support Chat Recommendation")
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      setNotifications(sorted);
      setSessionsById(nextSessionsById);
      setResponseDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };

        Object.keys(nextSessionsById).forEach((sessionId) => {
          const previousSession = sessionsById[sessionId];
          const nextSession = nextSessionsById[sessionId];
          const hasServerStateChanged =
            !previousSession ||
            previousSession.userResponse !== nextSession.userResponse ||
            previousSession.flexibleTiming !== nextSession.flexibleTiming ||
            previousSession.userRespondedAt !== nextSession.userRespondedAt ||
            previousSession.meetLink !== nextSession.meetLink;

          if (
            !Object.prototype.hasOwnProperty.call(nextDrafts, sessionId) ||
            hasServerStateChanged
          ) {
            nextDrafts[sessionId] = createResponseDraft(nextSessionsById[sessionId]);
          }
        });

        return nextDrafts;
      });
      setLoading(false);
      setErrorMsg("");
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setErrorMsg("Failed to fetch notifications. Please try again.");
      setLoading(false);
    }
  }, [isAdmin, sessionsById, userId]);

  useEffect(() => {
    fetchNotifications();

    // Optional: Polling every 5 seconds for new notifications
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark a notification as read
  const markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read/${id}`, {
        method: "PUT",
      });
      setNotifications((prev) =>
        prev.map((note) => (note._id === id ? { ...note, unread: false } : note))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const updateResponseDraft = (sessionId, field, value) => {
    setResponseDrafts((currentDrafts) => {
      const nextDraft = {
        ...(currentDrafts[sessionId] || createResponseDraft(sessionsById[sessionId])),
        [field]: value,
      };

      if (field === "response" && value === "yes") {
        nextDraft.flexibleTiming = "";
      }

      return {
        ...currentDrafts,
        [sessionId]: nextDraft,
      };
    });
  };

  const submitResponse = async (sessionId, notificationId) => {
    const authToken = getAuthToken();
    if (!authToken) {
      setErrorMsg("Please login again before replying to the session notification.");
      return;
    }

    const draft = responseDrafts[sessionId] || createResponseDraft(sessionsById[sessionId]);
    const response = String(draft.response || "").trim().toLowerCase();
    const flexibleTiming = String(draft.flexibleTiming || "").trim();

    if (!["yes", "no"].includes(response)) {
      setErrorMsg("Select Yes or No before sending your response.");
      return;
    }

    if (response === "no" && !flexibleTiming) {
      setErrorMsg("Enter your flexible timing when you select No.");
      return;
    }

    try {
      setSubmittingSessionId(sessionId);
      const apiResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}/response`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ response, flexibleTiming }),
      });

      const data = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(data?.message || "Unable to send your response.");
      }

      setSessionsById((currentSessions) => ({
        ...currentSessions,
        [data._id]: data,
      }));
      setResponseDrafts((currentDrafts) => ({
        ...currentDrafts,
        [data._id]: createResponseDraft(data),
      }));
      setErrorMsg("");

      if (notificationId) {
        markAsRead(notificationId);
      }
    } catch (err) {
      console.error("Error sending session response:", err);
      setErrorMsg(err.message || "Unable to send your response.");
    } finally {
      setSubmittingSessionId("");
    }
  };

  const latestMeetLinkNotificationIds = {};
  notifications.forEach((note) => {
    const sessionId = getSessionIdFromNotification(note);
    if (note.title === "Session Link Shared" && sessionId && !latestMeetLinkNotificationIds[sessionId]) {
      latestMeetLinkNotificationIds[sessionId] = note._id;
    }
  });

  return (
    <div className="notifications-container">
      <h2 className="notifications-title">Notifications</h2>

      {loading ? (
        <p>Loading notifications...</p>
      ) : (
        <>
          {errorMsg ? <p className="notifications-error">{errorMsg}</p> : null}

          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <div className="notifications-list">
              {notifications.map((note) => {
                const sessionId = getSessionIdFromNotification(note);
                const relatedSession = sessionId ? sessionsById[sessionId] : null;
                const isLatestMeetLinkNotification =
                  note.title === "Session Link Shared" &&
                  sessionId &&
                  latestMeetLinkNotificationIds[sessionId] === note._id;
                const canReply = Boolean(relatedSession && isLatestMeetLinkNotification);
                const responseDraft =
                  responseDrafts[sessionId] || createResponseDraft(relatedSession);
                const responseSummary = getResponseSummary(relatedSession);

                return (
                  <div
                    key={note._id}
                    className={`notification-card ${note.unread ? "unread" : ""}`}
                    onClick={() => note.unread && markAsRead(note._id)}
                  >
                    <div className="notification-header">
                      <span className={`badge ${String(note.type || "GENERAL").toLowerCase()}`}>
                        {note.type || "GENERAL"}
                      </span>
                      <span className="time">
                        {note.time.toLocaleString()}
                      </span>
                    </div>
                    <p className="message">{note.message}</p>

                    {canReply ? (
                      <div
                        className="notification-response-panel"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className={`notification-response-summary ${responseSummary.tone}`}>
                          <strong>{responseSummary.title}</strong>
                          <span>{responseSummary.description}</span>
                        </div>

                        <div className="notification-response-choices">
                          <button
                            type="button"
                            className={`response-choice ${
                              responseDraft.response === "yes" ? "active yes" : ""
                            }`}
                            onClick={() => updateResponseDraft(sessionId, "response", "yes")}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className={`response-choice ${
                              responseDraft.response === "no" ? "active no" : ""
                            }`}
                            onClick={() => updateResponseDraft(sessionId, "response", "no")}
                          >
                            No
                          </button>
                        </div>

                        {responseDraft.response === "no" ? (
                          <textarea
                            className="notification-flexible-timing"
                            rows="3"
                            placeholder="Type your flexible timing for the Meet session"
                            value={responseDraft.flexibleTiming}
                            onChange={(event) =>
                              updateResponseDraft(sessionId, "flexibleTiming", event.target.value)
                            }
                          />
                        ) : null}

                        <button
                          type="button"
                          className="notification-response-submit"
                          onClick={() => submitResponse(sessionId, note._id)}
                          disabled={submittingSessionId === sessionId}
                        >
                          {submittingSessionId === sessionId
                            ? "Sending..."
                            : relatedSession?.userResponse === "pending"
                              ? "Send Reply"
                              : "Update Reply"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;
