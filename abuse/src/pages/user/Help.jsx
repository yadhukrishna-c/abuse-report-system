import React from "react";
import "./Help.css";

const Help = () => {
  const resources = [
    { id: 1, title: "Women Helpline", number: "181", type: "Helpline" },
    { id: 2, title: "Police Emergency", number: "100", type: "Emergency" },
    { id: 3, title: "National Commission for Women", number: "7827170170", type: "Support" },
    { id: 4, title: "Child Helpline", number: "1098", type: "Helpline" },
  ];

  return (
    <div className="help-container">
      <h2 className="help-title">Help & Safety</h2>

      {/* Emergency Card */}
      <div className="emergency-card">
        <h3>🚨 Emergency</h3>
        <p>If you are in immediate danger, call the emergency number below.</p>
        <button className="emergency-btn">Call 112</button>
      </div>

      {/* Resources Section */}
      <div className="resources-section">
        <h3>Support Resources</h3>

        {resources.map((item) => (
          <div key={item.id} className="resource-card">
            <div>
              <h4>{item.title}</h4>
              <span className="resource-type">{item.type}</span>
            </div>
            <button className="call-btn">Call {item.number}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Help;