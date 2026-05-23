import React, { useEffect, useRef, useState } from "react";
import "./SupportChat.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
const API_URL = process.env.REACT_APP_AI_CHAT_URL || `${API_BASE_URL}/ai-chat`;

const parseJwtPayload = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
};
const BACKEND_FALLBACK_RESPONSES = new Set([
  "I'm here with you. If this is urgent, please contact emergency services.",
  "Can you tell me more?",
]);

const INTENT_KEYWORDS = {
  greeting: ["hi", "hello", "hey", "good morning", "good evening"],
  physical_abuse: ["hit", "beat", "assault", "violence", "punch", "hurt physically"],
  sexual_abuse: ["sexual", "molest", "harass", "rape", "touch me", "pinch", "assaulted sexually"],
  mental_abuse: ["abuse", "manipulate", "control", "criticize", "humiliate", "mock"],
  fear: ["scared", "afraid", "fear", "frightened", "terrified", "panic", "following"],
  sadness: ["sad", "lonely", "unhappy", "crying", "down", "gloomy"],
  depression: ["depress", "hopeless", "worthless", "empty", "lost interest"],
  anxiety: ["anxious", "anxiety", "nervous", "worried", "tense", "overthinking"],
  stress: ["stress", "overwhelmed", "pressure", "busy", "tired", "burnout"],
  suicidal_thoughts: ["suicide", "suicidal", "die", "kill myself", "end it all", "no reason to live"],
  thanks: ["thank", "thanks", "thank you", "thx", "thank u"],
};

const INTENT_RESPONSES = {
  greeting: "Hello! I am here to support you. Please tell me what is happening.",
  physical_abuse:
    "Physical violence is serious. Please reach out to a trusted person or contact emergency support immediately. I also strongly suggest consulting a doctor or a professional counsellor for further support.",
  sexual_abuse:
    "This is not your fault. Please speak to a trusted adult or contact Childline 1098. I also strongly suggest consulting a doctor or a professional counsellor for further support.",
  mental_abuse:
    "Mental or emotional abuse can be very harmful. Consider speaking to a counsellor, therapist, or trusted adult for support.",
  fear: "If you feel unsafe, please move to a safe place and contact help immediately.",
  sadness: "You are not alone. Talking to a counsellor or trusted person can help.",
  depression:
    "It sounds like you might be feeling depressed. It is important to talk to a mental health professional, counsellor, or therapist. You deserve help and support.",
  anxiety:
    "Feeling anxious can be overwhelming. A trained therapist or counsellor can help you manage anxiety effectively.",
  stress:
    "Stress can affect both mind and body. Consider consulting a mental health professional for coping strategies.",
  suicidal_thoughts:
    "I am really concerned about your safety. Please contact a crisis helpline immediately: call or text 181 or reach out to local emergency services.",
  thanks: "You are welcome. I am always here to support you whenever you need.",
  unknown: "I am here to listen. Can you explain more about your situation?",
};

const INTENT_PRIORITY = [
  "suicidal_thoughts",
  "sexual_abuse",
  "physical_abuse",
  "fear",
  "depression",
  "anxiety",
  "stress",
  "mental_abuse",
  "sadness",
  "thanks",
  "greeting",
  "unknown",
];

const INTENT_INSIGHTS = {
  greeting: { severity: "low", suggestion: "Share what happened so I can help." },
  physical_abuse: {
    severity: "high",
    suggestion: "Reach out to emergency support, a doctor, or a counsellor.",
  },
  sexual_abuse: {
    severity: "high",
    suggestion: "Talk to a trusted adult, Childline 1098, or a doctor immediately.",
  },
  mental_abuse: {
    severity: "medium",
    suggestion: "Speak with a counsellor, therapist, or trusted adult.",
  },
  fear: {
    severity: "high",
    suggestion: "Move to a safe place and contact help right away.",
  },
  sadness: {
    severity: "medium",
    suggestion: "Talk to a counsellor or someone you trust.",
  },
  depression: {
    severity: "medium",
    suggestion: "Consult a mental health professional or counsellor.",
  },
  anxiety: {
    severity: "medium",
    suggestion: "A counsellor or therapist can help you manage this.",
  },
  stress: {
    severity: "medium",
    suggestion: "Use coping support and consider professional help.",
  },
  suicidal_thoughts: {
    severity: "emergency",
    suggestion: "Contact emergency services or a crisis helpline immediately.",
  },
  thanks: { severity: "low", suggestion: "You can continue chatting whenever you need support." },
  unknown: {
    severity: "low",
    suggestion: "Share more details so I can guide you better.",
  },
};

const getDetectedIntents = (message) => {
  const normalizedMessage = message.toLowerCase();
  const detectedIntents = Object.entries(INTENT_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => normalizedMessage.includes(keyword)))
    .map(([intent]) => intent);

  return detectedIntents.length > 0 ? detectedIntents : ["unknown"];
};

const getPrimaryIntent = (intents) =>
  INTENT_PRIORITY.find(intent => intents.includes(intent)) || "unknown";

const buildLocalAiResponse = (message) => {
  const intents = getDetectedIntents(message);
  const primaryIntent = getPrimaryIntent(intents);
  const reply = intents
    .map(intent => INTENT_RESPONSES[intent] || INTENT_RESPONSES.unknown)
    .join(" ");

  const insight = INTENT_INSIGHTS[primaryIntent] || INTENT_INSIGHTS.unknown;

  return {
    response: reply,
    category: primaryIntent,
    severity: insight.severity,
    suggestion: insight.suggestion,
  };
};

const normalizeAiResponse = (payload, fallbackMessage) => {
  const localAi = buildLocalAiResponse(fallbackMessage);

  if (!payload || typeof payload !== "object") {
    return localAi;
  }

  const responseText =
    typeof payload.response === "string" && payload.response.trim()
      ? payload.response.trim()
      : typeof payload.reply === "string" && payload.reply.trim()
        ? payload.reply.trim()
        : localAi.response;

  if (BACKEND_FALLBACK_RESPONSES.has(responseText)) {
    return localAi;
  }

  return {
    response: responseText,
    category: payload.category || localAi.category,
    severity: payload.severity || localAi.severity,
    suggestion: payload.suggestion || localAi.suggestion,
  };
};

const getStoredUserId = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (storedUser) {
      if (typeof storedUser.id === "string") {
        return storedUser.id;
      }

      const resolvedId = storedUser.id?.$oid || storedUser._id || null;
      if (resolvedId) {
        return resolvedId;
      }
    }

    const tokenPayload = parseJwtPayload(localStorage.getItem("token") || "");
    return tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId || null;
  } catch {
    const tokenPayload = parseJwtPayload(localStorage.getItem("token") || "");
    return tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId || null;
  }
};

const getStoredUserRole = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (storedUser?.role) {
      return storedUser.role;
    }

    const tokenPayload = parseJwtPayload(localStorage.getItem("token") || "");
    return tokenPayload?.role || "";
  } catch {
    const tokenPayload = parseJwtPayload(localStorage.getItem("token") || "");
    return tokenPayload?.role || "";
  }
};

const SupportChat = () => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello 👋 I'm your SafeConnect support assistant. How can I help you today?",
      time: getCurrentTime(),
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  const bottomRef = useRef(null);

  function getCurrentTime() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || thinking) return;

    const currentUserId = getStoredUserId();
    const currentUserRole = getStoredUserRole();

    const userMessage = {
      sender: "user",
      text: trimmedInput,
      time: getCurrentTime(),
    };

    const updatedMessages = [...messages, userMessage];
    const localAiFallback = buildLocalAiResponse(trimmedInput);
    setMessages(updatedMessages);
    setInput("");
    setThinking(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserRole === "user" ? currentUserId : null,
          messages: updatedMessages.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiPayload = normalizeAiResponse(data, trimmedInput);

      setMessages(prev => [
        ...prev,
        {
          sender: "bot",
          text: aiPayload.response,
          time: getCurrentTime(),
        },
      ]);

      setAiInsight({
        severity: aiPayload.severity,
        action: aiPayload.suggestion,
      });

      if (aiPayload.severity === "emergency") {
        window.alert("Please contact emergency services immediately.");
      }

    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: "bot",
          text: localAiFallback.response,
          time: getCurrentTime(),
        },
      ]);

      setAiInsight({
        severity: localAiFallback.severity,
        action: localAiFallback.suggestion,
      });

      if (localAiFallback.severity === "emergency") {
        window.alert("Please contact emergency services immediately.");
      }
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Support Chat</h2>
        <span className="chat-status">● Online</span>
      </div>

      {aiInsight && (
        <div className={`ai-banner severity-${aiInsight.severity}`}>
          <strong>Recommended:</strong> {aiInsight.action}
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble ${msg.sender}`}
          >
            <p>{msg.text}</p>
            <span className="chat-time">{msg.time}</span>
          </div>
        ))}

        {thinking && (
          <div className="chat-bubble bot">
            <p>Typing...</p>
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      <div className="chat-input-area">
        <input
          value={input}
          disabled={thinking}
          placeholder="Type your message..."
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={thinking}>
          Send
        </button>
      </div>
    </div>
  );
};

export default SupportChat;
