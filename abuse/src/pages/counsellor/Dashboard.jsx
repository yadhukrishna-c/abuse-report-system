import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
const PROFILE_URL = `${API_BASE_URL}/counsellors/me`;
const SESSIONS_URL = `${API_BASE_URL}/sessions/my`;

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

const getStoredUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user && typeof user === "object" ? user : {};
  } catch {
    return {};
  }
};

const normalizeProfile = (payload, fallback = {}) => {
  const source =
    payload?.counsellor ||
    payload?.profile ||
    payload?.data?.counsellor ||
    payload?.data?.profile ||
    payload?.data ||
    payload ||
    {};

  return {
    ...fallback,
    ...(source && typeof source === "object" ? source : {}),
    name: source?.name || fallback?.name || fallback?.username || "",
    email: source?.email || fallback?.email || "",
    specialization: source?.specialization || fallback?.specialization || "",
    experience: source?.experience || fallback?.experience || "",
    location: source?.location || fallback?.location || "",
    availability: source?.availability || fallback?.availability || "Available",
    image: source?.image || source?.photo || fallback?.image || fallback?.photo || "",
    updatedAt: source?.updatedAt || fallback?.updatedAt || "",
    createdAt: source?.createdAt || fallback?.createdAt || "",
  };
};

const persistProfile = (profile) => {
  try {
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...getStoredUser(),
        ...profile,
      })
    );
  } catch {
    // Ignore storage failures.
  }
};

const parseResponse = async (response) => {
  const raw = await response.text();

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getRelativeDateLabel = (value) => {
  if (!value) {
    return "No recent updates";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No recent updates";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays <= 0) {
    return "Updated today";
  }

  if (diffDays === 1) {
    return "Updated yesterday";
  }

  return `Updated ${diffDays} days ago`;
};

const getInitials = (name) =>
  String(name || "Counsellor")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const getSeverityTone = (severity) => {
  const normalized = String(severity || "").trim().toLowerCase();

  if (normalized === "emergency") {
    return "critical";
  }

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "medium") {
    return "medium";
  }

  return "low";
};

const formatSeverity = (severity) => {
  const normalized = String(severity || "").trim().toLowerCase();

  if (!normalized) {
    return "Low";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const Dashboard = () => {
  const [profile, setProfile] = useState(() => normalizeProfile(getStoredUser()));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    const token = getAuthToken();
    const fallbackProfile = normalizeProfile(getStoredUser());

    if (!token) {
      setProfile(fallbackProfile);
      setSessions([]);
      setError("Please log in again to load your dashboard.");
      setLoading(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const [profileResult, sessionsResult] = await Promise.allSettled([
      fetch(PROFILE_URL, { headers }).then(async (response) => {
        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load counsellor profile.");
        }

        return data;
      }),
      fetch(SESSIONS_URL, { headers }).then(async (response) => {
        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load assigned sessions.");
        }

        return Array.isArray(data) ? data : [];
      }),
    ]);

    const nextErrors = [];

    if (profileResult.status === "fulfilled") {
      const nextProfile = normalizeProfile(profileResult.value, fallbackProfile);
      setProfile(nextProfile);
      persistProfile(nextProfile);
    } else {
      setProfile(fallbackProfile);
      if (profileResult.reason?.message) {
        nextErrors.push(profileResult.reason.message);
      }
    }

    if (sessionsResult.status === "fulfilled") {
      setSessions(sessionsResult.value);
    } else {
      setSessions([]);
      if (sessionsResult.reason?.message) {
        nextErrors.push(sessionsResult.reason.message);
      }
    }

    setError(nextErrors.join(" "));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData({ showLoading: true });
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const summary = useMemo(() => {
    const scheduledSessions = sessions.filter(
      (session) => String(session?.status || "").trim().toLowerCase() === "scheduled"
    ).length;

    const pendingMeetLinks = sessions.filter(
      (session) =>
        !String(session?.meetLink || "").trim() ||
        String(session?.status || "").trim().toLowerCase() === "awaiting meet link"
    ).length;

    const urgentSessions = sessions.filter((session) =>
      ["high", "emergency"].includes(String(session?.severity || "").trim().toLowerCase())
    ).length;

    const emergencySessions = sessions.filter(
      (session) => String(session?.severity || "").trim().toLowerCase() === "emergency"
    ).length;

    const uniquePatients = new Set(
      sessions.map((session) =>
        String(session?.userId || `${session?.userEmail || ""}-${session?.userName || ""}`)
      )
    ).size;

    return {
      totalSessions: sessions.length,
      scheduledSessions,
      pendingMeetLinks,
      urgentSessions,
      emergencySessions,
      uniquePatients,
    };
  }, [sessions]);

  const recentSessions = useMemo(() => sessions.slice(0, 4), [sessions]);

  const overviewMessage = useMemo(() => {
    if (!sessions.length) {
      return "No sessions are assigned yet. New patient sessions will appear here automatically.";
    }

    if (summary.pendingMeetLinks > 0) {
      return `${summary.pendingMeetLinks} session${summary.pendingMeetLinks === 1 ? "" : "s"} still need a Google Meet link.`;
    }

    if (summary.urgentSessions > 0) {
      return `${summary.urgentSessions} high-priority session${summary.urgentSessions === 1 ? "" : "s"} should stay on your radar.`;
    }

    return "All assigned sessions are up to date right now.";
  }, [sessions.length, summary.pendingMeetLinks, summary.urgentSessions]);

  const profileUpdatedLabel = getRelativeDateLabel(profile.updatedAt || profile.createdAt);
  const availabilityClass = String(profile.availability || "available").toLowerCase();

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className={`dashboard-badge availability-${availabilityClass}`}>
            {profile.availability || "Available"}
          </span>
          <h1>{`Welcome back, ${profile.name || "Counsellor"}`}</h1>
          <p className="subtitle">
            {profile.specialization
              ? `${profile.specialization} dashboard`
              : "Your counsellor dashboard"}
          </p>
          <p className="dashboard-overview">{overviewMessage}</p>

          <div className="dashboard-actions">
            <Link className="dashboard-link primary" to="/counsellor-dashboard/sessions">
              Open Sessions
            </Link>
            <Link className="dashboard-link secondary" to="/counsellor-dashboard/profile">
              Update Profile
            </Link>
          </div>
        </div>

        <div className="dashboard-profile-summary">
          <div className="dashboard-avatar">
            {profile.image ? (
              <img src={profile.image} alt={profile.name || "Counsellor"} />
            ) : (
              <span>{getInitials(profile.name)}</span>
            )}
          </div>

          <div className="dashboard-profile-copy">
            <h2>{profile.name || "Counsellor"}</h2>
            <p>{profile.email || "Email not available"}</p>
            <p>{profile.location || "Location not added"}</p>
            <small>{profileUpdatedLabel}</small>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-error">{error}</p> : null}

      <section className="dashboard-metrics">
        <article className="metric-card">
          <span>Assigned Sessions</span>
          <strong>{summary.totalSessions}</strong>
          <small>{summary.uniquePatients} unique patient{summary.uniquePatients === 1 ? "" : "s"}</small>
        </article>

        <article className="metric-card">
          <span>Scheduled Sessions</span>
          <strong>{summary.scheduledSessions}</strong>
          <small>Meet links already shared</small>
        </article>

        <article className="metric-card">
          <span>Awaiting Meet Links</span>
          <strong>{summary.pendingMeetLinks}</strong>
          <small>Sessions waiting on your action</small>
        </article>

        <article className={`metric-card ${summary.urgentSessions > 0 ? "attention" : ""}`}>
          <span>Priority Sessions</span>
          <strong>{summary.urgentSessions}</strong>
          <small>
            {summary.emergencySessions > 0
              ? `${summary.emergencySessions} emergency case${summary.emergencySessions === 1 ? "" : "s"}`
              : "High and emergency severity"}
          </small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Recent Assigned Sessions</h2>
              <p>Your most recently assigned patients and their current session state.</p>
            </div>
            <Link to="/counsellor-dashboard/sessions">View all</Link>
          </div>

          {loading ? (
            <div className="dashboard-empty-state">Loading dashboard details...</div>
          ) : recentSessions.length === 0 ? (
            <div className="dashboard-empty-state">
              No assigned sessions yet. This panel will update when admin assigns a session to you.
            </div>
          ) : (
            <div className="session-list">
              {recentSessions.map((session) => {
                const severityTone = getSeverityTone(session?.severity);
                const hasMeetLink = Boolean(String(session?.meetLink || "").trim());

                return (
                  <div className="session-list-item" key={session?._id || session?.userEmail}>
                    <div className="session-list-main">
                      <div className="session-list-top">
                        <h3>{session?.userName || "Patient"}</h3>
                        <span className={`severity-pill severity-${severityTone}`}>
                          {formatSeverity(session?.severity)}
                        </span>
                      </div>

                      <p>{session?.userEmail || "Email not available"}</p>
                      <p className="session-list-meta">
                        Assigned on {formatDateTime(session?.createdAt)}
                      </p>
                      {session?.recommendation ? (
                        <p className="session-recommendation">{session.recommendation}</p>
                      ) : null}
                    </div>

                    <div className="session-list-side">
                      <span className={`status-pill ${hasMeetLink ? "status-ready" : "status-pending"}`}>
                        {session?.status || (hasMeetLink ? "Scheduled" : "Awaiting Meet Link")}
                      </span>
                      <small>{hasMeetLink ? "Meet link shared" : "Meet link pending"}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="dashboard-panel profile-panel">
          <div className="panel-header">
            <div>
              <h2>Profile Snapshot</h2>
              <p>Your current counsellor details from the module profile.</p>
            </div>
            <Link to="/counsellor-dashboard/profile">Edit</Link>
          </div>

          <div className="profile-field-list">
            <div className="profile-field">
              <span>Specialization</span>
              <strong>{profile.specialization || "Not added yet"}</strong>
            </div>

            <div className="profile-field">
              <span>Experience</span>
              <strong>{profile.experience || "Not added yet"}</strong>
            </div>

            <div className="profile-field">
              <span>Location</span>
              <strong>{profile.location || "Not added yet"}</strong>
            </div>

            <div className="profile-field">
              <span>Availability</span>
              <strong>{profile.availability || "Available"}</strong>
            </div>

            <div className="profile-field">
              <span>Profile Created</span>
              <strong>{formatShortDate(profile.createdAt)}</strong>
            </div>

            <div className="profile-field">
              <span>Last Updated</span>
              <strong>{formatShortDate(profile.updatedAt || profile.createdAt)}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
