import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    // 🔹 If no token → redirect
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setProfile(res.data);
      } catch (error) {
        console.error("Profile fetch error:", error);

        // 🔹 If token invalid → logout
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    };

    fetchProfile();
  }, [token, navigate]);

  /* ================= INPUT CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ================= TOGGLE BOOLEAN ================= */
  const handleToggle = (field) => {
    setProfile((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  /* ================= IMAGE CHANGE ================= */
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({
        ...prev,
        photo: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    try {
      await axios.put(
        "http://localhost:5000/api/profile",
        profile,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setIsEditing(false);
      alert("Profile Updated Successfully ✅");
    } catch (error) {
      console.error("Error updating profile", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  /* ================= LOADING STATE ================= */
  if (!profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <h2 className="profile-title">Profile & Privacy</h2>

      <div className="profile-card">

        {/* Profile Photo */}
        <div className="profile-photo-section">
          <div className="profile-photo">
            {profile.photo ? (
              <img src={profile.photo} alt="Profile" />
            ) : (
              <span>No Photo</span>
            )}
          </div>

          {isEditing && (
            <label className="upload-btn">
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </label>
          )}
        </div>

        {/* User Info */}
        <div className="profile-info">
          <label>Username</label>
          <input
            name="username"
            value={profile.username || ""}
            onChange={handleChange}
            disabled={!isEditing}
          />

          <label>Email</label>
          <input
            name="email"
            value={profile.email || ""}
            onChange={handleChange}
            disabled={!isEditing}
          />

          <label>Account Type</label>
          <input
            name="accountType"
            value={profile.accountType || ""}
            disabled
          />
        </div>

        {/* Privacy Settings */}
        <div className="privacy-section">
          <h3>Privacy Settings</h3>

          <div className="privacy-item">
            <span>Anonymous Mode</span>
            <button
              onClick={() => handleToggle("anonymousMode")}
              disabled={!isEditing}
            >
              {profile.anonymousMode ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="privacy-item">
            <span>Location Sharing</span>
            <button
              onClick={() => handleToggle("locationSharing")}
              disabled={!isEditing}
            >
              {profile.locationSharing ? "Active" : "Off"}
            </button>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="emergency-section">
          <h3>Emergency Contact</h3>

          <label>Name</label>
          <input
            name="emergencyName"
            value={profile.emergencyName || ""}
            onChange={handleChange}
            disabled={!isEditing}
          />

          <label>Phone</label>
          <input
            name="emergencyPhone"
            value={profile.emergencyPhone || ""}
            onChange={handleChange}
            disabled={!isEditing}
          />
        </div>

        {/* Buttons */}
        <div className="profile-buttons">
          {isEditing ? (
            <>
              <button className="save-btn" onClick={saveProfile}>
                Save Changes
              </button>
              <button
                className="cancel-btn"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Profile;