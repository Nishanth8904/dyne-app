const express = require("express");
const db = require("../db");

const router = express.Router();

/* ------------------ GEMINI AI FUNCTION ------------------ */
async function callGemini(userQuery, databaseInfo) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️ No Gemini API key found");
    return null;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    const prompt = `You are Dyne, a restaurant AI assistant.

DATABASE:
${databaseInfo}

USER: "${userQuery}"

Recommend 2-3 restaurants. Reply ONLY with valid JSON:
{
  "chat": "Try [Dish] at [Restaurant]! Here are X spots:",
  "recommendations": [
    {"id": 7, "reason": "Famous for: Seeraga Samba Biryani. Perfect for budget biryani!"}
  ]
}

Rules: Start "reason" with "Famous for: [dishes]". Use exact IDs from database.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
        })
      }
    );

    if (!response.ok) {
      console.error("❌ Gemini API error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return null;

    console.log("🤖 AI raw response:", text.substring(0, 200));

    // Clean and parse
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);

  } catch (err) {
    console.error("❌ Gemini error:", err.message);
    return null;
  }
}

/* ------------------ SMART MATCHING (FALLBACK) ------------------ */
function smartMatch(rows, query) {
  const q = query.toLowerCase();
  let matches = [];
  let chatMsg = "";

  console.log(`🔍 Matching: "${query}"`);

  // Biryani
  if (q.includes('biryani')) {
    matches = rows.filter(r => {
      const txt = `${r.name} ${r.cuisine} ${r.famous_dishes || ''}`.toLowerCase();
      return txt.includes('biryani');
    });
    
    if (q.includes('gandhipuram')) {
      matches = matches.filter(r => r.area?.toLowerCase().includes('gandhipuram'));
    }
    if (q.includes('cheap') || q.includes('budget')) {
      matches = matches.filter(r => r.price_level <= 2);
    }
    
    chatMsg = "Here are great biryani spots! 🍛";
  }
  // Cheap
  else if (q.includes('cheap') || q.includes('budget')) {
    matches = rows.filter(r => r.price_level <= 2);
    chatMsg = "Budget-friendly options! 💰";
  }
  // Veg
  else if (q.includes('veg')) {
    matches = rows.filter(r => {
      const txt = `${r.cuisine} ${r.tags || ''}`.toLowerCase();
      return txt.includes('veg');
    });
    chatMsg = "Vegetarian spots! 🥗";
  }
  // Dessert
  else if (q.includes('dessert') || q.includes('sweet')) {
    matches = rows.filter(r => {
      const txt = `${r.cuisine} ${r.tags || ''} ${r.famous_dishes || ''}`.toLowerCase();
      return txt.includes('dessert') || txt.includes('sweet') || txt.includes('ice');
    });
    chatMsg = "Sweet treats! 🍰";
  }
  // General
  else {
    matches = rows.filter(r => {
      const txt = `${r.name} ${r.cuisine} ${r.area} ${r.famous_dishes || ''}`.toLowerCase();
      return q.split(/\s+/).some(word => word.length > 2 && txt.includes(word));
    });
    chatMsg = "Here are some options! ✨";
  }

  // No matches = top rated
  if (matches.length === 0) {
    matches = rows.filter(r => r.rating).sort((a, b) => b.rating - a.rating);
    chatMsg = "Top-rated places! 🌟";
  } else {
    matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const top3 = matches.slice(0, 3);
  
  // Better chat message
  if (top3[0]?.famous_dishes) {
    const dish = top3[0].famous_dishes.split(',')[0].trim();
    chatMsg = `Try ${dish} at ${top3[0].name}! Here are ${top3.length} spots:`;
  }

  console.log(`✅ Found ${top3.length} matches`);

  return {
    chat: chatMsg,
    recommendations: top3.map(r => ({
      id: r.id,
      reason: r.famous_dishes 
        ? `Famous for: ${r.famous_dishes}. ${r.description || 'Great choice in ' + r.area}`
        : `Popular ${r.cuisine} in ${r.area}`
    }))
  };
}

/* ------------------ MAIN ENDPOINT ------------------ */
router.post("/assistant", async (req, res) => {
  try {
    console.log("\n🔥 NEW QUERY");
    
    const { message } = req.body || {};
    console.log("📝 Message:", message);

    if (!message?.trim()) {
      return res.json({
        reply: "Tell me what you're craving! 🍽️",
        restaurants: []
      });
    }

    // Get database
    let rows = [];
    try {
      const [result] = await db.query(`
        SELECT id, name, area, cuisine, rating, price_level,
               famous_dishes, tags, description, avg_cost_for_two,
               latitude, longitude
        FROM restaurants
        WHERE area IS NOT NULL
        LIMIT 50
      `);
      rows = result;
      console.log(`📊 Got ${rows.length} restaurants`);
    } catch (dbErr) {
      console.error("❌ Database error:", dbErr.message);
      return res.status(500).json({
        reply: "Database error 😅",
        restaurants: []
      });
    }

    if (rows.length === 0) {
      return res.json({
        reply: "No restaurants in database",
        restaurants: []
      });
    }

    // Build database summary
    const summary = rows.map(r =>
      `ID:${r.id}|${r.name}|${r.area}|${r.cuisine}|Rating:${r.rating || 'N/A'}|Famous:${r.famous_dishes || 'N/A'}|Price:₹${r.avg_cost_for_two || 300}`
    ).join("\n");

    // Try AI first
    let aiResult = null;
    if (process.env.GEMINI_API_KEY) {
      console.log("🤖 Calling Gemini AI...");
      aiResult = await callGemini(message, summary);
      
      if (aiResult) {
        console.log("✅ AI success");
      } else {
        console.log("⚠️ AI failed, using fallback");
      }
    } else {
      console.log("⚠️ No API key, using fallback");
    }

    // Use AI or fallback
    const result = aiResult || smartMatch(rows, message);

    // Map to full restaurant objects
    const restaurants = (result.recommendations || [])
      .map(rec => {
        const match = rows.find(r => r.id === rec.id);
        if (!match) {
          console.warn(`⚠️ Restaurant ID ${rec.id} not found`);
          return null;
        }

        return {
          id: match.id,
          name: match.name,
          area: match.area,
          cuisine: match.cuisine,
          rating: match.rating,
          famous_dishes: match.famous_dishes,
          avg_cost_for_two: match.avg_cost_for_two,
          latitude: match.latitude,
          longitude: match.longitude,
          reason: rec.reason || `Popular ${match.cuisine} in ${match.area}`
        };
      })
      .filter(Boolean);

    console.log(`📤 Returning ${restaurants.length} restaurants`);

    return res.json({
      reply: result.chat || "Here are some options!",
      restaurants: restaurants
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({
      reply: "Error: " + err.message,
      restaurants: []
    });
  }
});

/* ------------------ SURPRISE ------------------ */
router.get("/assistant/surprise", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM restaurants 
       WHERE rating IS NOT NULL 
       ORDER BY rating DESC LIMIT 15`
    );

    if (!rows?.length) {
      return res.json({ 
        suggestion: null,
        error: "No restaurants" 
      });
    }

    const r = rows[Math.floor(Math.random() * rows.length)];

    return res.json({
      suggestion: {
        id: r.id,
        name: r.name,
        area: r.area,
        rating: r.rating,
        cuisine: r.cuisine,
        famous_dishes: r.famous_dishes,
        avg_cost_for_two: r.avg_cost_for_two,
        latitude: r.latitude,
        longitude: r.longitude,
        reason: r.famous_dishes
          ? `🎁 Try ${r.famous_dishes.split(',')[0].trim()} at ${r.name}!`
          : `🎁 ${r.name} is a great pick!`
      }
    });
  } catch (err) {
    console.error("❌ Surprise error:", err);
    return res.json({ 
      suggestion: null,
      error: err.message 
    });
  }
});

module.exports = router;