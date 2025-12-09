// src/components/RestaurantCard/RestaurantCard.jsx
import styles from "./RestaurantCard.module.css";

function getMapsUrl(r) {
  if (r.latitude && r.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
  }
  const q = `${r.name || ""} ${r.area || ""} ${r.landmark || ""}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    q
  )}`;
}

function RestaurantCard({ restaurant: r, onNavigateDyne }) {
  // if you store photos in /public/1.jpg, 2.jpg, ...
  const imageUrl = r.imageUrl || `/${r.id}.jpg`;
  const mapUrl = getMapsUrl(r);
  const hasCoords = r.latitude && r.longitude;

  return (
    <article className={styles.card}>
      {/* Photo */}
      <div className={styles.imageWrap}>
        <img
          src={imageUrl}
          alt={r.name}
          className={styles.image}
          onError={(e) => {
            e.currentTarget.src = "/fallback-restaurant.jpg";
          }}
        />
      </div>

      {/* Text content */}
      <div className={styles.content}>
        <h3 className={styles.name}>{r.name}</h3>
        <p className={styles.area}>{r.area}</p>
        <p className={styles.cuisine}>{r.cuisine}</p>
        <p className={styles.desc}>
          {r.description || "Popular student spot with quick service."}
        </p>

        <p className={styles.meta}>
          ₹{r.avgCostForTwo} for two · Rating {r.rating ?? "N/A"}
        </p>

        {r.landmark && (
          <p className={styles.landmark}>
            <strong>Landmark:</strong> {r.landmark}
          </p>
        )}

        {/* Buttons */}
        <div className={styles.actions}>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.viewBtn}
          >
            View on Google Maps
          </a>

          <button
            type="button"
            className={styles.navBtn}
            disabled={!hasCoords}
            onClick={() => {
              if (!hasCoords) return;
              // 🔵 let parent (DishBrowser / Nearby) decide what to do
              if (onNavigateDyne) {
                onNavigateDyne();
              }
            }}
          >
            Navigate in Dyne map
          </button>
        </div>
      </div>
    </article>
  );
}

export default RestaurantCard;