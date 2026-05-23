import React, { useState, useEffect } from "react";
import "./Counsellors.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const normalizeCounsellor = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  const linkedUser =
    entry.userId && typeof entry.userId === "object" ? entry.userId : null;

  const id = entry._id || linkedUser?._id || entry.id || "";
  if (!id) return null;

  return {
    _id: id,
    userId: linkedUser?._id || entry.userId || "",
    role: entry.role || linkedUser?.role || "",
    name: entry.name || linkedUser?.username || entry.username || "",
    specialization: entry.specialization || "",
    experience: entry.experience || "",
    location: entry.location || "",
    availability: entry.availability || "Available",
    email: entry.email || linkedUser?.email || "",
  };
};

const normalizeCounsellorsPayload = (payload) => {
  if (Array.isArray(payload)) return payload.map(normalizeCounsellor).filter(Boolean);

  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.counsellors)) {
    return payload.counsellors.map(normalizeCounsellor).filter(Boolean);
  }

  if (Array.isArray(payload.data)) {
    return payload.data.map(normalizeCounsellor).filter(Boolean);
  }

  if (payload.data && Array.isArray(payload.data.counsellors)) {
    return payload.data.counsellors.map(normalizeCounsellor).filter(Boolean);
  }

  if (Array.isArray(payload.results)) {
    return payload.results.map(normalizeCounsellor).filter(Boolean);
  }

  return [];
};

const Counsellors = () => {
  const [counsellors, setCounsellors] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [newCounsellor, setNewCounsellor] = useState({
    name: "",
    specialization: "",
    experience: "",
    location: "",
    availability: "Available",
    email: "",
    password: "",
  });

  // Fetch counsellors from backend
  useEffect(() => {
    fetchCounsellors();
  }, []);

  const fetchCounsellors = async () => {
    try {
      let nextCounsellors = [];

      const res = await fetch(`${API_BASE_URL}/counsellors`);
      const data = await res.json();

      if (res.ok) {
        nextCounsellors = normalizeCounsellorsPayload(data);
      }

      if (!nextCounsellors.length) {
        const fallbackRes = await fetch(`${API_BASE_URL}/admin/users`);
        const fallbackData = await fallbackRes.json();

        if (!fallbackRes.ok) {
          throw new Error("Failed to fetch counsellors");
        }

        nextCounsellors = normalizeCounsellorsPayload(fallbackData).filter(
          (counsellor) => counsellor.role === "counsellor"
        );
      }

      setCounsellors(nextCounsellors);
    } catch (error) {
      console.error("Error fetching counsellors:", error);
      setCounsellors([]);
    }
  };

  const handleChange = (e) => {
    setNewCounsellor({ ...newCounsellor, [e.target.name]: e.target.value });
  };

  const handleAddCounsellor = async () => {
    if (!newCounsellor.name || !newCounsellor.email || !newCounsellor.password) {
      alert("Name, email, and password are required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/counsellors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCounsellor),
      });

      if (res.ok) {
        fetchCounsellors();
        setNewCounsellor({
          name: "",
          specialization: "",
          experience: "",
          location: "",
          availability: "Available",
          email: "",
          password: "",
        });
        setShowModal(false);
      } else {
        const data = await res.json();
        alert(data.message || "Error adding counsellor");
      }
    } catch (error) {
      console.error("Error adding counsellor:", error);
    }
  };

  return (
    <div className="counsellor-container">
      <div className="counsellor-header">
        <h2>🧠 Registered Counsellors</h2>
        <button className="add-btn" onClick={() => setShowModal(true)}>+ Add Counsellor</button>
      </div>

        <div className="counsellor-grid">
          {counsellors.map((c) => (
            <div key={c._id} className="counsellor-card">
              <h3>{c.name}</h3>
              <p><strong>Email:</strong> {c.email}</p>
              <p><strong>Specialization:</strong> {c.specialization}</p>
              <p><strong>Experience:</strong> {c.experience}</p>
              <p><strong>Location:</strong> {c.location}</p>
            <span className={`status-badge ${c.availability === "Available" ? "available" : "busy"}`}>
              {c.availability}
            </span>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Counsellor</h3>

            <input type="text" name="name" placeholder="Full Name" value={newCounsellor.name} onChange={handleChange} />
            <input type="text" name="specialization" placeholder="Specialization" value={newCounsellor.specialization} onChange={handleChange} />
            <input type="text" name="experience" placeholder="Experience (e.g. 5 Years)" value={newCounsellor.experience} onChange={handleChange} />
            <input type="text" name="location" placeholder="Location" value={newCounsellor.location} onChange={handleChange} />
            <input type="email" name="email" placeholder="Email" value={newCounsellor.email} onChange={handleChange} />
            <input type="password" name="password" placeholder="Password" value={newCounsellor.password} onChange={handleChange} />

            <select name="availability" value={newCounsellor.availability} onChange={handleChange}>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
            </select>

            <div className="modal-buttons">
              <button className="save-btn" onClick={handleAddCounsellor}>Save</button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Counsellors;
