import React, { useEffect, useState } from "react";
import "./UserDashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getStoredUserId = () => {
  const storedUser = getStoredUser();
  if (storedUser) {
    if (typeof storedUser.id === "string") {
      return storedUser.id;
    }

    return storedUser.id?.$oid || storedUser._id || "";
  }

  return "";
};

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) {
    return token;
  }

  const storedUser = getStoredUser();
  return storedUser?.token || storedUser?.accessToken || storedUser?.jwt || "";
};

const loadJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to load dashboard data.");
  }

  return data;
};

const toDate = (value) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const isUnreadNotification = (notification) =>
  Boolean(notification?.unread ?? !notification?.isRead);

const getProfileChecks = (profile) => [
  {
    label: "Anonymous mode",
    value: Boolean(profile?.anonymousMode),
  },
  {
    label: "Location sharing",
    value: Boolean(profile?.locationSharing),
  },
  {
    label: "Encryption enabled",
    value: Boolean(profile?.encryption),
  },
  {
    label: "Emergency contact",
    value: Boolean(profile?.emergencyName && profile?.emergencyPhone),
  },
];

const buildActivitySeries = (notifications, sessions) => {
  const allItems = [
    ...notifications.map((notification) => notification.time || notification.createdAt),
    ...sessions.map((session) => session.createdAt),
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - (6 - index));

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const count = allItems.reduce((total, item) => {
      const date = toDate(item);
      if (!date) {
        return total;
      }

      return date >= dayStart && date < dayEnd ? total + 1 : total;
    }, 0);

    return {
      label: dayStart.toLocaleDateString([], { weekday: "short" }),
      count,
    };
  });
};

const buildSeverityRows = (sessions) => {
  const labels = [
    { key: "low", label: "Low", accent: "low" },
    { key: "medium", label: "Medium", accent: "medium" },
    { key: "high", label: "High", accent: "high" },
    { key: "emergency", label: "Emergency", accent: "emergency" },
  ];

  const total = sessions.length || 1;

  return labels.map((item) => {
    const count = sessions.filter(
      (session) => String(session?.severity || "low").toLowerCase() === item.key
    ).length;

    return {
      ...item,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
};

const buildRecentUpdates = (notifications, sessions) => {
  const notificationItems = notifications.map((notification) => ({
    id: `notification-${notification._id}`,
    title: notification.title || notification.type || "Notification",
    note:
      String(notification.message || "")
        .split("\n")
        .find((line) => line.trim()) || "You have a new notification.",
    time: notification.time || notification.createdAt,
    tone: String(notification.type || "").toUpperCase() === "SOS" ? "alert" : "info",
  }));

  const sessionItems = sessions.map((session) => ({
    id: `session-${session._id}`,
    title: `${session.assignedRole === "doctor" ? "Doctor" : "Counsellor"} Session`,
    note: session.meetLink
      ? `Meet link is ready with ${session.assignedName}.`
      : `Waiting for ${session.assignedName} to share the Meet link.`,
    time: session.createdAt,
    tone: session.meetLink ? "success" : "pending",
  }));

  return [...notificationItems, ...sessionItems]
    .sort((left, right) => {
      const leftDate = toDate(left.time)?.getTime() || 0;
      const rightDate = toDate(right.time)?.getTime() || 0;
      return rightDate - leftDate;
    })
    .slice(0, 5);
};

const MetricCard = ({ label, value, note, tone }) => (
  <article className={`user-metric-card ${tone}`}>
    <span className="user-metric-label">{label}</span>
    <strong className="user-metric-value">{value}</strong>
    <p className="user-metric-note">{note}</p>
  </article>
);

const LegendRow = ({ label, value, accent }) => (
  <div className="user-legend-row">
    <div className="user-legend-label">
      <span className={`user-legend-dot ${accent}`} />
      <span>{label}</span>
    </div>
    <strong>{value}</strong>
  </div>
);

const DashboardHomeModern = () => {
  const [dashboardState, setDashboardState] = useState({
    loading: true,
    error: "",
    profile: getStoredUser(),
    notifications: [],
    sessions: [],
  });

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      const userId = getStoredUserId();
      const authToken = getAuthToken();

      const requests = await Promise.allSettled([
        userId
          ? loadJson(`${API_BASE_URL}/notifications/${userId}`)
          : Promise.resolve([]),
        authToken
          ? loadJson(`${API_BASE_URL}/sessions/my`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            })
          : Promise.resolve([]),
        authToken
          ? loadJson(`${API_BASE_URL}/profile`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            })
          : Promise.resolve(getStoredUser()),
      ]);

      if (!isMounted) {
        return;
      }

      const notifications =
        requests[0].status === "fulfilled" && Array.isArray(requests[0].value)
          ? requests[0].value
          : [];
      const sessions =
        requests[1].status === "fulfilled" && Array.isArray(requests[1].value)
          ? requests[1].value
          : [];
      const profile =
        requests[2].status === "fulfilled" && requests[2].value
          ? requests[2].value
          : getStoredUser();

      const hadFailure = requests.some((request) => request.status === "rejected");

      setDashboardState({
        loading: false,
        error: hadFailure
          ? "Some dashboard data could not be refreshed right now."
          : "",
        profile,
        notifications,
        sessions,
      });
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const { loading, error, profile, notifications, sessions } = dashboardState;

  const displayName = profile?.username || profile?.name || "User";
  const profileChecks = getProfileChecks(profile);
  const completedChecks = profileChecks.filter((item) => item.value).length;
  const readinessScore = Math.round((completedChecks / profileChecks.length) * 100);

  const unreadNotifications = notifications.filter(isUnreadNotification).length;
  const sosUpdates = notifications.filter(
    (notification) => String(notification?.type || "").toUpperCase() === "SOS"
  ).length;
  const scheduledSessions = sessions.filter((session) => Boolean(session?.meetLink)).length;
  const awaitingSessions = sessions.filter((session) => !session?.meetLink).length;
  const severityRows = buildSeverityRows(sessions);
  const recentUpdates = buildRecentUpdates(notifications, sessions);
  const activitySeries = buildActivitySeries(notifications, sessions);
  const activityPeak = Math.max(...activitySeries.map((item) => item.count), 1);
  const readNotifications = Math.max(notifications.length - unreadNotifications, 0);
  const unreadPercentage = notifications.length
    ? Math.round((unreadNotifications / notifications.length) * 100)
    : 0;

  const heroSummary = awaitingSessions
    ? `${awaitingSessions} session link${awaitingSessions > 1 ? "s are" : " is"} still waiting to be shared.`
    : scheduledSessions
      ? `${scheduledSessions} support session${scheduledSessions > 1 ? "s are" : " is"} ready for you.`
      : unreadNotifications
        ? `You have ${unreadNotifications} unread notification${unreadNotifications > 1 ? "s" : ""} to review.`
        : "Your support space looks calm right now. Keep your safety profile updated.";

  return (
    <div className="dashboard-home dashboard-home-modern">
      <section className="user-hero-panel">
        <div className="user-hero-copy">
          <span className="user-eyebrow">Personal Safety Overview</span>
          <h1>Hello, {displayName}</h1>
          <p>{heroSummary}</p>

          <div className="user-hero-tags">
            <span>{sessions.length} total sessions</span>
            <span>{notifications.length} notifications tracked</span>
            <span>{completedChecks}/4 safety settings active</span>
          </div>
        </div>

        <div className="user-readiness-card">
          <div
            className="user-readiness-ring"
            style={{ "--progress": `${readinessScore}%` }}
          >
            <div className="user-readiness-core">
              <strong>{readinessScore}%</strong>
              <span>Ready</span>
            </div>
          </div>
          <p>Safety profile readiness</p>
        </div>
      </section>

      {loading ? (
        <div className="user-dashboard-banner">Refreshing your dashboard...</div>
      ) : null}

      {error ? <div className="user-dashboard-banner warning">{error}</div> : null}

      <section className="user-metric-grid">
        <MetricCard
          label="Scheduled Sessions"
          value={scheduledSessions}
          tone="teal"
          note="Meet link already shared"
        />
        <MetricCard
          label="Awaiting Meet Links"
          value={awaitingSessions}
          tone="amber"
          note="Waiting for doctor or counsellor"
        />
        <MetricCard
          label="Unread Notifications"
          value={unreadNotifications}
          tone="navy"
          note="Updates you have not opened"
        />
        <MetricCard
          label="SOS Updates"
          value={sosUpdates}
          tone="rose"
          note="Safety-related notifications"
        />
      </section>

      <section className="user-dashboard-grid">
        <article className="user-panel user-panel-wide">
          <div className="user-panel-header">
            <div>
              <h3>Weekly Activity</h3>
              <p>Sessions and notifications recorded over the last 7 days.</p>
            </div>
          </div>

          <div className="user-activity-chart">
            {activitySeries.map((item) => (
              <div key={item.label} className="user-activity-column">
                <span className="user-activity-count">{item.count}</span>
                <div className="user-activity-track">
                  <div
                    className="user-activity-bar"
                    style={{
                      height: `${Math.max((item.count / activityPeak) * 100, item.count ? 16 : 0)}%`,
                    }}
                  />
                </div>
                <span className="user-activity-label">{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="user-panel">
          <div className="user-panel-header">
            <div>
              <h3>Notification Focus</h3>
              <p>Unread versus reviewed updates.</p>
            </div>
          </div>

          <div className="user-donut-wrap">
            <div
              className="user-donut"
              style={{ "--progress": `${unreadPercentage}%` }}
            >
              <div className="user-donut-core">
                <strong>{unreadNotifications}</strong>
                <span>Unread</span>
              </div>
            </div>

            <div className="user-legend">
              <LegendRow label="Unread" value={unreadNotifications} accent="unread" />
              <LegendRow label="Reviewed" value={readNotifications} accent="read" />
              <LegendRow label="SOS" value={sosUpdates} accent="sos" />
            </div>
          </div>
        </article>

        <article className="user-panel">
          <div className="user-panel-header">
            <div>
              <h3>Support Severity Snapshot</h3>
              <p>Based on your session recommendations so far.</p>
            </div>
          </div>

          <div className="user-progress-list">
            {severityRows.map((row) => (
              <div key={row.key} className="user-progress-row">
                <div className="user-progress-meta">
                  <span>{row.label}</span>
                  <strong>{row.count}</strong>
                </div>
                <div className="user-progress-track">
                  <div
                    className={`user-progress-fill ${row.accent}`}
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="user-panel">
          <div className="user-panel-header">
            <div>
              <h3>Safety Setup</h3>
              <p>Check whether your private protections are fully configured.</p>
            </div>
          </div>

          <div className="user-checklist">
            {profileChecks.map((item) => (
              <div key={item.label} className="user-check-item">
                <span className={`user-check-dot ${item.value ? "active" : "inactive"}`} />
                <span>{item.label}</span>
                <strong>{item.value ? "On" : "Off"}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="user-panel user-panel-wide">
          <div className="user-panel-header">
            <div>
              <h3>Recent Updates</h3>
              <p>Your latest sessions and notifications in one place.</p>
            </div>
          </div>

          {recentUpdates.length === 0 ? (
            <div className="user-empty-state">
              No recent activity yet. Your dashboard will fill in as you use support chat, sessions, and notifications.
            </div>
          ) : (
            <div className="user-update-list">
              {recentUpdates.map((item) => (
                <div key={item.id} className="user-update-item">
                  <span className={`user-update-pill ${item.tone}`}>{item.title}</span>
                  <p>{item.note}</p>
                  <time>{toDate(item.time)?.toLocaleString() || "Unknown time"}</time>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

export default DashboardHomeModern;
