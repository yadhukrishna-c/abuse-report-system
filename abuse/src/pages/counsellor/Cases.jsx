import React from "react";
import "./cases.css";

const Cases = () => {
  const casesData = [
    {
      id: "1033",
      client: "Aarav Kumar",
      issue: "Anxiety Disorder",
      priority: "High",
      status: "In Progress",
      nextSession: "25 Feb 2026",
    },
    {
      id: "1028",
      client: "Meera Nair",
      issue: "Academic Stress",
      priority: "Medium",
      status: "New Message",
      nextSession: "27 Feb 2026",
    },
    {
      id: "1021",
      client: "Rahul Das",
      issue: "Depression",
      priority: "Low",
      status: "Completed",
      nextSession: "Completed",
    },
  ];

  return (
    <div className="cases-container">
      <h2>Assigned Cases</h2>

      <div className="cases-grid">
        {casesData.map((item) => (
          <div className="case-card" key={item.id}>
            <div className="case-header">
              <h3>Case #{item.id}</h3>
              <span className={`priority ${item.priority.toLowerCase()}`}>
                {item.priority}
              </span>
            </div>

            <div className="case-body">
              <p><strong>Client:</strong> {item.client}</p>
              <p><strong>Issue:</strong> {item.issue}</p>
              <p><strong>Status:</strong> {item.status}</p>
              <p><strong>Next Session:</strong> {item.nextSession}</p>
            </div>

            <div className="case-footer">
              <button>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cases;