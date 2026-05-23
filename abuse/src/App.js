import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import Registration from "./components/Registration";

// Dashboards
import AdminDashboard from "./pages/admin/Dashboard";
import UserDashboard from "./pages/user/UserDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";

// Counsellor Layout + Pages
import CounsellorLayout from "./pages/counsellor/CounsellorLayout";
import Dashboard from "./pages/counsellor/Dashboard";
import Sessions from "./pages/counsellor/Sessions";
import Profile from "./pages/counsellor/Profile";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<Registration />} />

        {/* Other Dashboards */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />

        {/* ================= COUNSELLOR ROUTES ================= */}
        <Route path="/counsellor-dashboard" element={<CounsellorLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="cases"
            element={<Navigate to="/counsellor-dashboard/dashboard" replace />}
          />
          <Route
            path="chats"
            element={<Navigate to="/counsellor-dashboard/dashboard" replace />}
          />
          <Route
            path="settings"
            element={<Navigate to="/counsellor-dashboard/dashboard" replace />}
          />
          <Route
            path="*"
            element={<Navigate to="/counsellor-dashboard/dashboard" replace />}
          />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <h2 style={{ textAlign: "center", marginTop: 40 }}>
              404 – Page Not Found
            </h2>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
