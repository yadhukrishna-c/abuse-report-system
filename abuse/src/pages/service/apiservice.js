import axios from "axios";

/* ================= AXIOS BASE INSTANCE ================= */
const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

/* ================= AUTH ================= */
export const registerUser = async (userData) => {
  const response = await API.post("/auth/register", userData);
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });
  return response.data;
};

/* ================= DOCTOR ================= */
export const updateDoctorProfile = async (doctorId, data) => {
  const response = await API.put(
    `/doctors/update-profile/${doctorId}`,
    data
  );
  return response.data;
};

export default API;