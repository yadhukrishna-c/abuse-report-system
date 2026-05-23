const express = require("express");
const axios = require("axios");
const Notification = require("../models/Notification");
const User = require("../models/User");

const router = express.Router();
const AI_CHATBOT_URL = process.env.AI_CHATBOT_URL || "http://127.0.0.1:8000/get/";
const ADMIN_NOTIFICATION_SEVERITIES = new Set(["medium", "high", "emergency"]);
const NON_ALERT_CATEGORIES = new Set(["greeting", "thanks", "unknown", "general_support"]);

const INTENT_KEYWORDS = {
  greeting: ["hi", "hello", "hey", "good morning", "good evening"],
  physical_abuse: ["hit", "beat", "assault", "violence", "punch", "hurt physically"],
  sexual_abuse: ["sexual", "molest", "harass", "rape", "touch me", "pinch", "assaulted sexually"],
  mental_abuse: ["abuse", "manipulate", "control", "criticize", "humiliate", "mock"],
  fear: ["scared", "afraid", "fear", "frightened", "terrified", "panic", "following"],
  sadness: ["sad", "lonely", "unhappy", "crying", "down", "gloomy"],
  depression: ["depress", "hopeless", "worthless", "down", "empty", "lost interest"],
  anxiety: ["anxious", "anxiety", "nervous", "worried", "panic", "tense", "overthinking"],
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
    "I am really concerned about your safety. Please contact a crisis helpline immediately: Call or text 181 or reach out to local emergency services.",
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
  greeting: {
    severity: "low",
    suggestion: "Share what happened so I can help.",
  },
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
  thanks: {
    severity: "low",
    suggestion: "You can continue chatting whenever you need support.",
  },
  unknown: {
    severity: "low",
    suggestion: "Share more details so I can guide you better.",
  },
};

const predictIntents = (message) => {
  const normalized = (message || "").toLowerCase();
  const detected = Object.entries(INTENT_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([intent]) => intent);

  return detected.length ? detected : ["unknown"];
};

const getPrimaryIntent = (intents) =>
  INTENT_PRIORITY.find((intent) => intents.includes(intent)) || "unknown";

const buildLocalAiPayload = (message) => {
  const intents = predictIntents(message);
  const primaryIntent = getPrimaryIntent(intents);
  const insight = INTENT_INSIGHTS[primaryIntent] || INTENT_INSIGHTS.unknown;

  const reply = intents
    .map((intent) => INTENT_RESPONSES[intent] || INTENT_RESPONSES.unknown)
    .join(" ");

  return {
    response: reply,
    category: primaryIntent,
    severity: insight.severity,
    suggestion: insight.suggestion,
  };
};

const shouldNotifyAdmins = (aiPayload) =>
  ADMIN_NOTIFICATION_SEVERITIES.has(aiPayload.severity) &&
  !NON_ALERT_CATEGORIES.has(aiPayload.category);

const notifyAdmins = async (userId, aiPayload) => {
  if (!userId || !shouldNotifyAdmins(aiPayload)) {
    return;
  }

  const [chattingUser, adminUsers] = await Promise.all([
    User.findById(userId).select("username email role"),
    User.find({ role: "admin" }).select("_id"),
  ]);

  if (!chattingUser || chattingUser.role !== "user" || adminUsers.length === 0) {
    return;
  }

  const adminNotifications = adminUsers.map((adminUser) => ({
    userId: adminUser._id,
    title: "Support Chat Recommendation",
    type: "GENERAL",
    audience: "admin",
    meta: {
      sourceType: "support_chat",
      sourceUserId: chattingUser._id.toString(),
      sourceUsername: chattingUser.username,
      sourceEmail: chattingUser.email,
      recommendation: aiPayload.suggestion,
      severity: aiPayload.severity,
    },
    message: [
      `Username: ${chattingUser.username}`,
      `Email: ${chattingUser.email}`,
      `Recommendation: ${aiPayload.suggestion}`,
      `Severity: ${aiPayload.severity}`,
    ].join("\n"),
  }));

  await Notification.insertMany(adminNotifications);
};

/**
 * POST /api/ai-chat
 */
router.post("/", async (req, res) => {
  try {
    const { messages, userId } = req.body;

    const lastUserMessage = [...messages]
      .reverse()
      .find(m => m.role === "user")?.content;

    if (!lastUserMessage) {
      return res.json({
        response: "Can you tell me more?",
        category: "general_support",
        severity: "low",
        suggestion: "counsellor",
      });
    }

    const localAiPayload = buildLocalAiPayload(lastUserMessage);

    const aiResponse = await axios.get(AI_CHATBOT_URL, {
      params: { msg: lastUserMessage },
    });

    const aiPayload = {
      response: aiResponse.data.reply || localAiPayload.response,
      category: aiResponse.data.category || localAiPayload.category,
      severity: aiResponse.data.severity || localAiPayload.severity,
      suggestion: aiResponse.data.suggestion || localAiPayload.suggestion,
    };

    try {
      await notifyAdmins(userId, aiPayload);
    } catch (notificationError) {
      console.error("AI Chat Notification Error:", notificationError.message);
    }

    res.json(aiPayload);

  } catch (err) {
    console.error("AI Chat Error:", err.message);
    const fallbackMessage = [...(req.body?.messages || [])]
      .reverse()
      .find((message) => message.role === "user")?.content || "";
    const fallbackPayload = buildLocalAiPayload(fallbackMessage);

    try {
      await notifyAdmins(req.body?.userId, fallbackPayload);
    } catch (notificationError) {
      console.error("AI Chat Notification Error:", notificationError.message);
    }

    res.json(fallbackPayload);
  }
});

module.exports = router;
