import { useEffect, useState } from "react";
import styles from "./AiRecommendations.module.css";

const AI_BASE = "http://localhost:8001";

function AiRecommendations({ currentUser }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [location, setLocation] = useState("Gandhipuram");
  const [cuisine, setCuisine] = useState("");
  const [price, setPrice] = useState("");
  const [ambience, setAmbience] = useState("");

  useEffect(() => {
    if (!currentUser?.age) return;

    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      age: currentUser.age,
      location,
      cuisine,
      price,
      ambience,
    });

    fetch(`${AI_BASE}/recommendations?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("AI server error");
        return res.json();
      })
      .then((data) => setRecs(data.recommendations || []))
      .catch(() => setError("AI engine unavailable"))
      .finally(() => setLoading(false));
  }, [currentUser, location, cuisine, price, ambience]);

  /* ================= PRE-LOGIN PREVIEW ================= */
  if (!currentUser) {
    return (
      <section className={styles.previewCard}>
        <h3 className={styles.previewTitle}>DYNE SmartDine AI</h3>

        <p className={styles.previewText}>
          DYNE uses <strong>machine learning</strong> to understand food habits
          and recommend the <strong>right restaurant</strong> for every user.
        </p>

        <ul className={styles.previewList}>
          <li>Learns from age & eating patterns</li>
          <li>Understands budget sensitivity</li>
          <li>Matches cuisine & ambience</li>
          <li>Adapts to time & food trends</li>
          <li>Uses Coimbatore-specific data</li>
        </ul>

        <div className={styles.previewHighlight}>
          This is <strong>not just filters</strong> — the AI ranks restaurants
          differently for different people.
        </div>

        <div className={styles.previewFooter}>
          🔒 Login to unlock personalized AI recommendations
        </div>
      </section>
    );
  }

  /* ================= LOGGED-IN AI ================= */
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>🤖 DYNE AI Food Assistant</h3>

      {/* Filters */}
      <div className={styles.filters}>
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option>Gandhipuram</option>
          <option>RS Puram</option>
          <option>Peelamedu</option>
          <option>Saravanampatti</option>
          <option>Singanallur</option>
        </select>

        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
          <option value="">Any Cuisine</option>
          <option>South Indian</option>
          <option>North Indian</option>
          <option>Biryani</option>
          <option>Chinese</option>
          <option>Fast Food</option>
        </select>

        <select value={price} onChange={(e) => setPrice(e.target.value)}>
          <option value="">Any Budget</option>
          <option value="$">Budget</option>
          <option value="$$">Moderate</option>
          <option value="$$$">Premium</option>
        </select>

        <select value={ambience} onChange={(e) => setAmbience(e.target.value)}>
          <option value="">Any Ambience</option>
          <option>Casual</option>
          <option>Family-style</option>
          <option>Modern</option>
          <option>Luxury</option>
        </select>
      </div>

      {loading && <p className={styles.loading}>AI is thinking…</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {recs.map((r, i) => (
          <div key={i} className={styles.cardItem}>
            <h4>{r.restaurant}</h4>

            <p className={styles.meta}>
              📍 {r.location} • 🍽️ {r.cuisine}
            </p>

            <p className={styles.rating}>
              ⭐ {r.rating} • 🤖 {r.ai_score}
            </p>

            <p className={styles.price}>
              💰 {r.price_range} • ₹{r.avg_cost_for_two}
            </p>

            <p className={styles.dishes}>🍛 {r.popular_dishes}</p>
            <p className={styles.address}>📍 {r.address}</p>
            <p className={styles.hours}>⏰ {r.opening_hours}</p>
            <p className={styles.contact}>☎ {r.contact}</p>
          </div>
        ))}
      </div>

      {!loading && recs.length === 0 && (
        <p className={styles.empty}>No AI recommendations found</p>
      )}
    </section>
  );
}

export default AiRecommendations;