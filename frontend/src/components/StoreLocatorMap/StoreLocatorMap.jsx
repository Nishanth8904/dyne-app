import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import styles from './StoreLocatorMap.module.css';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function MapNavigator({ restaurants }) {
  const map = useMap();

  useEffect(() => {
    function onNavigate(ev) {
      const id = ev.detail?.id;
      if (!id) return;

      const r = restaurants.find(r => String(r.id) === String(id));
      if (!r || !r.latitude || !r.longitude) return;

      map.flyTo([r.latitude, r.longitude], 17, {
        duration: 1.2
      });
    }

    window.addEventListener('dyne:navigate-to-restaurant', onNavigate);
    return () => {
      window.removeEventListener('dyne:navigate-to-restaurant', onNavigate);
    };
  }, [map, restaurants]);

  return null;
}

function StoreLocatorMap({ restaurants }) {
  const points = restaurants.filter(r => r.latitude && r.longitude);

  const center =
    points.length > 0
      ? [points[0].latitude, points[0].longitude]
      : [11.0168, 76.9558]; // Coimbatore fallback

  return (
    <div className={styles.locatorRoot}>
      <h2 className={styles.locatorTitle}>Store locator</h2>
      <p className={styles.locatorSubtitle}>
        View all SmartDine hotels on the map.
      </p>

      <div className={styles.mapShell}>
        <MapContainer center={center} zoom={13} className={styles.mapEl}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* listens for the navigate event and moves the map */}
          <MapNavigator restaurants={restaurants} />

          {points.map(r => (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={markerIcon}
            >
              <Popup>
                <div className={styles.popupBlock}>
                  <div className={styles.popupName}>{r.name}</div>
                  <div className={styles.popupArea}>{r.area}</div>
                  <div className={styles.popupMeta}>
                    Rating {r.rating ?? 'N/A'} • ₹{r.avgCostForTwo} for two
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default StoreLocatorMap;