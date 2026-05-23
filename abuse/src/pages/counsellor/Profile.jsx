import React, { useEffect, useState } from "react";
import "./profile.css";

const API_URL = "http://localhost:5000/api/counsellors/me";

const getToken = () => {
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
    image:
      source?.image ||
      source?.photo ||
      fallback?.image ||
      fallback?.photo ||
      "",
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
  } catch (error) {
    // ignore storage failures
  }
};

const parseResponse = async (response) => {
  const raw = await response.text();

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return { message: raw };
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchProfile = async () => {
      const fallback = normalizeProfile(getStoredUser());
      const token = getToken();

      if (!token) {
        if (!isActive) return;
        setProfile(fallback.name || fallback.email ? fallback : null);
        setError("Please log in again to load your profile.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await parseResponse(res);

        if (!res.ok) {
          if (!isActive) return;

          if (fallback.name || fallback.email) {
            setProfile(fallback);
            setError(data.message || "Unable to refresh profile data.");
            setLoading(false);
            return;
          }

          throw new Error(data.message || "Failed to load profile");
        }

        if (!isActive) return;

        const nextProfile = normalizeProfile(data, fallback);
        setProfile(nextProfile);
        persistProfile(nextProfile);
        setError("");
      } catch (err) {
        if (!isActive) return;

        if (fallback.name || fallback.email) {
          setProfile(fallback);
          setError(err.message || "Unable to refresh profile data.");
        } else {
          setError(err.message || "Failed to load profile");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const image = await readFileAsDataUrl(file);
      setProfile((prev) => ({ ...prev, image }));
    } catch (err) {
      alert(err.message || "Failed to read image");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const token = getToken();
      if (!token) {
        throw new Error("Please log in again to save your profile.");
      }

      const payload = {
        name: profile.name || "",
        specialization: profile.specialization || "",
        experience: profile.experience || "",
        location: profile.location || "",
        availability: profile.availability || "Available",
        image: profile.image || "",
      };

      const res = await fetch(API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }

      const updated = normalizeProfile(data, getStoredUser());
      setProfile(updated);
      persistProfile(updated);
      setIsEditing(false);
      setError("");
      alert("Profile updated successfully");
    } catch (err) {
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return <h2 className="center-text">Loading profile...</h2>;
  }

  if (!profile) {
    return <h2 className="center-text">{error || "No profile data available."}</h2>;
  }

  return (
    <div className="profile-page">
      {error ? <p className="center-text">{error}</p> : null}

      <div className="profile-card">
        <div className="profile-header">
          <img
            src={profile.image || "https://i.pravatar.cc/150"}
            alt="Profile"
            className="profile-img"
          />

          {isEditing ? (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          ) : null}

          <h2>{profile.name || "Counsellor"}</h2>
          <p>{profile.specialization || "Specialization not added"}</p>
        </div>

        <div className="profile-details">
          <div className="form-group">
            <label>Name</label>
            <input
              name="name"
              value={profile.name || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input value={profile.email || ""} disabled />
          </div>

          <div className="form-group">
            <label>Specialization</label>
            <input
              name="specialization"
              value={profile.specialization || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Experience</label>
            <input
              name="experience"
              value={profile.experience || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              name="location"
              value={profile.location || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Availability</label>
            <select
              name="availability"
              value={profile.availability || "Available"}
              onChange={handleChange}
              disabled={!isEditing}
            >
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
            </select>
          </div>
        </div>

        <div className="profile-actions">
          {!isEditing ? (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
