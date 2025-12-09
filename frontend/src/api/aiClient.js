// frontend/src/api/aiClient.js
const API_BASE = "http://localhost:3000";

// ---- 1) Old rule-based assistant (uses your DB) ----
export async function askSmartSuggestions(message) {
  const res = await fetch(`${API_BASE}/api/assistant/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Smart suggestions request failed");
  }

  // data = { explanation, suggestions: [...] }
  return data;
}

// ---- 2) Surprise endpoint (random restaurant) ----
export async function getSurprisePick() {
  const res = await fetch(`${API_BASE}/api/assistant/surprise`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Surprise request failed");
  }

  return data; // { name, message, area?, rating? }
}

// ---- 3) Groq AI chat endpoint ----
export async function askGroqAssistant(message, context) {
  const res = await fetch(`${API_BASE}/api/ai/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.details?.error?.message ||
        data.error ||
        "Groq assistant request failed"
    );
  }

  // data = { reply: "..." }
  return data.reply || "";
}