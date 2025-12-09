require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const userDb = require("./dbUsers");
const adminDb = require("./dbAdmin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const JWT_SECRET = "smartdine_super_secret_key";

// ✅ middlewares FIRST
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json()); // 👈 MUST be before routers

// ✅ then AI router
const aiRouter = require("./routes/ai");
app.use("/api/ai", aiRouter);

// Admin auth middleware
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Admin token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Not an admin' });
    }
    req.adminId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
}

// --------------------- SMALL NLP HELPERS ---------------------

// normalize English + Tamil text
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    // keep Tamil block \u0B80-\u0BFF and basic latin letters/numbers
    .replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, ' ');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean);
}

// Concept dictionary – ONE place where we define the "meaning" words
const CONCEPT_KEYWORDS = {
  budget: ['cheap', 'budget', 'low', 'low-cost', 'economy', 'மலிவு', 'குறைவு', 'செலவுக்'],
  spicy: ['spicy', 'hot', 'chilli', 'chilly', 'காரம்', 'கரம்'],
  biryani: ['biryani', 'biriyani', 'briyani', 'briyan', 'பிரியாணி'],
  dessert: ['dessert', 'sweet', 'icecream', 'ice-cream', 'ice cream', 'இனிப்பு', 'ஐஸ்'],
  veg: ['veg', 'vegetarian', 'pureveg', 'pure-veg', 'சைவ'],
  light: ['light', 'simple', 'not heavy', 'லைட்', 'லேசா'],
  heavy: ['heavy', 'full', 'filling'],
  hangout: ['friends', 'hangout', 'party', 'chill', 'meetup'],
  family: ['family', 'kids', 'children'],
  lateNight: ['late', 'night', 'midnight', 'late-night', 'இரவு'],
  comfort: ['comfort', 'feel good', 'sad', 'tired', 'stress', 'கம்ஃபர்ட்', 'ஆறுதல்'],
};

// extract conceptual preferences from any text
function extractConceptsFromText(text) {
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  const concepts = new Set();

  Object.entries(CONCEPT_KEYWORDS).forEach(([concept, words]) => {
    for (const w of words) {
      if (tokenSet.has(w)) {
        concepts.add(concept);
        break;
      }
    }
  });

  return concepts;
}

// build a big text blob for a restaurant
function restaurantTextBlob(r) {
  return [r.name, r.cuisine, r.area, r.description, r.review_snippet, r.tags].join(' ');
}

// extract concepts from restaurant fields (tags + cuisine + description)
function extractConceptsFromRestaurant(r) {
  const text = restaurantTextBlob(r);
  return extractConceptsFromText(text);
}

// compute a score for how well a restaurant matches the user query
function scoreRestaurantAgainstQuery(r, queryTokens, queryConcepts) {
  const restBlob = restaurantTextBlob(r);
  const restTokens = tokenize(restBlob);
  const restTokenSet = new Set(restTokens);
  const restConcepts = extractConceptsFromRestaurant(r);

  let score = 0;

  // 1) direct token overlap
  const uniqueQueryTokens = Array.from(new Set(queryTokens));
  let overlapCount = 0;
  uniqueQueryTokens.forEach(t => {
    if (restTokenSet.has(t)) overlapCount += 1;
  });
  score += overlapCount * 2;

  // 2) concept overlap
  queryConcepts.forEach(concept => {
    if (restConcepts.has(concept)) {
      if (concept === 'biryani' || concept === 'dessert' || concept === 'comfort') {
        score += 5;
      } else {
        score += 3;
      }
    }
  });

  // 3) rating bonus
  const rating = Number(r.rating) || 0;
  score += rating * 0.4;

  return score;
}

// --------------------- HEALTH ---------------------

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --------------------- AUTH: REGISTER ---------------------
// User register (with name + age)
app.post('/api/auth/user/register', async (req, res) => {
  console.log('REGISTER BODY:', req.body);   // 🔍 debug log

  const { name, age, email, password } = req.body || {};

  // validation
  if (!name || !email || !password || age == null) {
    return res
      .status(400)
      .json({ error: 'Name, age, email and password required' });
  }

  const ageNumber = Number(age);
  if (Number.isNaN(ageNumber) || ageNumber <= 0) {
    return res.status(400).json({ error: 'Invalid age' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // ✅ age is explicitly inserted here
    await userDb.query(
      'INSERT INTO users (name, age, email, password_hash) VALUES (?, ?, ?, ?)',
      [name, ageNumber, email, hash]
    );

    return res.status(201).json({ message: 'User registered' });
  } catch (err) {
    console.error('User register error', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'User already exists', code: err.code });
    }

    return res.status(500).json({
      error: 'Registration failed',
      code: err.code,
      message: err.message,
    });
  }
});
// Admin register (with name)
app.post('/api/auth/admin/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    await adminDb.query('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', [
      name,
      email,
      hash,
    ]);

    res.status(201).json({ message: 'Admin registered' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Admin already exists' });
    }
    console.error('Admin register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --------------------- AUTH: LOGIN ---------------------

// User login
app.post('/api/auth/user/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const [rows] = await userDb.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const payload = {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,      // ✅ AGE HERE
      },
    };

    console.log('LOGIN RESPONSE BODY:', payload); // 🔍 debug

    res.json(payload);
  } catch (err) {
    console.error('User login error', err);
    res.status(500).json({ error: 'User login failed' });
  }
});

// Admin login
app.post('/api/auth/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const [rows] = await adminDb.query('SELECT * FROM admins WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '2h' },
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (err) {
    console.error('Admin login error', err);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// --------------------- RESTAURANTS API ---------------------

// List restaurants with filters
app.get('/api/restaurants', async (req, res) => {
  const { area, cuisine, maxPriceLevel, minRating } = req.query;

  let sql = 'SELECT * FROM restaurants WHERE 1=1';
  const params = [];

  if (area) {
    sql += ' AND area = ?';
    params.push(area);
  }

  if (cuisine) {
    sql += ' AND cuisine LIKE ?';
    params.push(`%${cuisine}%`);
  }

  if (maxPriceLevel) {
    sql += ' AND price_level <= ?';
    params.push(Number(maxPriceLevel));
  }

  if (minRating) {
    sql += ' AND rating >= ?';
    params.push(Number(minRating));
  }

  try {
    const [rows] = await db.query(sql, params);
    const result = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      cuisine: r.cuisine,
      priceLevel: r.price_level,
      avgCostForTwo: r.avg_cost_for_two,
      area: r.area,
      landmark: r.landmark,
      rating: r.rating !== null ? Number(r.rating) : null,
      reviewSnippet: r.review_snippet,
      tags: r.tags ? r.tags.split(',') : [],
      isPureVeg: Boolean(r.is_pure_veg),
      opensAt: r.opens_at,
      closesAt: r.closes_at,
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching restaurants', err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Single restaurant
app.get('/api/restaurants/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM restaurants WHERE id = ?', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }
    const r = rows[0];
    const restaurant = {
      id: r.id,
      name: r.name,
      description: r.description,
      cuisine: r.cuisine,
      priceLevel: r.price_level,
      avgCostForTwo: r.avg_cost_for_two,
      area: r.area,
      landmark: r.landmark,
      rating: r.rating !== null ? Number(r.rating) : null,
      reviewSnippet: r.review_snippet,
      tags: r.tags ? r.tags.split(',') : [],
      isPureVeg: Boolean(r.is_pure_veg),
      opensAt: r.opens_at,
      closesAt: r.closes_at,
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
    };
    res.json(restaurant);
  } catch (err) {
    console.error('Error fetching restaurant', err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// --------------------- AI ASSISTANT (English-only) ---------------------

app.post('/api/assistant/query', async (req, res) => {
  const { message } = req.body;
  const text = message || '';

  const queryTokens = tokenize(text);
  const queryConcepts = extractConceptsFromText(text);

  try {
    const [rows] = await db.query('SELECT * FROM restaurants');

    const scored = rows.map((r) => ({
      r,
      score: scoreRestaurantAgainstQuery(r, queryTokens, queryConcepts),
    }));

    const positive = scored.filter((x) => x.score > 0);

    let finalList;

    // NO MATCH → FALLBACK (English-only)
    if (positive.length === 0) {
      finalList = rows
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

      return res.json({
        explanation: "We couldn't find an exact match. Here are some popular places:",
        suggestions: finalList.map((r) => ({
          name: r.name,
          area: r.area,
          rating: r.rating,
          cuisine: r.cuisine,
          reason: `${r.name} in ${r.area} is a popular choice among students.`,
        })),
      });
    }

    // WE HAVE MATCHES (English-only)
    finalList = positive
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.r);

    return res.json({
      explanation: `Based on "${message}", here are some great matches:`,
      suggestions: finalList.map((r) => ({
        name: r.name,
        area: r.area,
        rating: r.rating,
        cuisine: r.cuisine,
        reason: `${r.name} in ${r.area} serves ${r.cuisine} cuisine and matches your preferences well.`,
      })),
    });
  } catch (err) {
    console.error('Assistant error', err);
    res.status(500).json({ error: 'Assistant unavailable' });
  }
});

// --------------------- DISHES PUBLIC API ---------------------

// List all dishes with optional restaurant names
app.get('/api/dishes', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         d.id,
         d.name,
         d.description,
         d.tags,
         d.base_price,
         GROUP_CONCAT(r.name SEPARATOR ', ') AS restaurants
       FROM dishes d
       LEFT JOIN restaurant_dishes rd ON rd.dish_id = d.id
       LEFT JOIN restaurants r ON r.id = rd.restaurant_id
       GROUP BY d.id
       ORDER BY d.id DESC`
    );

    const result = rows.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      tags: d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      basePrice: d.base_price !== null ? Number(d.base_price) : null,
      restaurants: d.restaurants || '',
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching dishes', err);
    res.status(500).json({ error: 'Failed to fetch dishes' });
  }
});

// --------------------- ADMIN ENDPOINTS ---------------------

// Add restaurant (admin only)
app.post('/api/admin/restaurants', requireAdmin, async (req, res) => {
  const {
    name,
    description,
    cuisine,
    priceLevel,
    avgCostForTwo,
    area,
    landmark,
    rating,
    tags,
    isPureVeg,
    opensAt,
    closesAt,
    latitude,
    longitude,
  } = req.body || {};

  if (!name || !cuisine || !area) {
    return res
      .status(400)
      .json({ error: 'Name, cuisine and area are required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO restaurants
        (name, description, cuisine, price_level, avg_cost_for_two,
         area, landmark, rating, review_snippet, tags,
         is_pure_veg, opens_at, closes_at, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        cuisine,
        priceLevel || 2,
        avgCostForTwo || 400,
        area,
        landmark || '',
        rating ?? null,
        '',
        Array.isArray(tags) ? tags.join(',') : tags || '',
        isPureVeg ? 1 : 0,
        opensAt || '11:00:00',
        closesAt || '22:30:00',
        latitude ?? null,
        longitude ?? null,
      ],
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Admin add restaurant error', err);
    res.status(500).json({ error: 'Could not add restaurant' });
  }
});

// Add dish and link to restaurants (admin only)
app.post('/api/admin/dishes', requireAdmin, async (req, res) => {
  const { name, description, tags, basePrice, restaurantIds } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Dish name is required' });
  }

  try {
    const [dishResult] = await db.query(
      `INSERT INTO dishes (name, description, tags, base_price)
       VALUES (?, ?, ?, ?)`,
      [
        name,
        description || '',
        Array.isArray(tags) ? tags.join(',') : tags || '',
        basePrice || null,
      ],
    );

    const dishId = dishResult.insertId;

    if (Array.isArray(restaurantIds) && restaurantIds.length > 0) {
      const values = restaurantIds.map(rid => [rid, dishId]);
      await db.query(
        'INSERT INTO restaurant_dishes (restaurant_id, dish_id) VALUES ?',
        [values],
      );
    }

    res.status(201).json({ id: dishId });
  } catch (err) {
    console.error('Admin add dish error', err);
    res.status(500).json({ error: 'Could not add dish' });
  }
});
// ========= TEST + SURPRISE ROUTES (keep near the bottom) =========

// Simple test route to confirm this server.js is the file that is running
app.get('/__test', (req, res) => {
  res.json({ ok: true, message: 'server.js is the one running' });
});

// Surprise recommendation – used by "Surprise Me" button
async function surpriseHandler(req, res) {
  try {
    console.log('🔥 Surprise handler hit');

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
        .json({ error: 'No restaurants available for surprise.' });
    }

    const random = rows[Math.floor(Math.random() * rows.length)];

    const suggestion = {
      name: random.name,
      area: random.area,
      rating:
        random.rating !== null ? Number(random.rating) : null,
      cuisine: random.cuisine,
      reason: `${random.name} in ${random.area} is a great surprise pick with rating ${
        random.rating ?? 'N/A'
      }.`,
    };

    return res.json({ suggestion });
  } catch (err) {
    console.error('Surprise assistant error', err);
    return res
      .status(500)
      .json({ error: 'Surprise suggestion failed' });
  }
}

// support both paths, just in case
app.get('/api/assistant/surprise', surpriseHandler);
app.get('/api/ai/assistant/surprise', surpriseHandler);

// ==========================================================

// --------------------- START SERVER ---------------------

app.listen(PORT, () => {
  console.log(`SmartDine backend running on http://localhost:${PORT}`);
});