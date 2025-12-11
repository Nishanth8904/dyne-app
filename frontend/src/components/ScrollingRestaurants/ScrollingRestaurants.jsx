// src/components/ScrollingRestaurants/ScrollingRestaurants.jsx
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import styles from "./ScrollingRestaurants.module.css";

import MenuModal from "../MenuModal/MenuModal";
import { getMenuForRestaurant } from "../../data/menus";

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
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* ---------- Helpers for time formatting + open/closed ---------- */
/** convert "HH:MM:SS" string to Date object for *today* */
function timeStringToDate(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [_, hh, mm] = m;
  const now = new Date();
  now.setHours(Number(hh), Number(mm), 0, 0);
  return now;
}

/** format "HH:MM:SS" -> "7:00 AM" */
function formatTimeHuman(timeStr) {
  const d = timeStringToDate(timeStr);
  if (!d) return "--";
  let hrs = d.getHours();
  const mins = d.getMinutes();
  const ampm = hrs >= 12 ? "PM" : "AM";
  hrs = hrs % 12;
  if (hrs === 0) hrs = 12;
  return `${hrs}:${String(mins).padStart(2, "0")} ${ampm}`;
}

/** returns true if restaurant is open right now.
 * Handles overnight closing (e.g. opens 11:00, closes 01:00)
 */
function isOpenNow(opensAt, closesAt) {
  if (!opensAt || !closesAt) return false;
  const now = new Date();
  const open = timeStringToDate(opensAt);
  const close = timeStringToDate(closesAt);

  if (!open || !close) return false;

  // If close is less than open -> overnight (closes next day)
  if (close.getTime() <= open.getTime()) {
    // open today at open..midnight OR midnight..close (next day)
    const endOfDay = new Date(open);
    endOfDay.setHours(23, 59, 59, 999);
    const startOfDay = new Date(open);
    startOfDay.setHours(0, 0, 0, 0);

    return (now >= open && now <= endOfDay) || (now >= startOfDay && now <= close);
  }

  return now >= open && now <= close;
}

/* ---------- InlineRouteMap (unchanged) ---------- */
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
      {distanceKm != null && durationMin != null && (
        <div className={styles.routeInfoPill}>
          <span className={styles.routeDot} />
          {distanceKm.toFixed(1)} km
          <span className={styles.routeDot} />
          {Math.round(durationMin)} min
        </div>
      )}

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

/* ---------- Component ---------- */
export default function ScrollingRestaurants({ restaurants = [] }) {
  const [activeRestaurantId, setActiveRestaurantId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRestaurantId, setMenuRestaurantId] = useState(null);

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

          const openNow = isOpenNow(r.opensAt, r.closesAt);

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

                  {/* Hours chip */}
                  {(r.opensAt || r.closesAt) && (
                    <span className={styles.hoursChip}>
                      {formatTimeHuman(r.opensAt)} – {formatTimeHuman(r.closesAt)}
                    </span>
                  )}

                  {/* Open/Closed badge */}
                  <span className={openNow ? styles.openBadge : styles.closedBadge}>
                    {openNow ? "Open now" : "Closed"}
                  </span>
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

                  <button
                    type="button"
                    className={styles.menuBtn}
                    onClick={() => {
                      setMenuRestaurantId(r.id);
                      setMenuOpen(true);
                    }}
                  >
                    View items
                  </button>

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
                {/* show hours in modal header */}
                <p className={styles.mapHours}>
                  Hours: {formatTimeHuman(activeRestaurant.opensAt)} – {formatTimeHuman(activeRestaurant.closesAt)}
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

      {/* Menu modal */}
      <MenuModal
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false);
          setMenuRestaurantId(null);
        }}
        restaurantName={restaurants.find(rt => rt.id === menuRestaurantId)?.name}
        items={getMenuForRestaurant(menuRestaurantId)}
      />
    </div>
  );
}