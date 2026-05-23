import React, { useEffect, useState } from "react";
import "./users.css";

const RegisteredUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:5000/api/admin/users");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch users");
        }

        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  /* ================= FILTER LOGIC ================= */
  const filteredUsers = users.filter((user) => {
    const name = user.name || user.username || "";
    const email = user.email || "";
    const role = user.role || "";

    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All" || role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="users-container">
      <div className="users-header">
        <h2>Registered Users</h2>

        <div className="users-actions">
          {/* 🔎 Search */}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* 👤 Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {loading && <p className="info-text">Loading users...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered On</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user._id}>
                  {/* ✅ Serial Number */}
                  <td>{index + 1}</td>

                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegisteredUsers;