// frontend/src/components/FilterBar/FilterBar.jsx
import React, { useRef, useState } from "react";
import styles from "./FilterBar.module.css";

function FilterBar({ onChangeFilters }) {
  const [hotelName, setHotelName] = useState("");
  const [area, setArea] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [minRating, setMinRating] = useState("");
  const searchRef = useRef(null);

  function handleApply() {
    onChangeFilters({
      hotelName: hotelName || "",
      area: area || "",
      cuisine: cuisine || "",
      minRating: minRating || "",
    });
  }

  function handleReset() {
    setHotelName("");
    setArea("");
    setCuisine("");
    setMinRating("");
    onChangeFilters({
      hotelName: "",
      area: "",
      cuisine: "",
      minRating: "",
    });
    searchRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleApply();
  }

  return (
    <div className={styles.filterBarRoot}>
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <input
            ref={searchRef}
            className={`${styles.filterInput} ${styles.filterSearch}`}
            placeholder="Search hotel name..."
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search hotel name"
          />
          <button
            type="button"
            className={styles.searchBtn}
            onClick={handleApply}
            title="Search"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6" stroke="#94a3b8" strokeWidth="1.6" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <input
          className={styles.filterInput}
          placeholder="Area (e.g. Gandhipuram)"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className={styles.filterInput}
          placeholder="Cuisine (e.g. North Indian)"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className={styles.filterInput}
          placeholder="Min rating (e.g. 4.0)"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className={styles.buttonRow}>
        <button className={styles.applyButton} onClick={handleApply}>
          Apply filters
        </button>
        <button className={styles.resetButton} onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default FilterBar;