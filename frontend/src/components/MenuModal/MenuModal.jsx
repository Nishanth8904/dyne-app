// src/components/MenuModal/MenuModal.jsx
import React from "react";
import styles from "./MenuModal.module.css";

export default function MenuModal({ open, onClose, restaurantName, items = [] }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <h3 className={styles.title}>{restaurantName || "Menu"}</h3>
            <p className={styles.count}>{items.length} items</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className={styles.body}>
          {items.length === 0 && (
            <div className={styles.empty}>No items found for this restaurant.</div>
          )}

          {items.length > 0 && (
            <ul className={styles.list}>
              {items.map((it) => (
                <li key={it.id} className={styles.item}>
                  <div className={styles.itemLeft}>
                    <div className={styles.itemName}>{it.item}</div>
                    <div className={styles.itemCat}>{it.category}</div>
                  </div>
                  <div className={styles.itemRight}>₹{Number(it.price).toFixed(0)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className={styles.footer}>
          <button className={styles.done} onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}