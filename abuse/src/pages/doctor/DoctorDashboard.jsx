// DoctorDashboard.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import Appointments from "./Appointments";
import Notifications from "./Notifications";
import "./DoctorDashboard.css";

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) return token;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.token || user?.accessToken || user?.jwt || "";
  } catch (error) {
    return "";
  }
};

const getStoredUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user && typeof user === "object" ? user : {};
  } catch (error) {
    return {};
  }
};

const normalizeDoctorPayload = (payload) => {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (typeof payload !== "object") return null;
  if (payload.doctor && typeof payload.doctor === "object") return payload.doctor;
  if (payload.profile && typeof payload.profile === "object") return payload.profile;
  if (payload.user && typeof payload.user === "object") return payload.user;
  if (payload.data && typeof payload.data === "object") {
    if (payload.data.doctor && typeof payload.data.doctor === "object") return payload.data.doctor;
    if (payload.data.profile && typeof payload.data.profile === "object") return payload.data.profile;
    if (payload.data.user && typeof payload.data.user === "object") return payload.data.user;
    return payload.data;
  }
  return payload;
};

const normalizeProfileFields = (profile) => {
  if (!profile || typeof profile !== "object") return {};

  const name = profile.name || profile.username || profile.fullName || "";
  const photo = profile.photo || profile.image || profile.profileImage || profile.avatar || "";

  return {
    ...profile,
    ...(name ? { name, username: profile.username || name } : {}),
    ...(photo ? { photo, image: profile.image || photo } : {}),
  };
};

const parseApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) return { data: null, isHtml: false };

  const isHtml =
    contentType.includes("text/html") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html");

  if (isHtml) return { data: null, isHtml: true };

  try {
    return { data: JSON.parse(trimmed), isHtml: false };
  } catch (error) {
    return { data: null, isHtml: false };
  }
};

const mergeDefinedFields = (base, overlay) => {
  const result = { ...(base || {}) };
  const source = overlay || {};

  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  });

  return result;
};

const persistUserProfile = (profile) => {
  try {
    const existing = getStoredUser();
    localStorage.setItem("user", JSON.stringify(mergeDefinedFields(existing, profile || {})));
  } catch (error) {
    // ignore storage errors
  }
};

const DoctorDashboard = () => {
  const [activePage, setActivePage] = useState("profile");
  const [doctor, setDoctor] = useState({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchDoctorProfile();
    fetchNotifications();

    // Optional: Poll notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDoctorProfile = async () => {
    try {
      const token = getAuthToken();
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          }
        : {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          };
      const cacheBust = `t=${Date.now()}`;
      let doctorProfile = null;
      let genericProfile = null;

      const doctorRes = await fetch(`http://localhost:5000/api/doctors/profile?${cacheBust}`, {
        headers,
        cache: "no-store",
      });
      const doctorParsed = await parseApiResponse(doctorRes);
      if (doctorRes.ok && !doctorParsed.isHtml) {
        doctorProfile = normalizeProfileFields(normalizeDoctorPayload(doctorParsed.data));
      }

      const genericRes = await fetch(`http://localhost:5000/api/profile?${cacheBust}`, {
        headers,
        cache: "no-store",
      });
      const genericParsed = await parseApiResponse(genericRes);
      if (genericRes.ok && !genericParsed.isHtml) {
        genericProfile = normalizeProfileFields(normalizeDoctorPayload(genericParsed.data));
      }

      // Keep doctor-only fields, but let latest generic profile values win for shared text fields.
      let resolvedProfile = normalizeProfileFields(mergeDefinedFields(doctorProfile, genericProfile));

      if (Object.keys(resolvedProfile).length === 0) {
        const storedUser = getStoredUser();
        resolvedProfile = normalizeProfileFields(normalizeDoctorPayload(storedUser) || storedUser || {});
      }

      setDoctor(resolvedProfile);
      if (Object.keys(resolvedProfile || {}).length > 0) {
        persistUserProfile(resolvedProfile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      const storedUser = getStoredUser();
      const fallbackProfile = normalizeProfileFields(normalizeDoctorPayload(storedUser) || storedUser || {});
      setDoctor(fallbackProfile);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch("http://localhost:5000/api/doctors/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const renderPage = () => {
    switch (activePage) {
      case "appointments":
        return <Appointments />;
      case "notifications":
        return <Notifications data={notifications} />;
      default:
        return (
          <Profile
            doctor={doctor}
            loading={loading}
            onProfileUpdated={(updatedProfile) => {
              setDoctor(updatedProfile || {});
              persistUserProfile(updatedProfile || {});
            }}
          />
        );
    }
  };

  return (
    <div className="doctor-dashboard">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={handleLogout}
        notifications={notifications}
      />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
};

export default DoctorDashboard;
