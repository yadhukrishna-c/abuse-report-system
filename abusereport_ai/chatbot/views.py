from django.shortcuts import render
from django.http import JsonResponse

# Define keywords for each intent
intents_keywords = {
    "greeting": ["hi", "hello", "hey", "good morning", "good evening"],
    "physical_abuse": ["hit", "beat", "assault", "violence", "punch", "hurt physically"],
    "sexual_abuse": ["sexual", "molest", "harass", "rape", "touch me","pinch" ,"assaulted sexually"],
    "mental_abuse": ["abuse", "manipulate", "control", "criticize", "humiliate", "mock"],
    "fear": ["scared", "afraid", "fear", "frightened", "terrified", "panic","following"],
    "sadness": ["sad", "lonely", "unhappy", "crying", "down", "gloomy"],
    "depression": ["depress", "hopeless", "worthless", "down", "empty", "lost interest"],
    "anxiety": ["anxious","anxiety", "nervous", "worried", "panic", "tense", "overthinking"],
    "stress": ["stress", "overwhelmed", "pressure", "busy", "tired", "burnout"],
    "suicidal_thoughts": ["suicide","suicidal", "die", "kill myself", "end it all", "no reason to live"],
    "thanks": ["thank", "thanks", "thank you", "thx", "thank u"]
}

# Define responses for each intent
responses = {
    "greeting": "Hello! I am here to support you. Please tell me what is happening.",
    "physical_abuse": "Physical violence is serious. Please reach out to a trusted person or contact emergency support immediately.I also strongly suggest consulting a doctor or a professional counselor for further support.",
    "sexual_abuse": "This is not your fault. Please speak to a trusted adult or contact Childline 1098.I also strongly suggest consulting a doctor or a professional counselor for further support.",
    "mental_abuse": "Mental or emotional abuse can be very harmful. Consider speaking to a counselor, therapist, or trusted adult for support.",
    "fear": "If you feel unsafe, please move to a safe place and contact help immediately.",
    "sadness": "You are not alone. Talking to a counselor or trusted person can help.",
    "depression": "It sounds like you might be feeling depressed. It’s important to talk to a mental health professional, counselor, or therapist. You deserve help and support.",
    "anxiety": "Feeling anxious can be overwhelming. A trained therapist or counselor can help you manage anxiety effectively.",
    "stress": "Stress can affect both mind and body. Consider consulting a mental health professional for coping strategies.",
    "suicidal_thoughts": "I’m really concerned about your safety. Please contact a crisis helpline immediately: Call or text 181 (Woman and Child Care) or reach out to local emergency services.",
    "thanks":"You’re welcome! I’m always here to support you whenever you need."
}

intent_priority = [
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
]

intent_insights = {
    "greeting": {
        "severity": "low",
        "suggestion": "Share what happened so I can help."
    },
    "physical_abuse": {
        "severity": "high",
        "suggestion": "Reach out to emergency support, a doctor, or a counsellor."
    },
    "sexual_abuse": {
        "severity": "high",
        "suggestion": "Talk to a trusted adult, Childline 1098, or a doctor immediately."
    },
    "mental_abuse": {
        "severity": "medium",
        "suggestion": "Speak with a counsellor, therapist, or trusted adult."
    },
    "fear": {
        "severity": "high",
        "suggestion": "Move to a safe place and contact help right away."
    },
    "sadness": {
        "severity": "medium",
        "suggestion": "Talk to a counsellor or someone you trust."
    },
    "depression": {
        "severity": "medium",
        "suggestion": "Consult a mental health professional or counsellor."
    },
    "anxiety": {
        "severity": "medium",
        "suggestion": "A counsellor or therapist can help you manage this."
    },
    "stress": {
        "severity": "medium",
        "suggestion": "Use coping support and consider professional help."
    },
    "suicidal_thoughts": {
        "severity": "emergency",
        "suggestion": "Contact emergency services or a crisis helpline immediately."
    },
    "thanks": {
        "severity": "low",
        "suggestion": "You can continue chatting whenever you need support."
    },
    "unknown": {
        "severity": "low",
        "suggestion": "Share more details so I can guide you better."
    },
}


# Predict multiple intents from message
def predict_intent(message):
    message = message.lower()
    detected_intents = []

    for intent, keywords in intents_keywords.items():
        if any(word in message for word in keywords):
            detected_intents.append(intent)

    # If nothing matched, return unknown
    if not detected_intents:
        detected_intents.append("unknown")
    return detected_intents


def get_primary_intent(intents):
    for intent in intent_priority:
        if intent in intents:
            return intent
    return "unknown"

# Render chatbot page
def chatbot(request):
    return render(request, "chatbot.html")

# Handle AJAX messages from the user
def get_response(request):
    message = request.GET.get("msg", "").lower()
    
    # Get list of detected intents
    intents = predict_intent(message)
    primary_intent = get_primary_intent(intents)
    insight = intent_insights.get(primary_intent, intent_insights["unknown"])

    # Build combined reply
    reply_list = []
    for intent in intents:
        if intent == "unknown":
            reply_list.append("I’m here to listen. Can you explain more about your situation?")
        else:
            reply_list.append(responses[intent])
    
    # Join all responses into one string
    reply = " ".join(reply_list)

    return JsonResponse({
        "reply": reply,
        "category": primary_intent,
        "severity": insight["severity"],
        "suggestion": insight["suggestion"],
    })
