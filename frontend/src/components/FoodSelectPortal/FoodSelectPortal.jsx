import React, { useState } from "react";
import styles from "./FoodSelectPortal.module.css";

const DISHES = [
  { id: "shawarma", label: "Shawarma & Rolls", image: "/dishes/shawarma.png" },
  { id: "biryani", label: "Biryani", image: "/dishes/biryani.png" },
  { id: "vegMeals", label: "Veg Meals", image: "/dishes/meals.png" },
  { id: "tiffin", label: "Breakfast / Tiffin", image: "/dishes/tiffin.png" },
  { id: "dessert", label: "Dessert & Sweets", image: "/dishes/dessert.png" },
  { id: "pizza", label: "Pizza & Fast Food", image: "/dishes/pizza.png" },
];

export default function FoodSelectPortal({ onDishSelected }) {
  const [hoverId, setHoverId] = useState("biryani");

  const activeDish = DISHES.find((d) => d.id === hoverId) || DISHES[0];

  return (
    <div className={styles.portalRoot}>
      <div className={styles.portalFrame}>
        <header className={styles.portalHeader}>
          <span className={styles.portalChip}>Dyne Arcade</span>
          <h2 className={styles.portalTitle}>Pick your falling dish</h2>
          <p className={styles.portalSubtitle}>
            Click a dish name – that food becomes the one that drops in the
            game.
          </p>
        </header>

        <div className={styles.portalBody}>
          {/* LEFT: list of dish names */}
          <ul className={styles.dishMenu}>
            {DISHES.map((dish) => (
              <li
                key={dish.id}
                className={`${styles.dishMenuItem} ${
                  hoverId === dish.id ? styles.dishMenuItemActive : ""
                }`}
                onMouseEnter={() => setHoverId(dish.id)}
                onClick={() => onDishSelected(dish.id)}
              >
                <span className={styles.bulletDot}>•</span>
                <span className={styles.dishText}>{dish.label}</span>
              </li>
            ))}
          </ul>

          {/* RIGHT: big preview of currently hovered dish */}
          <div className={styles.previewPane}>
            <div className={styles.previewCard}>
              <div className={styles.previewImageWrap}>
                <img
                  src={activeDish.image}
                  alt={activeDish.label}
                  className={styles.previewImage}
                  onError={(e) => {
                    e.currentTarget.src = "/fallback-dish.png";
                  }}
                />
              </div>
              <p className={styles.previewLabel}>{activeDish.label}</p>
              <p className={styles.previewHint}>
                Click <strong>{activeDish.label}</strong> on the left to start
                the game with this dish.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}