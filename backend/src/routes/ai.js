const express = require("express");
const axios = require("axios");
const db = require("../db");

const router = express.Router();

// Load database into AI-readable summary
async function buildDatabaseSummary() {
  const [rows] = await db.query(`
    SELECT 
      r.id, r.name, r.area, r.cuisine, r.rating,
      GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') AS dishes
    FROM restaurants r
    LEFT JOIN restaurant_dishes rd ON rd.restaurant_id = r.id
    LEFT JOIN dishes d ON d.id = rd.dish_id
    GROUP BY r.id
  `);

  // We keep the ID in the mapping now so the AI can return it
  const summary = rows.map(r =>
    `ID: ${r.id} | Name: ${r.name} | Area: ${r.area || "Coimbatore"} | Cuisine: ${r.cuisine || "N/A"} | Rating: ${r.rating || "N/A"} | Dishes: ${r.dishes || "Not listed"}`
  ).join("\n");

  return { rows, summary };
}

// MAIN ENDPOINT
router.post("/assistant", async (req, res) => {
  let { message } = req.body || {};
  
  // Basic validation
  if (!message || !message.trim()) {
    return res.json({
      reply: "Tell me what you feel like eating! For example: 'cheesy food near Gandhipuram' or 'cheap biryani'.",
      restaurants: []
    });
  }

  try {
    const { rows, summary } = await buildDatabaseSummary();

    if (!rows.length) {
      return res.json({ reply: "No restaurants found in Dyne yet.", restaurants: [] });
    }

    // ✅ Mistral API call with JSON Schema Enforcement
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content:
`You are Dyne AI, a smart restaurant assistant.
DATA:
${summary}

INSTRUCTIONS:
1. Analyze the USER QUERY.
2. Pick the best matching restaurants from DATA.
3. You MUST return valid JSON only. Do not speak in plain text outside the JSON.
4. Output format:
{
  "chat": "A short, friendly sentence introducing the choices (in English).",
  "recommendations": [
    { "name": "Exact Name", "id": 123, "reason": "Why this matches" }
  ]
}
5.analyse user sentiment and if negative, suggest highly rated places.
`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.2, // Low temp for consistent JSON
        response_format: { type: "json_object" } // Hints to model to use JSON
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

    let rawContent = response.data.choices[0].message.content || "";

    // CLEANUP: Sometimes AI wraps JSON in markdown blocks like \`\`\`json ... \`\`\`
    // We remove them to ensure parsing works.
    rawContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsedResponse;
    try {
        parsedResponse = JSON.parse(rawContent);
    } catch (e) {
        console.error("AI JSON Parse Failed, falling back to raw text", rawContent);
        // Fallback if AI fails to give JSON
        parsedResponse = {
            chat: "Here are some places I found:",
            recommendations: []
        };
    }

    // Extract detailed object from DB based on AI's ID suggestions
    // This ensures the frontend gets clean DB data (image urls, ratings, coords) 
    // rather than AI-hallucinated details.
    const finalRecommendations = parsedResponse.recommendations.map(rec => {
        const dbMatch = rows.find(r => r.id == rec.id || r.name === rec.name);
        return dbMatch ? { ...dbMatch, reason: rec.reason } : null;
    }).filter(item => item !== null); // Remove nulls

    // Send structure back to Frontend
    res.json({
        reply: parsedResponse.chat, // The conversational part
        restaurants: finalRecommendations // The array for your UI Cards
    });

  } catch (err) {
    console.error("Mistral Error:", err.response?.data || err.message);
    res.json({
      reply: "I'm having trouble connecting to the brain. Try again in a moment.",
      restaurants: []
    });
  }
});

// Surprise recommendation
router.get("/assistant/surprise", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM restaurants WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 15`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No restaurants available." });
    }

    const random = rows[Math.floor(Math.random() * rows.length)];

    const suggestion = {
      name: random.name,
      area: random.area,
      rating: random.rating !== null ? Number(random.rating) : null,
      cuisine: random.cuisine,
      reason: `Surprise! ${random.name} in ${random.area} is a top pick.`,
    };

    return res.json({ suggestion });
  } catch (err) {
    console.error("Surprise assistant error", err);
    return res.status(500).json({ error: "Surprise suggestion failed" });
  }
});

module.exports = router;