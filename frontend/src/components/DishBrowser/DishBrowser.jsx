// src/components/DishBrowser/DishBrowser.jsx
import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import styles from "./DishBrowser.module.css";
import RestaurantCard from "../RestaurantCard/RestaurantCard";

// 🔥 Dish categories + images
const DISH_CONFIG = [
  {
    id: "biryani",
    label: "Biryani",
    image: "/dishes/biryani.png",
    matchTags: ["biryani"],
    matchCuisine: ["biryani"],
  },
  {
    id: "shawarma",
    label: "Shawarma & Rolls",
    image: "/dishes/shawarma.png",
    matchTags: ["shawarma", "roll",],
    matchCuisine: ["arabic", "lebanese"],
  },
  {
    id: "vegMeals",
    label: "Veg Meals",
    image: "/dishes/meals.png",
    matchTags: ["pure-veg", "meals", "veg", "thali"],
    matchCuisine: ["vegetarian", "south indian"],
  },
  {
    id: "tiffin",
    label: "Breakfast / Tiffin",
    image: "/dishes/tiffin.png",
    matchTags: ["tiffin", "breakfast", "idli", "dosa", "pongal"],
    matchCuisine: ["south indian"],
  },
  {
    id: "dessert",
    label: "Dessert & Sweets",
    image: "/dishes/dessert.png",
    matchTags: ["dessert", "sweet", "sweets", "ice cream", "cake"],
    matchCuisine: ["dessert", "cafe"],
  },
  {
    id: "pizza",
    label: "Pizza & Fast Food",
    image: "/dishes/pizza.png",
    matchTags: ["pizza", "burger", "fast-food", "fries"],
    matchCuisine: ["pizza", "fast food", "burgers"],
  },
];

// ====== Leaflet marker icons ======
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

// Small helper map component used inside the popup
function InlineRouteMap({ restaurant }) {
  const [userPos, setUserPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);

  const dest = [restaurant.latitude, restaurant.longitude];

  // 1) Get user location
  useEffect(() => {
    setRouteCoords(null);

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

  // 2) Get road route from OSRM
  useEffect(() => {
    if (!userPos) return;

    const [uLat, uLng] = userPos;
    const [rLat, rLng] = dest;

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
    <MapContainer center={center} zoom={14} className={styles.fullMap}>
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
  );
}

function DishBrowser({ restaurants = [] }) {
  const [activeDishId, setActiveDishId] = useState("biryani");

  // 🔵 restaurant whose Dyne map popup is open
  const [activeRestaurant, setActiveRestaurant] = useState(null);

  const activeDish = DISH_CONFIG.find((d) => d.id === activeDishId);

  const matchingRestaurants = useMemo(() => {
    if (!activeDish) return [];

    const tagsNeedle = (activeDish.matchTags || []).map((t) =>
      t.toLowerCase()
    );
    const cuisineNeedle = (activeDish.matchCuisine || []).map((c) =>
      c.toLowerCase()
    );

    return restaurants.filter((r) => {
      const cuisineLower = (r.cuisine || "").toLowerCase();
      const tagList = Array.isArray(r.tags) ? r.tags : [];
      const tagLower = tagList.map((t) => (t || "").toLowerCase());

      const tagMatch = tagsNeedle.some((t) => tagLower.includes(t));
      const cuisineMatch = cuisineNeedle.some((c) =>
        cuisineLower.includes(c)
      );

      return tagMatch || cuisineMatch;
    });
  }, [restaurants, activeDish]);

  const closeModal = () => setActiveRestaurant(null);

  return (
    <section className={styles.dishBrowserRoot}>
      <div className={styles.dishHeaderRow}>
        <h2 className={styles.dishTitle}>What are you craving?</h2>
        <p className={styles.dishSubtitle}>
          Tap a dish – Dyne shows real places in your database that serve it.
        </p>
      </div>

      {/* ===================== DISH STRIP ===================== */}
      <ul className={styles.dishStrip}>
        {DISH_CONFIG.map((dish) => {
          const isActive = dish.id === activeDishId;
          return (
            <li key={dish.id} className={styles.dishStripItem}>
              <button
                type="button"
                className={`${styles.dishTile} ${
                  isActive ? styles.dishTileActive : ""
                }`}
                onClick={() => setActiveDishId(dish.id)}
              >
                <div className={styles.dishImageWrap}>
                  <img
                    src={dish.image}
                    alt={dish.label}
                    className={styles.dishImage}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/fallback-dish.png";
                    }}
                  />
                </div>
                <span className={styles.dishLabel}>{dish.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ===================== RESTAURANT ROW ===================== */}
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>
          {activeDish ? `${activeDish.label} nearby` : "Matching places"}
        </h3>
        <span className={styles.resultMeta}>
          {matchingRestaurants.length} place
          {matchingRestaurants.length === 1 ? "" : "s"} found
        </span>
      </div>

      {matchingRestaurants.length === 0 ? (
        <p className={styles.noResultText}>
          No restaurants are tagged for this dish yet. Add tags or dishes from
          the admin panel to see them here.
        </p>
      ) : (
        <div className={styles.cardRow}>
          {matchingRestaurants.map((r) => (
            <div key={r.id} className={styles.cardRowItem}>
              {/* 👇 Pass callback into RestaurantCard */}
              <RestaurantCard
                restaurant={r}
                onNavigateDyne={() => setActiveRestaurant(r)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 🔵 Fullscreen Dyne map popup for dishes tab */}
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

            <InlineRouteMap restaurant={activeRestaurant} />
          </div>
        </div>
      )}
    </section>
  );
}

export default DishBrowser;