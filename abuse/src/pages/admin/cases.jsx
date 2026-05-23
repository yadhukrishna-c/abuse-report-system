import React, { useEffect, useMemo, useState } from "react";
import "./cases.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const normalizeValue = (value, fallback = "Not Assigned") => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
};

const normalizeCase = (item, index) => {
  const resolvedId =
    item?._id?.$oid || item?._id || item?.id || `case-${index + 1}`;
  const createdAt = item?.createdAt?.$date || item?.createdAt || null;

  return {
    _id: resolvedId,
    displayId: item?.id || `C${String(index + 1).padStart(3, "0")}`,
    name: normalizeValue(item?.userName, "Unknown User"),
    type: normalizeValue(item?.type, "Unknown Type"),
    risk: normalizeValue(item?.risk, "Unknown"),
    assigned: normalizeValue(item?.assignedTo, "Not Assigned"),
    status: normalizeValue(item?.status, "Open"),
    date: createdAt ? new Date(createdAt) : null,
  };
};

const formatDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "Unknown";
  }

  return value.toLocaleDateString();
};

const toClassSuffix = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");

const ActiveCases = () => {
  const [cases, setCases] = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/admin/cases`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to fetch cases");
        }

        const normalizedCases = (Array.isArray(data) ? data : []).map(normalizeCase);
        setCases(normalizedCases);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to fetch cases");
        setCases([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const typeOptions = useMemo(
    () => [...new Set(cases.map((item) => item.type).filter(Boolean))],
    [cases]
  );

  const riskOptions = useMemo(
    () => [...new Set(cases.map((item) => item.risk).filter(Boolean))],
    [cases]
  );

  const statusOptions = useMemo(
    () => [...new Set(cases.map((item) => item.status).filter(Boolean))],
    [cases]
  );

  const filteredCases = useMemo(
    () =>
      cases.filter((item) => {
        const matchesType = typeFilter === "All" || item.type === typeFilter;
        const matchesRisk = riskFilter === "All" || item.risk === riskFilter;
        const matchesStatus = statusFilter === "All" || item.status === statusFilter;

        return matchesType && matchesRisk && matchesStatus;
      }),
    [cases, typeFilter, riskFilter, statusFilter]
  );

  return (
    <div className="cases-container">
      <div className="cases-header">
        <h2>Active Cases</h2>

        <div className="filters">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="All">All Types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="All">All Risk</option>
            {riskOptions.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="info-text">Loading cases...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="table-wrapper">
        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Risk</th>
              <th>Assigned Doctor</th>
              <th>Status</th>
              <th>Reported Date</th>
            </tr>
          </thead>

          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  {loading ? "Loading cases..." : "No cases found"}
                </td>
              </tr>
            ) : (
              filteredCases.map((item) => (
                <tr key={item._id}>
                  <td>{item.displayId}</td>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td>
                    <span className={`badge risk-${toClassSuffix(item.risk)}`}>
                      {item.risk}
                    </span>
                  </td>
                  <td>{item.assigned}</td>
                  <td>
                    <span className={`badge status-${toClassSuffix(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{formatDate(item.date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActiveCases;
