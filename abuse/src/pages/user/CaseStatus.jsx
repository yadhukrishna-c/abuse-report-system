import React from "react";
import "./CaseStatus.css";

const caseData = {
  caseId: "SC-2026-1045",
  reportedDate: "February 18, 2026",
  category: "Workplace Harassment",
  status: "In Progress",
  assignedOfficer: "Officer Meera Krishnan",
  lastUpdate: "February 22, 2026",
};

const timeline = [
  { step: "Report Submitted", completed: true },
  { step: "Initial Review", completed: true },
  { step: "Investigation Ongoing", completed: true },
  { step: "Final Decision", completed: false },
];

const CaseStatus = () => {
  return (
    <div className="case-container">
      <h2 className="case-title">Case Tracking</h2>

      <div className="case-card">
        <div className="case-header">
          <div>
            <p className="case-id">Case ID: {caseData.caseId}</p>
            <p className="case-category">{caseData.category}</p>
          </div>
          <span className="case-status">{caseData.status}</span>
        </div>

        <div className="case-details">
          <p><strong>Reported On:</strong> {caseData.reportedDate}</p>
          <p><strong>Assigned Officer:</strong> {caseData.assignedOfficer}</p>
          <p><strong>Last Updated:</strong> {caseData.lastUpdate}</p>
        </div>
      </div>

      <div className="timeline-card">
        <h3>Case Progress</h3>
        <div className="timeline">
          {timeline.map((item, index) => (
            <div key={index} className="timeline-item">
              <div className={`circle ${item.completed ? "active" : ""}`}></div>
              <p className={item.completed ? "active-text" : ""}>
                {item.step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CaseStatus;