import React from "react";
import "./chat.css";

const Chats = () => {
  const chats = [
    {
      id: 1,
      name: "Aarav Nair",
      lastMessage: "Doctor, I am feeling better today.",
      time: "10:30 AM"
    },
    {
      id: 2,
      name: "Meera Joseph",
      lastMessage: "Can we reschedule the appointment?",
      time: "Yesterday"
    },
    {
      id: 3,
      name: "Rohan Kumar",
      lastMessage: "Thank you for your guidance.",
      time: "Monday"
    }
  ];

  return (
    <div className="chat-container">
      <h2>Support Chats</h2>

      {chats.map((chat) => (
        <div key={chat.id} className="chat-card">
          <div>
            <h4>{chat.name}</h4>
            <p className="chat-message">{chat.lastMessage}</p>
          </div>
          <span className="chat-time">{chat.time}</span>
        </div>
      ))}
    </div>
  );
};

export default Chats;