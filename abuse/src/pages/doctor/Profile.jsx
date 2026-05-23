import React, { useEffect, useMemo, useState } from "react";
import "./Profile.css";

const normalizeDoctorPayload = (payload) => {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    return payload.length > 0 && typeof payload[0] === "object" ? payload[0] : null;
  }

  if (typeof payload !== "object") return null;

  if (payload.doctor && typeof payload.doctor === "object") return payload.doctor;
  if (payload.profile && typeof payload.profile === "object") return payload.profile;
  if (payload.user && typeof payload.user === "object") return payload.user;

  if (payload.data && typeof payload.data === "object") {
    if (payload.data.doctor && typeof payload.data.doctor === "object") {
      return payload.data.doctor;
    }
    if (payload.data.profile && typeof payload.data.profile === "object") {
      return payload.data.profile;
    }
    if (payload.data.user && typeof payload.data.user === "object") {
      return payload.data.user;
    }
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

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) return token;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return (
      user?.token ||
      user?.accessToken ||
      user?.jwt ||
      user?.data?.token ||
      user?.data?.accessToken ||
      ""
    );
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

const buildProfilePayload = (source, imageChanged, imageValue) => {
  const payload = { ...(source || {}) };
  const from = source || {};

  const name = from.name || from.username || "";
  if (name) {
    payload.name = name;
    payload.username = name;
  }

  const specialization =
    from.specialization || from.speciality || from.specialisation || "";
  if (specialization) {
    payload.specialization = specialization;
    payload.speciality = specialization;
    payload.specialisation = specialization;
  }

  const hospital =
    from.hospital || from.hospitalName || from.clinic || from.clinicName || "";
  if (hospital) {
    payload.hospital = hospital;
    payload.hospitalName = hospital;
    payload.clinic = hospital;
    payload.clinicName = hospital;
  }

  const experience =
    from.experience || from.yearsOfExperience || from.exp || "";
  if (experience) {
    payload.experience = experience;
    payload.yearsOfExperience = experience;
    payload.exp = experience;
  }

  // Never send multiple image aliases in one request.
  delete payload.image;
  delete payload.profileImage;
  delete payload.avatar;

  if (imageChanged && imageValue) {
    payload.photo = imageValue;
  } else {
    // When only text fields are edited, avoid sending image data entirely.
    delete payload.photo;
  }

  delete payload.password;
  delete payload.confirmPassword;
  delete payload.token;
  delete payload.accessToken;
  delete payload.jwt;
  delete payload.__v;

  return payload;
};

const parseApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (!trimmed) return { data: null, isHtml: false };

  const isHtml =
    contentType.includes("text/html") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html");

  if (isHtml) {
    return {
      data: { message: `Unexpected server response from ${response.url} (${response.status})` },
      isHtml: true,
    };
  }

  try {
    return { data: JSON.parse(trimmed), isHtml: false };
  } catch (error) {
    return { data: { message: trimmed }, isHtml: false };
  }
};

const MAX_IMAGE_DATA_URL_LENGTH = 45000;

const renderCompressedDataUrl = (img, maxSize, quality) => {
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
};

const compressImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const attempts = [
          { maxSize: 512, quality: 0.7 },
          { maxSize: 420, quality: 0.62 },
          { maxSize: 360, quality: 0.54 },
          { maxSize: 320, quality: 0.48 },
          { maxSize: 280, quality: 0.42 },
          { maxSize: 240, quality: 0.36 },
          { maxSize: 200, quality: 0.3 },
        ];

        let smallest = "";
        for (const attempt of attempts) {
          const compressed = renderCompressedDataUrl(img, attempt.maxSize, attempt.quality);
          if (!compressed) continue;
          smallest = compressed;
          if (compressed.length <= MAX_IMAGE_DATA_URL_LENGTH) {
            resolve(compressed);
            return;
          }
        }

        if (smallest && smallest.length <= MAX_IMAGE_DATA_URL_LENGTH) {
          resolve(smallest);
          return;
        }

        reject(new Error("Image is too large. Please choose a smaller photo."));
      };
      img.onerror = () => reject(new Error("Unable to read selected image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Unable to process selected image."));
    reader.readAsDataURL(file);
  });

const Profile = ({ doctor, loading, onProfileUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({});
  const [imageChanged, setImageChanged] = useState(false);
  const storedUser = useMemo(() => getStoredUser(), []);
  const normalizedDoctor = useMemo(
    () => normalizeProfileFields(normalizeDoctorPayload(doctor) || {}),
    [doctor]
  );
  const normalizedStoredDoctor = useMemo(
    () => normalizeProfileFields(normalizeDoctorPayload(storedUser) || storedUser || {}),
    [storedUser]
  );
  const effectiveDoctor = useMemo(() => {
    if (normalizedDoctor && Object.keys(normalizedDoctor).length > 0) return normalizedDoctor;
    if (normalizedStoredDoctor && Object.keys(normalizedStoredDoctor).length > 0) return normalizedStoredDoctor;
    return {};
  }, [normalizedDoctor, normalizedStoredDoctor]);

  useEffect(() => {
    if (effectiveDoctor && Object.keys(effectiveDoctor).length > 0) {
      setProfile(effectiveDoctor);
      setImageChanged(false);
    }
  }, [effectiveDoctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };
      if (name === "name" || name === "username") {
        next.name = value;
        next.username = value;
      }
      return next;
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageToDataUrl(file);
      setProfile((prev) => ({
        ...prev,
        photo: compressed,
        image: compressed,
      }));
      setImageChanged(true);
    } catch (error) {
      alert(error.message || "Failed to process image");
    }
  };

  const fetchLatestProfile = async (token) => {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
    const cacheBust = `t=${Date.now()}`;

    let doctorProfile = null;
    let genericProfile = null;

    const doctorRes = await fetch(`http://localhost:5000/api/doctors/profile?${cacheBust}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const doctorParsed = await parseApiResponse(doctorRes);
    if (doctorRes.ok && !doctorParsed.isHtml) {
      doctorProfile = normalizeProfileFields(normalizeDoctorPayload(doctorParsed.data));
    }

    const genericRes = await fetch(`http://localhost:5000/api/profile?${cacheBust}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const genericParsed = await parseApiResponse(genericRes);
    if (genericRes.ok && !genericParsed.isHtml) {
      genericProfile = normalizeProfileFields(normalizeDoctorPayload(genericParsed.data));
    }

    const merged = normalizeProfileFields(mergeDefinedFields(doctorProfile, genericProfile));
    return Object.keys(merged).length > 0 ? merged : null;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error("Unauthorized: token missing. Please login again.");
      }

      const baseProfile = normalizeProfileFields(mergeDefinedFields(effectiveDoctor, profile));
      const imageValue =
        baseProfile.photo || baseProfile.image || baseProfile.profileImage || baseProfile.avatar || "";
      if (imageChanged && imageValue.length > MAX_IMAGE_DATA_URL_LENGTH) {
        throw new Error("Image is too large. Please choose a smaller photo.");
      }

      const payload = buildProfilePayload(baseProfile, imageChanged, imageValue);
      const attempts = [
        {
          method: "PUT",
          url: "http://localhost:5000/api/profile",
          body: payload,
        },
      ];

      let finalData = null;
      let lastError = "Failed to update profile";

      for (const attempt of attempts) {
        const response = await fetch(attempt.url, {
          method: attempt.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(attempt.body),
        });

        const parsed = await parseApiResponse(response);

        if (response.status === 413) {
          throw new Error("Image is too large. Please choose a smaller photo.");
        }

        if (response.ok && !parsed.isHtml) {
          finalData = parsed.data;
          break;
        }

        lastError =
          parsed?.data?.message ||
          `${attempt.method} ${attempt.url} failed with status ${response.status}`;
      }

      if (!finalData) {
        throw new Error(lastError);
      }

      const freshProfile = await fetchLatestProfile(token);
      const normalizedUpdatedDoctor = normalizeProfileFields(normalizeDoctorPayload(finalData));
      const updatedDoctor =
        freshProfile && Object.keys(freshProfile).length > 0
          ? normalizeProfileFields(freshProfile)
          : normalizedUpdatedDoctor && Object.keys(normalizedUpdatedDoctor).length > 0
            ? normalizeProfileFields(normalizedUpdatedDoctor)
            : normalizeProfileFields(mergeDefinedFields(effectiveDoctor, payload));

      setProfile(updatedDoctor);
      setIsEditing(false);
      setImageChanged(false);
      persistUserProfile(updatedDoctor);
      if (typeof onProfileUpdated === "function") {
        onProfileUpdated(updatedDoctor);
      }
      alert("Profile updated successfully");
    } catch (error) {
      console.error("Error updating doctor profile:", error);
      alert(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(effectiveDoctor || {});
    setIsEditing(false);
    setImageChanged(false);
  };

  if (loading && (!effectiveDoctor || Object.keys(effectiveDoctor).length === 0)) {
    return <div className="page-content">Loading profile...</div>;
  }

  if (!effectiveDoctor || Object.keys(effectiveDoctor).length === 0) {
    return <div className="page-content">No profile data available.</div>;
  }

  return (
    <div className="page-content">
      <h2>My Profile</h2>
      <div className="profile-card">
        <div className="profile-header">
          <img
            src={
              profile.image ||
              profile.photo ||
              profile.profileImage ||
              profile.avatar ||
              "https://i.pravatar.cc/120"
            }
            alt="Doctor profile"
            className="profile-img"
          />
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          )}
        </div>

        <div className="profile-details">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={profile.name || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={profile.email || ""}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Specialization</label>
            <input
              type="text"
              name="specialization"
              value={profile.specialization || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Hospital</label>
            <input
              type="text"
              name="hospital"
              value={profile.hospital || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Experience</label>
            <input
              type="text"
              name="experience"
              value={profile.experience || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="profile-actions">
          {!isEditing ? (
            <button
              type="button"
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                type="button"
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
