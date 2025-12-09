import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import styles from "./AiRecommendations.module.css";

const AI_BASE = "http://localhost:8001";

/* 🔹 Local food category map – this is the *truth* */
const FOOD_MAP = {
  salad: "Healthy",
  idli: "Vegetarian",
  dosa: "Vegetarian",
  biryani: "Non-Veg",
  chickenbiryani: "Non-Veg",
  muttonbiryani: "Non-Veg",
  burger: "Fast Food",
  pizza: "Fast Food",
  pasta: "Fast Food",
  shawarma: "Non-Veg",
  "vegmeals": "Vegetarian",
  "veg meals": "Vegetarian",
  cake: "Dessert",
  brownie: "Dessert",
  icecream: "Dessert",
  "ice cream": "Dessert",
};

function normalizeFoodType(item) {
  const rawName = item.Dish || "";
  const key = rawName.toLowerCase().replace(/\s+/g, ""); // "Veg Meals" -> "vegmeals"

  if (FOOD_MAP[key]) {
    return FOOD_MAP[key];              // ✅ our mapping wins
  }

  // fall back to backend value if we don't know this dish
  return item.Food_Type || "Other";
}

function normalizeSpice(item) {
  return item.Spice_Level || "Medium";
}

function AiRecommendations({ currentUser }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [foodType, setFoodType] = useState("Healthy");
  const [spiceLevel, setSpiceLevel] = useState("Medium");
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (!currentUser || !currentUser.age) {
      setRecs([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      age: String(currentUser.age),
      food_type: foodType,
      spice_level: spiceLevel,
    });

    fetch(`${AI_BASE}/recommendations?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.detail) {
          setError(data.detail);
          setRecs([]);
        } else {
          const raw = data.recommendations || [];

          const mapped = raw.map((item) => {
            const foodTypeNorm = normalizeFoodType(item);
            const spiceNorm = normalizeSpice(item);

            return {
              dish: item.Dish,
              predictedRating: Number(item.Predicted_Rating),
              foodType: foodTypeNorm,
              spiceLevel: spiceNorm,
            };
          });

          console.group("AI recs (normalized)");
          console.table(mapped);
          console.groupEnd();

          setRecs(mapped);
        }
      })
      .catch((err) => {
        console.error("AI recommendation error", err);
        setError("Failed to load recommendations.");
        setRecs([]);
      })
      .finally(() => setLoading(false));
  }, [currentUser, foodType, spiceLevel, refreshCounter]);

  if (!currentUser) {
    return (
      <section className={styles.card}>
        <div className={styles.titleRow}>
          <div>
            <h3 className={styles.title}>Personalized recommendations</h3>
            <p className={styles.subtitle}>
              Login to see food suggestions tuned to you.
            </p>
          </div>
        </div>
        <p className={styles.loginText}>
          Once you sign in, Dyne will use your age and preferences to surface
          dishes that match your vibe.
        </p>
      </section>
    );
  }

  // ✅ Client-side filter *after* normalization
  const visibleRecs = recs.filter((r) => {
    const matchesFood =
      !foodType ||
      foodType === "Any" ||
      r.foodType?.toLowerCase() === foodType.toLowerCase();

    const matchesSpice =
      !spiceLevel ||
      spiceLevel === "Any" ||
      r.spiceLevel?.toLowerCase() === spiceLevel.toLowerCase();

    return matchesFood && matchesSpice;
  });

  const topPick =
    visibleRecs.length > 0
      ? [...visibleRecs].sort(
          (a, b) => (b.predictedRating || 0) - (a.predictedRating || 0)
        )[0]
      : null;

  return (
    <section className={styles.card}>
      <div className={styles.titleRow}>
        <div>
          <h3 className={styles.title}>Recommended for you</h3>
          <p className={styles.subtitle}>
            Based on your age{" "}
            <span className={styles.ageBadge}>{currentUser.age}</span>
          </p>

          {topPick && (
            <div className={styles.topPickPill}>
              <span className={styles.topPickDot} />
              Top pick: <strong>{topPick.dish}</strong> ·{" "}
              <span>{topPick.predictedRating.toFixed(2)}★</span>
            </div>
          )}
        </div>

        <button
          className={`${styles.refreshButton} ${
            loading ? styles.refreshButtonLoading : ""
          }`}
          type="button"
          onClick={() => setRefreshCounter((c) => c + 1)}
          disabled={loading}
        >
          <RotateCw className={styles.refreshIcon} size={14} />
          <span>{loading ? "Updating…" : "Refresh"}</span>
        </button>
      </div>

      {/* Filters */}
      <div className={styles.controlsRow}>
        <div className={styles.controlGroup}>
          <span className={styles.label}>FOOD TYPE</span>
          <div className={styles.pillSelectWrapper}>
            <select
              className={styles.pillSelect}
              value={foodType}
              onChange={(e) => setFoodType(e.target.value)}
            >
              <option value="Healthy">Healthy</option>
              <option value="Non-Veg">Non-Veg</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Fast Food">Fast Food</option>
              <option value="Dessert">Dessert</option>
            </select>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>SPICE</span>
          <div className={styles.pillSelectWrapper}>
            <select
              className={styles.pillSelect}
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="Spicy">Spicy</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <ul className={styles.list}>
        {!loading && visibleRecs.length === 0 && !error && (
          <li className={styles.emptyText}>No recommendations yet.</li>
        )}

        {visibleRecs.map((r, idx) => {
          const isTop = topPick && r.dish === topPick.dish;
          const rating = Number.isFinite(r.predictedRating)
            ? r.predictedRating
            : 0;
          const widthPct = Math.max(0, Math.min(100, (rating / 5) * 100));

          return (
            <li
              className={`${styles.listItem} ${
                isTop ? styles.topPickItem : ""
              }`}
              key={`${r.dish}-${idx}`}
            >
              <div className={styles.listItemHeader}>
                <span className={styles.dishName}>{r.dish}</span>
                {isTop && <span className={styles.topBadge}>Top pick</span>}
                <span className={styles.ratingText}>
                  {rating.toFixed(2)}★
                </span>
              </div>

              <div className={styles.ratingBar}>
                <div
                  className={styles.ratingBarFill}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default AiRecommendations;