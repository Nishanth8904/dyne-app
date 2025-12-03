import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import styles from './MapOverlay.module.css';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function FitBounds({ from, to }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;
    const bounds = L.latLngBounds([from, to]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [from, to, map]);

  return null;
}

function MapOverlay({ restaurant, onClose }) {
  const [userPos, setUserPos] = useState(null);
  const [route, setRoute] = useState([]);

  const dest = restaurant?.latitude && restaurant?.longitude
    ? [restaurant.latitude, restaurant.longitude]
    : null;

  // get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // ignore errors, we just won't draw route
      }
    );
  }, []);

  // fetch route from OSRM when we have both points
  useEffect(() => {
    if (!userPos || !dest) return;

    const [fromLat, fromLon] = userPos;
    const [toLat, toLon] = dest;

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.routes || !data.routes[0]) return;
        const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        setRoute(coords);
      })
      .catch(() => {});
  }, [userPos, dest]);

  if (!restaurant) return null;

  const center = dest || userPos || [11.0168, 76.9558]; // fallback: Coimbatore center

  const googleDirectionsUrl = dest
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${restaurant.name}, ${restaurant.area}`
      )}`
    : null;

  return (
    <div className={styles.overlayRoot}>
      <div className={styles.overlayCard}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
        >
          ✕
        </button>

        <MapContainer center={center} zoom={13} className={styles.leafletMap}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userPos && (
            <Marker position={userPos} icon={markerIcon}>
            </Marker>
          )}

          {dest && (
            <Marker position={dest} icon={markerIcon}>
            </Marker>
          )}

          {userPos && dest && <FitBounds from={userPos} to={dest} />}

          {route.length > 0 && (
            <Polyline positions={route} pathOptions={{ weight: 5 }} />
          )}
        </MapContainer>

        <div className={styles.actionsRow}>
          <div className={styles.placeText}>
            <div className={styles.placeName}>{restaurant.name}</div>
            <div className={styles.placeArea}>{restaurant.area}</div>
          </div>

          {googleDirectionsUrl && (
            <a
              href={googleDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.directionsButton}
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapOverlay;