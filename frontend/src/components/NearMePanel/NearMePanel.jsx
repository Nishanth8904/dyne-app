import { useState, useMemo } from 'react';
import styles from './NearMePanel.module.css';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function NearMePanel({ restaurants }) {
  const [userPos, setUserPos] = useState(null);
  const [status, setStatus] = useState('idle');

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('finding');

    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        });
        setStatus('ready');
      },
      () => {
        setStatus('denied');
      }
    );
  }

  const sortedNearby = useMemo(() => {
    if (!userPos) return [];

    const withDistance = restaurants
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        ...r,
        distanceKm: haversineKm(
          userPos.lat,
          userPos.lon,
          r.latitude,
          r.longitude
        )
      }))
      .filter(r => r.distanceKm <= 15); // within 15 km

    // sort by rating DESC (best first), tie-breaker distance ASC
    return withDistance.sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return a.distanceKm - b.distanceKm;
    });
  }, [restaurants, userPos]);

  return (
    <div className={styles.nearMeRoot}>
      <div className={styles.nearMeHeaderRow}>
        <div>
          <h2 className={styles.nearMeTitle}>Best near you</h2>
          <p className={styles.nearMeSubtitle}>
            Shows nearby hotels ordered by rating.
          </p>
        </div>
        <button
          type="button"
          className={styles.locateButton}
          onClick={handleLocateMe}
        >
          📍 Use my location
        </button>
      </div>

      {status === 'finding' && (
        <p className={styles.nearMeStatus}>Detecting your location…</p>
      )}
      {status === 'denied' && (
        <p className={styles.nearMeStatus}>
          Location access denied. Please allow location.
        </p>
      )}
      {status === 'error' && (
        <p className={styles.nearMeStatus}>
          This browser does not support location access.
        </p>
      )}

      {!userPos && status === 'idle' && (
        <p className={styles.nearMeStatus}>
          Tap &quot;Use my location&quot; to see best hotels near you.
        </p>
      )}

      {userPos && sortedNearby.length === 0 && (
        <p className={styles.nearMeStatus}>
          No nearby hotels found with location data.
        </p>
      )}

      {userPos && sortedNearby.length > 0 && (
        <ul className={styles.nearMeList}>
          {sortedNearby.map(r => {
            const distText = `${r.distanceKm.toFixed(1)} km`;
            return (
              <li key={r.id} className={styles.nearMeItem}>
                <div className={styles.nearMeMain}>
                  <div className={styles.nearMeName}>{r.name}</div>
                  <div className={styles.nearMeArea}>{r.area}</div>
                  <div className={styles.nearMeMeta}>
                    {distText} • Rating {r.rating ?? 'N/A'} • ₹
                    {r.avgCostForTwo} for two
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NearMePanel;