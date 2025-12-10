// src/components/AdminAnalytics/AdminAnalytics.jsx
import { BarChart3, TrendingUp, Star, MapPin, Utensils } from "lucide-react";
import styles from "./AdminAnalytics.module.css";

function computeAnalytics(restaurants = []) {
  const total = restaurants.length;


  const rated = restaurants.filter((r) => r.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
        rated.length
      : 0;


  const withCost = restaurants.filter(
    (r) => r.avgCostForTwo != null && Number(r.avgCostForTwo) > 0
  );
  const avgCost =
    withCost.length > 0
      ? withCost.reduce(
          (sum, r) => sum + Number(r.avgCostForTwo || 0),
          0
        ) / withCost.length
      : 0;

  const areaCounts = {};
  const cuisineCounts = {};

  restaurants.forEach((r) => {
    const area = (r.area || "").trim();
    const cuisine = (r.cuisine || "").trim();

    if (area) {
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    }
    if (cuisine) {
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    }
  });

  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topRated = [...rated]
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 5);

  return {
    total,
    avgRating,
    avgCost,
    topAreas,
    topCuisines,
    topRated,
  };
}

export default function AdminAnalytics({ restaurants = [], admin }) {
  if (!admin || !restaurants.length) return null;

  const { total, avgRating, avgCost, topAreas, topCuisines, topRated } =
    computeAnalytics(restaurants);

  return (
    <section className={styles.wrap}>
      <div className={styles.headerRow}>
        <span className={styles.badge}>
          <BarChart3 size={14} />
          <span>Admin analytics</span>
        </span>
        <h2 className={styles.title}>Campus food overview</h2>
        <p className={styles.subtitle}>
          Live snapshot based on the restaurants currently in your Dyne database.
        </p>
      </div>

      <div className={styles.grid}>
        {/* KPI row */}
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <Utensils size={18} />
            </div>
            <p className={styles.kpiLabel}>Total restaurants</p>
            <p className={styles.kpiValue}>{total}</p>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <Star size={18} />
            </div>
            <p className={styles.kpiLabel}>Avg rating</p>
            <p className={styles.kpiValue}>
              {avgRating ? avgRating.toFixed(1) : "—"}
            </p>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <TrendingUp size={18} />
            </div>
            <p className={styles.kpiLabel}>Avg cost for two</p>
            <p className={styles.kpiValue}>
              {avgCost ? `₹${Math.round(avgCost)}` : "—"}
            </p>
          </div>
        </div>

        {/* Distribution row */}
        <div className={styles.distributionRow}>
          <div className={styles.distCard}>
            <div className={styles.distHeader}>
              <MapPin size={16} />
              <span>Top areas</span>
            </div>
            <ul className={styles.distList}>
              {topAreas.length === 0 && (
                <li className={styles.emptyText}>No area data yet.</li>
              )}
              {topAreas.map(([area, count]) => {
                const percent = total ? (count / total) * 100 : 0;
                return (
                  <li key={area} className={styles.distItem}>
                    <div className={styles.distLabelRow}>
                      <span>{area}</span>
                      <span className={styles.distCount}>{count}</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.distCard}>
            <div className={styles.distHeader}>
              <Utensils size={16} />
              <span>Top cuisines</span>
            </div>
            <ul className={styles.distList}>
              {topCuisines.length === 0 && (
                <li className={styles.emptyText}>No cuisine data yet.</li>
              )}
              {topCuisines.map(([cuisine, count]) => {
                const percent = total ? (count / total) * 100 : 0;
                return (
                  <li key={cuisine} className={styles.distItem}>
                    <div className={styles.distLabelRow}>
                      <span>{cuisine}</span>
                      <span className={styles.distCount}>{count}</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillAlt}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Top rated */}
        <div className={styles.topCard}>
          <div className={styles.topHeader}>
            <Star size={16} />
            <span>Top rated spots</span>
          </div>
          {topRated.length === 0 ? (
            <p className={styles.emptyText}>No rated restaurants yet.</p>
          ) : (
            <ul className={styles.topList}>
              {topRated.map((r) => (
                <li key={r.id} className={styles.topItem}>
                  <div>
                    <p className={styles.topName}>{r.name}</p>
                    <p className={styles.topMeta}>
                      {r.area || "Unknown area"} • {r.cuisine || "Cuisine"}
                    </p>
                  </div>
                  <span className={styles.topRating}>
                    <Star size={14} />
                    {Number(r.rating).toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}