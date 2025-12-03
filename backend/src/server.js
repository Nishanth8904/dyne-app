// server.js
const express = require('express');
const cors = require('cors');
const db = require('./db');          // main SmartDine DB (restaurants, dishes, restaurant_dishes)
const userDb = require('./dbUsers'); // smartdine_users DB
const adminDb = require('./dbAdmin'); // smartdine_admin DB
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'smartdine_super_secret_key';

// --------------------- MIDDLEWARE ---------------------
app.use(
  cors({
    origin: 'http://localhost:5173', // your React dev URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Dyne backend running on port 3000');
});

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

// User register (with name)
app.post('/api/auth/user/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    await userDb.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
      name,
      email,
      hash,
    ]);

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
// User login
app.post('/api/auth/user/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const [rows] = await userDb.query('SELECT * FROM users WHERE email = ?', [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 👉 make sure name is inside the token + response
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,   // <— THIS
        role: 'user',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,   // <— AND THIS
      },
    });
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

// --------------------- AI ASSISTANT ---------------------

app.post('/api/assistant/query', async (req, res) => {
  const { message } = req.body;
  const text = message || '';

  const queryTokens = tokenize(text);
  const queryConcepts = extractConceptsFromText(text);

  try {
    const [rows] = await db.query('SELECT * FROM restaurants');

    // Score every restaurant against the user query
    const scored = rows.map(r => ({
      r,
      score: scoreRestaurantAgainstQuery(r, queryTokens, queryConcepts),
    }));

    const positive = scored.filter(x => x.score > 0);

    let finalList;

    if (positive.length === 0) {
      // fallback: top-rated
      finalList = rows
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

      return res.json({
        explanation:
          'கேட்ட மாதிரி நேரடியான இடம் கிடைக்கல. ஆனா உங்க அருகில இருக்க சில பிரபலமான இடங்கள் இதோ:',
        suggestions: finalList.map(r => ({
          name: r.name,
          area: r.area,
          rating: r.rating,
          reason: `${r.name} ${r.area} பகுதியில் பிரபலமான இடம்.`,
        })),
      });
    }

    // Sort by match score and take top 3
    finalList = positive
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.r);

    const tamilExplanation = `நீங்கள் கேட்டது: "${message}".
உங்கள் மனநிலையும் உணவு விருப்பத்தையும் பொருத்து சில நல்ல இடங்கள் இதோ:`;

    return res.json({
      explanation: tamilExplanation,
      suggestions: finalList.map(r => ({
        name: r.name,
        area: r.area,
        rating: r.rating,
        reason: `${r.name} ${r.area} பகுதியில் இருக்கும் ${r.cuisine} இடம். உங்க current mood & விருப்பத்துக்கு செம்ம match ஆகும்.`,
      })),
    });
  } catch (err) {
    console.error('Assistant error', err);
    res.status(500).json({ error: 'SmartDine AI error' });
  }
});

// Surprise me
// Surprise me – UNIFORM random from ALL restaurants
app.get('/api/assistant/surprise', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM restaurants'); // ⚠️ no LIMIT here

    console.log('Surprise pool size:', rows.length); // debug

    if (!rows || rows.length === 0) {
      return res.json({
        name: null,
        message: 'No restaurants found in the database.',
        cuisine: null,
        rating: null,
      });
    }

    // pure uniform random, every restaurant same chance
    const pick = rows[Math.floor(Math.random() * rows.length)];

    res.json({
      name: pick.name,
      message: `Surprise! இன்று ${pick.name} try பண்ணிக்கோங்க. ${pick.area} பகுதியில் ரொம்பப் பிரபலமா இருக்குது, rating ${pick.rating ?? 'N/A'}.`,
      cuisine: pick.cuisine,
      rating: pick.rating,
    });
  } catch (err) {
    console.error('Surprise error', err);
    res.status(500).json({ error: 'Surprise failed' });
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

// --------------------- START SERVER ---------------------

app.listen(PORT, () => {
  console.log(`SmartDine backend running on http://localhost:${PORT}`);
});