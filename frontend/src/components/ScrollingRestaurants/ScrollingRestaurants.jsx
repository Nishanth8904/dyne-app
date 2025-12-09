// src/components/ScrollingRestaurants/ScrollingRestaurants.jsx
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import styles from "./ScrollingRestaurants.module.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const userIcon = new L.DivIcon({
  className: styles.userMarker,
  html: '<div class="user-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function getMapsUrl(r) {
  if (r.latitude && r.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
  }
  const q = `${r.name || ""} ${r.area || ""} ${r.landmark || ""}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    q
  )}`;
}

/**
 * InlineRouteMap
 * - fetches user location
 * - fetches road route from OSRM
 * - draws route
 * - shows distance + ETA pill on top of the map
 */
function InlineRouteMap({ restaurant, className }) {
  const [userPos, setUserPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [durationMin, setDurationMin] = useState(null);

  const dest = [restaurant.latitude, restaurant.longitude];

  useEffect(() => {
    setRouteCoords(null);
    setDistanceKm(null);
    setDurationMin(null);

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const up = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(up);
      },
      () => {
        setUserPos(null);
      },
      { enableHighAccuracy: true }
    );
  }, [restaurant.id]);

  useEffect(() => {
    if (!userPos) return;
    const [uLat, uLng] = userPos;
    const [rLat, rLng] = dest;

    const url = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${rLng},${rLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data.routes || !data.routes[0]) return;
        const route = data.routes[0];

        const coords = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        setRouteCoords(coords);

        // distance in km + time in min
        if (typeof route.distance === "number") {
          setDistanceKm(route.distance / 1000);
        }
        if (typeof route.duration === "number") {
          setDurationMin(route.duration / 60);
        }
      })
      .catch((err) => {
        console.error("OSRM routing error", err);
        setRouteCoords(null);
      });
  }, [userPos, dest[0], dest[1]]);

  const center = userPos || dest;

  return (
    <div className={styles.mapWrapper}>
      {/* pill */}
      {distanceKm != null && durationMin != null && (
        <div className={styles.routeInfoPill}>
          <span className={styles.routeDot} />
          {distanceKm.toFixed(1)} km
          <span className={styles.routeDot} />
          {Math.round(durationMin)} min
        </div>
      )}

      {/* map */}
      <MapContainer
        center={center}
        zoom={14}
        className={className || styles.leafletMap}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPos && <Marker position={userPos} icon={userIcon} />}
        <Marker position={dest} icon={markerIcon} />

        {routeCoords ? (
          <Polyline positions={routeCoords} />
        ) : (
          userPos && <Polyline positions={[userPos, dest]} />
        )}
      </MapContainer>
    </div>
  );
}
export default function ScrollingRestaurants({ restaurants = [] }) {
  const [activeRestaurantId, setActiveRestaurantId] = useState(null);

  if (!restaurants.length) return null;

  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId);

  function handleNavigateClick(r) {
    if (!r.latitude || !r.longitude) {
      alert("This restaurant doesn't have map coordinates yet.");
      return;
    }
    setActiveRestaurantId((prev) => (prev === r.id ? null : r.id));
  }

  function closeModal() {
    setActiveRestaurantId(null);
  }

  return (
    <div className={styles.cHotels}>
      <div className={styles.cHotelsStrip}>
        {restaurants.map((r) => {
          const imageUrl = r.imageUrl || `/${r.id}.jpg`;
          const isActive = activeRestaurantId === r.id;

          const costText =
            r.avgCostForTwo != null ? `₹${r.avgCostForTwo} for two` : null;

          return (
            <article key={r.id} className={styles.cHotelsCard}>
              {/* IMAGE */}
              <figure className={styles.cHotelsFigure}>
                <img
                  src={imageUrl}
                  alt={r.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "/fallback-restaurant.jpg";
                  }}
                />
              </figure>

              {/* INFO */}
              <div className={styles.cHotelsInfo}>
                <h3 className={styles.cHotelsTitle}>{r.name}</h3>
                <p className={styles.cHotelsSubtitle}>
                  {r.cuisine} • {r.area}
                </p>

                <p className={styles.cHotelsMeta}>
                  {r.rating != null && (
                    <span className={styles.metaChip}>⭐ {r.rating}</span>
                  )}
                  {costText && (
                    <span className={styles.metaChip}>{costText}</span>
                  )}
                </p>

                <p className={styles.cHotelsExcerpt}>
                  {r.description || "Popular student spot with quick service."}
                </p>

                <div className={styles.actionRow}>
                  <a
                    href={getMapsUrl(r)}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.viewBtn}
                  >
                    View in Google Maps
                  </a>

                  {r.latitude && r.longitude && (
                    <button
                      type="button"
                      className={styles.navBtn}
                      onClick={() => handleNavigateClick(r)}
                    >
                      {isActive ? "Close Dyne map" : "Navigate in Dyne map"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* 🔵 Fullscreen Dyne map modal */}
      {activeRestaurant && (
        <div className={styles.mapOverlay} onClick={closeModal}>
          <div
            className={styles.mapModal}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.mapModalHeader}>
              <div>
                <h4 className={styles.mapTitle}>{activeRestaurant.name}</h4>
                <p className={styles.mapSubtitle}>
                  {activeRestaurant.area} • {activeRestaurant.cuisine}
                </p>
              </div>
              <button
                type="button"
                className={styles.mapCloseBtn}
                onClick={closeModal}
              >
                Close
              </button>
            </header>
<div className={styles.fullMap}>
  <InlineRouteMap restaurant={activeRestaurant} />
</div>
          </div>
        </div>
      )}
    </div>
  );
}