
const API_BASE = "http://localhost:3000";

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


  return data;
}


export async function getSurprisePick() {
  const res = await fetch(`${API_BASE}/api/assistant/surprise`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Surprise request failed");
  }

  return data;
}


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

  return data.reply || "";
}