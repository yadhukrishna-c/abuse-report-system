import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./Notifications.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

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
  const user = getStoredUser();
  if (user) {
    if (typeof user.id === "string") {
      return user.id;
    }

    const resolvedId = user.id?.$oid || user._id || "";
    if (resolvedId) {
      return resolvedId;
    }
  }

  const tokenPayload = parseJwtPayload(localStorage.getItem("token") || "");
  return tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId || "";
};

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) {
    return token;
  }

  const user = getStoredUser();
  return user?.token || user?.accessToken || user?.jwt || "";
};

const emptyOptions = {
  users: [],
  doctors: [],
  counsellors: [],
};

const normalizeOptionUser = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const linkedUser =
    entry.userId && typeof entry.userId === "object" ? entry.userId : null;

  const id = entry._id || linkedUser?._id || entry.id || "";
  if (!id) {
    return null;
  }

  return {
    _id: id,
    username: entry.username || entry.name || linkedUser?.username || "",
    email: entry.email || linkedUser?.email || "",
    role: entry.role || linkedUser?.role || "",
  };
};

const buildOptionsFromUsers = (entries) => {
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map(normalizeOptionUser)
    .filter(Boolean);

  return {
    users: normalizedEntries.filter((entry) => entry.role === "user"),
    doctors: normalizedEntries.filter((entry) => entry.role === "doctor"),
    counsellors: normalizedEntries.filter((entry) => entry.role === "counsellor"),
  };
};

const hasAnyOptions = (nextOptions) =>
  Boolean(
    nextOptions.users.length ||
      nextOptions.doctors.length ||
      nextOptions.counsellors.length
  );

const createFormState = (notification) => ({
  userId: notification?.meta?.sourceUserId || "",
  doctorId: "",
  counsellorId: "",
});

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [forms, setForms] = useState({});
  const [submittingId, setSubmittingId] = useState("");

  const adminUserId = useMemo(() => getStoredUserId(), []);

  const fetchNotifications = useCallback(async () => {
    if (!adminUserId) {
      setError("Admin user not found.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${adminUserId}`);
      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "Unable to fetch notifications.");
      }

      setNotifications(data);
      setError("");
    } catch (fetchError) {
      setError(fetchError.message || "Unable to fetch notifications.");
    } finally {
      setLoading(false);
    }
  }, [adminUserId]);

  const fetchOptions = useCallback(async () => {
    try {
      const authToken = getAuthToken();
      let nextOptions = emptyOptions;

      if (authToken) {
        const response = await fetch(`${API_BASE_URL}/sessions/options`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const data = await response.json();
        if (response.ok) {
          nextOptions = {
            users: Array.isArray(data.users) ? data.users : [],
            doctors: Array.isArray(data.doctors) ? data.doctors : [],
            counsellors: Array.isArray(data.counsellors) ? data.counsellors : [],
          };
        } else if (![401, 403].includes(response.status)) {
          throw new Error(data?.message || "Unable to load session options.");
        }
      }

      if (!hasAnyOptions(nextOptions)) {
        const fallbackResponse = await fetch(`${API_BASE_URL}/admin/users`);
        const fallbackData = await fallbackResponse.json();

        if (!fallbackResponse.ok || !Array.isArray(fallbackData)) {
          throw new Error("Unable to load session options.");
        }

        nextOptions = buildOptionsFromUsers(fallbackData);
      }

      setOptions(nextOptions);
      setError("");
    } catch (fetchError) {
      setOptions(emptyOptions);
      setError(fetchError.message || "Unable to load session options.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchOptions();

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchOptions]);

  const toggleArrange = (notification) => {
    const notificationId = notification._id;

    if (expandedId === notificationId) {
      setExpandedId("");
      return;
    }

    setForms((currentForms) => ({
      ...currentForms,
      [notificationId]: currentForms[notificationId] || createFormState(notification),
    }));
    setExpandedId(notificationId);
  };

  const updateForm = (notificationId, field, value) => {
    setForms((currentForms) => {
      const nextForm = {
        ...(currentForms[notificationId] || createFormState()),
        [field]: value,
      };

      if (field === "doctorId" && value) {
        nextForm.counsellorId = "";
      }

      if (field === "counsellorId" && value) {
        nextForm.doctorId = "";
      }

      return {
        ...currentForms,
        [notificationId]: nextForm,
      };
    });
  };

  const submitArrangement = async (notification) => {
    const notificationId = notification._id;
    const form = forms[notificationId] || createFormState(notification);

    if (!form.userId) {
      setError("Select a user before arranging the session.");
      return;
    }

    if (!form.doctorId && !form.counsellorId) {
      setError("Select either a doctor or a counsellor.");
      return;
    }

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error("Admin login expired. Please login again.");
      }

      setSubmittingId(notificationId);
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notificationId,
          userId: form.userId,
          doctorId: form.doctorId || undefined,
          counsellorId: form.counsellorId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to arrange the session.");
      }

      setExpandedId("");
      setError("");
      fetchNotifications();
    } catch (submitError) {
      setError(submitError.message || "Unable to arrange the session.");
    } finally {
      setSubmittingId("");
    }
  };

  return (
    <div className="admin-notifications-container">
      <div className="admin-notifications-header">
        <h2>Notifications</h2>
        <p>Review serious support-chat recommendations and arrange follow-up sessions.</p>
      </div>

      {loading ? (
        <p>Loading notifications...</p>
      ) : error ? (
        <p className="admin-notifications-error">{error}</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <div className="admin-notifications-list">
          {notifications.map((notification) => {
            const isSupportAlert = notification.title === "Support Chat Recommendation";
            const isArranged = Boolean(notification.meta?.arrangedSessionId);
            const form = forms[notification._id] || createFormState(notification);

            return (
              <div key={notification._id} className="admin-notification-card">
                <div className="admin-notification-top">
                  <div>
                    <h3>{notification.title || "Notification"}</h3>
                    <span className="admin-notification-time">
                      {new Date(notification.time || notification.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <span className={`admin-notification-badge ${notification.type?.toLowerCase() || "general"}`}>
                    {notification.type || "GENERAL"}
                  </span>
                </div>

                <p className="admin-notification-message">{notification.message}</p>

                {isSupportAlert && (
                  <div className="admin-notification-actions">
                    {isArranged ? (
                      <span className="admin-notification-arranged">Session arranged</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-arrange-btn"
                        onClick={() => toggleArrange(notification)}
                        disabled={optionsLoading}
                      >
                        Arrange Session
                      </button>
                    )}
                  </div>
                )}

                {expandedId === notification._id && !isArranged && (
                  <div className="admin-session-form">
                    <label>
                      User
                      <select
                        value={form.userId}
                        onChange={(event) => updateForm(notification._id, "userId", event.target.value)}
                      >
                        <option value="">Select user</option>
                        {options.users.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.username} ({user.email})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Doctor
                      <select
                        value={form.doctorId}
                        onChange={(event) => updateForm(notification._id, "doctorId", event.target.value)}
                      >
                        <option value="">Select doctor</option>
                        {options.doctors.map((doctor) => (
                          <option key={doctor._id} value={doctor._id}>
                            {doctor.username} ({doctor.email})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Counsellor
                      <select
                        value={form.counsellorId}
                        onChange={(event) => updateForm(notification._id, "counsellorId", event.target.value)}
                      >
                        <option value="">Select counsellor</option>
                        {options.counsellors.map((counsellor) => (
                          <option key={counsellor._id} value={counsellor._id}>
                            {counsellor.username} ({counsellor.email})
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="admin-session-form-note">
                      The assigned doctor or counsellor will create the Google Meet link later and share it with the user from their session page.
                    </p>

                    <div className="admin-session-form-actions">
                      <button
                        type="button"
                        className="admin-save-session-btn"
                        onClick={() => submitArrangement(notification)}
                        disabled={submittingId === notification._id}
                      >
                        {submittingId === notification._id ? "Saving..." : "Save Session"}
                      </button>
                      <button
                        type="button"
                        className="admin-cancel-session-btn"
                        onClick={() => setExpandedId("")}
                      >
                        Cancel
                      </button>
                    </div>
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

export default AdminNotifications;
