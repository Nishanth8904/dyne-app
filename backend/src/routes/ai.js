const express = require("express");
const axios = require("axios");
const db = require("../db");

const router = express.Router();

// Detect Tamil script
function hasTamil(text = "") {
  return /[\u0B80-\u0BFF]/.test(text);
}

// Remove Tamil + non-English characters
function enforceEnglish(text = "") {
  let cleaned = text;

  cleaned = cleaned.replace(/[\u0B80-\u0BFF]+/g, " "); // remove Tamil letters
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, " ");    // remove emojis etc
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();  // clean spaces

  // Keep only 4 sentences
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 4).join(" ");
}

// Load database into AI-readable summary
async function buildDatabaseSummary() {
  const [rows] = await db.query(`
    SELECT 
      r.name, r.area, r.cuisine, r.rating,
      GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') AS dishes
    FROM restaurants r
    LEFT JOIN restaurant_dishes rd ON rd.restaurant_id = r.id
    LEFT JOIN dishes d ON d.id = rd.dish_id
    GROUP BY r.id
  `);

  const summary = rows.map(r =>
    `Name: ${r.name} | Area: ${r.area || "Coimbatore"} | Cuisine: ${r.cuisine || "N/A"} | Rating: ${r.rating || "N/A"} | Dishes: ${r.dishes || "Not listed"}`
  ).join("\n");

  return { rows, summary };
}

// MAIN ENDPOINT
router.post("/assistant", async (req, res) => {
  let { message } = req.body || {};
  if (!message || !message.trim()) {
    return res.json({
      reply: "Tell me what you feel like eating, for example: 'cheesy food near Gandhipuram' or 'cheap biryani in RS Puram'."
    });
  }

  try {
    const { rows, summary } = await buildDatabaseSummary();

    if (!rows.length) {
      return res.json({ reply: "No restaurants found in Dyne yet." });
    }

    // ✅ Mistral API call
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content:
`You are Dyne AI, a restaurant recommendation assistant.

RULES:
- Reply ONLY in clean English.
- Never use Tamil, Tanglish, or Indian slang.
- ONLY recommend restaurants present in the database.
- Mention exact dish names from database when possible.



DATABASE:
${summary}`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.2
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "SmartDine"
        }
      }
    );

    let reply = response.data.choices[0].message.content || "";

    // Force English
    reply = enforceEnglish(reply);

    // Broke? Use fallback
    if (hasTamil(reply) || reply.length < 20) {
      const top = rows.slice(0, 3).map(r => `${r.name} (${r.cuisine})`).join(", ");
      reply = `Here are some popular restaurants in Coimbatore from Dyne: ${top}.`;
    }

    res.json({ reply });

  } catch (err) {
    console.error("Mistral Error:", err.response?.data || err.message);

    res.json({
      reply: "I could not reach Dyne AI right now. Please try again."
    });
  }
});
// Surprise recommendation – used by "Surprise Me" button in Ask Dyne
router.get("/assistant/surprise", async (req, res) => {
  try {
    // Pick from the top-rated restaurants, then choose one at random
    const [rows] = await db.query(
      `SELECT *
       FROM restaurants
       WHERE rating IS NOT NULL
       ORDER BY rating DESC
       LIMIT 15`
    );

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No restaurants available for surprise." });
    }

    const random = rows[Math.floor(Math.random() * rows.length)];

    const suggestion = {
      name: random.name,
      area: random.area,
      rating: random.rating !== null ? Number(random.rating) : null,
      cuisine: random.cuisine,
      reason: `${random.name} in ${random.area} is a great surprise pick with rating ${
        random.rating ?? "N/A"
      }.`,
    };

    return res.json({ suggestion });
  } catch (err) {
    console.error("Surprise assistant error", err);
    return res.status(500).json({ error: "Surprise suggestion failed" });
  }
});

module.exports = router;