// Doctors.jsx
import React, { useState, useEffect } from "react";
import "./Doctor.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const normalizeDoctor = (entry) => {
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
    hospital: entry.hospital || "",
    experience: entry.experience || "",
    email: entry.email || linkedUser?.email || "",
  };
};

const normalizeDoctorsPayload = (payload) => {
  if (Array.isArray(payload)) return payload.map(normalizeDoctor).filter(Boolean);

  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.doctors)) return payload.doctors.map(normalizeDoctor).filter(Boolean);
  if (Array.isArray(payload.data)) return payload.data.map(normalizeDoctor).filter(Boolean);
  if (payload.data && Array.isArray(payload.data.doctors)) {
    return payload.data.doctors.map(normalizeDoctor).filter(Boolean);
  }
  if (Array.isArray(payload.results)) return payload.results.map(normalizeDoctor).filter(Boolean);

  return [];
};

const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (token) return token;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.token || user?.accessToken || "";
  } catch (error) {
    return "";
  }
};

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    specialization: "",
    hospital: "",
    experience: "",
    email: "",
    password: "",
  });

  // Fetch doctors from backend
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const token = getAuthToken();
      let nextDoctors = [];

      if (token) {
        const resWithAuth = await fetch(`${API_BASE_URL}/doctors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resWithAuth.json();

        if (resWithAuth.ok) {
          nextDoctors = normalizeDoctorsPayload(data);
        } else if (![401, 403].includes(resWithAuth.status)) {
          throw new Error(data?.message || "Failed to fetch doctors");
        }
      }

      if (!nextDoctors.length) {
        const fallbackRes = await fetch(`${API_BASE_URL}/admin/users`);
        const fallbackData = await fallbackRes.json();

        if (!fallbackRes.ok) {
          throw new Error("Failed to fetch doctors");
        }

        nextDoctors = normalizeDoctorsPayload(fallbackData).filter(
          (doctor) => doctor.role === "doctor"
        );
      }

      setDoctors(nextDoctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
    }
  };

  const handleChange = (e) => {
    setNewDoctor({ ...newDoctor, [e.target.name]: e.target.value });
  };

  const handleAddDoctor = async () => {
    if (!newDoctor.name || !newDoctor.email || !newDoctor.password) {
      alert("Name, email, and password are required");
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/doctors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newDoctor),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Doctor added successfully");
        setNewDoctor({
          name: "",
          specialization: "",
          hospital: "",
          experience: "",
          email: "",
          password: "",
        });
        setShowModal(false);
        fetchDoctors(); // refresh list
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error adding doctor:", error);
    }
  };

  return (
    <div className="doctor-container">
      <div className="doctor-header">
        <h2>Registered Doctors</h2>
        <button className="add-btn" onClick={() => setShowModal(true)}>+ Add Doctor</button>
      </div>

      <div className="doctor-grid">
        {doctors.map((doc) => (
          <div key={doc._id} className="doctor-card">
            <h3>{doc.name}</h3>
            <p><strong>Specialization:</strong> {doc.specialization}</p>
            <p><strong>Hospital:</strong> {doc.hospital}</p>
            <p><strong>Experience:</strong> {doc.experience}</p>
            <p><strong>Email:</strong> {doc.email}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Register New Doctor</h3>

            <input type="text" name="name" placeholder="Doctor Name" value={newDoctor.name} onChange={handleChange} />
            <input type="text" name="specialization" placeholder="Specialization" value={newDoctor.specialization} onChange={handleChange} />
            <input type="text" name="hospital" placeholder="Hospital Name" value={newDoctor.hospital} onChange={handleChange} />
            <input type="text" name="experience" placeholder="Experience" value={newDoctor.experience} onChange={handleChange} />
            <input type="email" name="email" placeholder="Email" value={newDoctor.email} onChange={handleChange} />
            <input type="password" name="password" placeholder="Password" value={newDoctor.password} onChange={handleChange} />

            <div className="modal-buttons">
              <button className="save-btn" onClick={handleAddDoctor}>Save</button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
