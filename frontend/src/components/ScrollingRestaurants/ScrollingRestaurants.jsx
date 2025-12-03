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

function InlineRouteMap({ restaurant }) {
  const [userPos, setUserPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);

  const dest = [restaurant.latitude, restaurant.longitude];

  // 1) Get user location
  useEffect(() => {
    setRouteCoords(null); // reset old route

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

  // 2) Get road route from OSRM when we have both points
  useEffect(() => {
    if (!userPos) return;
    const [uLat, uLng] = userPos;
    const [rLat, rLng] = dest;

    // OSRM expects lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${rLng},${rLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data.routes || !data.routes[0]) return;
        const coords = data.routes[0].geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        setRouteCoords(coords);
      })
      .catch((err) => {
        console.error("OSRM routing error", err);
        setRouteCoords(null);
      });
  }, [userPos, dest[0], dest[1]]);

  const center = userPos || dest;

  return (
    <MapContainer center={center} zoom={14} className={styles.inlineMap}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location */}
      {userPos && <Marker position={userPos} icon={userIcon} />}

      {/* Restaurant marker */}
      <Marker position={dest} icon={markerIcon} />

      {/* Real route if available, else simple straight line fallback */}
      {routeCoords ? (
        <Polyline positions={routeCoords} />
      ) : (
        userPos && <Polyline positions={[userPos, dest]} />
      )}
    </MapContainer>
  );
}

export default function ScrollingRestaurants({ restaurants = [] }) {
  const [activeRestaurant, setActiveRestaurant] = useState(null);

  if (!restaurants.length) return null;

  function handleNavigateClick(r) {
    if (!r.latitude || !r.longitude) {
      alert("This restaurant doesn't have map coordinates yet.");
      return;
    }

    setActiveRestaurant((prev) =>
      prev && prev.id === r.id ? null : r // toggle open/close
    );
  }

  return (
    <div className={styles.cHotels}>
      {restaurants.map((r) => {
       const imageUrl = r.imageUrl || `/${r.id}.jpg`;   // because file is in public root
        const isActive =
          activeRestaurant && String(activeRestaurant.id) === String(r.id);

        return (
          <article key={r.id} className={styles.cHotelsItem}>
            {/* IMAGE */}
            <figure className={styles.cHotelsFigure}>
              <img
                src={imageUrl}
                alt={r.name}
                onError={(e) => {
                  e.target.src = "/fallback-restaurant.jpg";
                }}
              />
            </figure>

            {/* INFO */}
            <div className={styles.cHotelsInfo}>
              <h2 className={styles.cHotelsTitle}>{r.name}</h2>
              <p className={styles.cHotelsSubtitle}>
                {r.cuisine} • {r.area}
              </p>

              <p className={styles.cHotelsExcerpt}>
                {r.description || "Great food, must try!"}
              </p>

              <p>
                ⭐ {r.rating || "N/A"} • ₹{r.avgCostForTwo || "?"} for two
              </p>

              <div className={styles.actionRow}>
                {/* ✅ Google Maps link is back */}
                <a
                  href={getMapsUrl(r)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.viewBtn}
                >
                  View on Google Maps
                </a>

                {/* ✅ In-page Dyne map */}
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => handleNavigateClick(r)}
                >
                  {isActive ? "Hide Dyne Map" : "Navigate in Dyne Map"}
                </button>
              </div>

              {/* INLINE LEAFLET MAP */}
              {isActive && (
                <div className={styles.inlineMapWrapper}>
                  <InlineRouteMap restaurant={r} />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}