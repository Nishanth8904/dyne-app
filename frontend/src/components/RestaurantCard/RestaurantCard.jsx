// src/components/RestaurantCard/RestaurantCard.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import styles from './RestaurantCard.module.css';

import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';

const restaurantIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const userIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// -------- Google Maps URL helper --------
function getMapsUrl(r) {
  if (r.latitude && r.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
  }
  const query = `${r.name || ''} ${r.area || ''} ${r.landmark || ''}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query.trim()
  )}`;
}

// -------- Routing component (real road route) --------
function DyneRoute({ userPos, restaurantPos }) {
  const map = useMap();

  useEffect(() => {
    if (!userPos || !restaurantPos) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userPos[0], userPos[1]),
        L.latLng(restaurantPos[0], restaurantPos[1]),
      ],
      lineOptions: {
        addWaypoints: false,
        extendToWaypoints: true,
        missingRouteTolerance: 1,
      },
      show: false, // hide turn-by-turn panel
      collapsible: true,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
      }),
    }).addTo(map);

    return () => {
      map.removeControl(routingControl);
    };
  }, [map, userPos, restaurantPos]);

  return null;
}

function RestaurantCard({ restaurant: r }) {
  const [showDyneMap, setShowDyneMap] = useState(false);
  const [userPos, setUserPos] = useState(null);

  // if you store photos in /public/restaurants/1.jpg, 2.jpg, ...
  const imageUrl = r.imageUrl || `/restaurants/${r.id}.jpg`;
  const mapUrl = getMapsUrl(r);
  const hasCoords = r.latitude && r.longitude;
  const restaurantPos = hasCoords ? [r.latitude, r.longitude] : null;

  // Get user location once when Dyne map opens
  useEffect(() => {
    if (!showDyneMap || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      },
      err => {
        console.warn('Geolocation error', err);
        setUserPos(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [showDyneMap]);

  return (
    <article className={styles.card}>
      {/* Photo */}
      <div className={styles.imageWrap}>
        <img
          src={imageUrl}
          alt={r.name}
          className={styles.image}
          onError={e => {
            e.currentTarget.src = '/fallback-restaurant.jpg';
          }}
        />
      </div>

      {/* Text content */}
      <div className={styles.content}>
        <h3 className={styles.name}>{r.name}</h3>
        <p className={styles.area}>{r.area}</p>
        <p className={styles.cuisine}>{r.cuisine}</p>
        <p className={styles.desc}>{r.description}</p>

        <p className={styles.meta}>
          ₹{r.avgCostForTwo} for two · Rating {r.rating ?? 'N/A'}
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
              setShowDyneMap(v => !v);
            }}
          >
            {showDyneMap ? 'Hide Dyne Map' : 'Navigate in Dyne Map'}
          </button>
        </div>

        {/* Inline Dyne map */}
        {showDyneMap && hasCoords && (
          <div className={styles.inlineMap}>
            <MapContainer
              center={restaurantPos}
              zoom={14}
              className={styles.mapEl}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <Marker position={restaurantPos} icon={restaurantIcon} />
              {userPos && <Marker position={userPos} icon={userIcon} />}

              {/* 🚗 real route, not a straight line */}
              {userPos && (
                <DyneRoute userPos={userPos} restaurantPos={restaurantPos} />
              )}
            </MapContainer>
          </div>
        )}

        {showDyneMap && !hasCoords && (
          <p className={styles.noCoordsText}>
            This restaurant doesn&apos;t have coordinates yet. Use Google Maps
            instead.
          </p>
        )}
      </div>
    </article>
  );
}

export default RestaurantCard;