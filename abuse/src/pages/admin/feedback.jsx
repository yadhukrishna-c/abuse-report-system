import React from "react";
import "./feedback.css";

const Feedback = () => {
  const feedbackList = [
    {
      id: 1,
      name: "Ananya Sharma",
      rating: 5,
      message: "Excellent support system. The doctors responded quickly and helped me a lot!",
      date: "12 Feb 2026",
    },
    {
      id: 2,
      name: "Rahul Verma",
      rating: 4,
      message: "Very good counselling service. Easy to book appointments.",
      date: "10 Feb 2026",
    },
    {
      id: 3,
      name: "Priya Nair",
      rating: 3,
      message: "Overall good experience but response time can improve.",
      date: "08 Feb 2026",
    },
  ];

  const renderStars = (rating) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h2>⭐ User Feedback</h2>
        <p>What our users are saying</p>
      </div>

      <div className="feedback-grid">
        {feedbackList.map((feedback) => (
          <div key={feedback.id} className="feedback-card">
            <div className="feedback-top">
              <h3>{feedback.name}</h3>
              <span className="feedback-date">{feedback.date}</span>
            </div>

            <div className="feedback-rating">
              {renderStars(feedback.rating)}
            </div>

            <p className="feedback-message">
              {feedback.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feedback;