import { useEffect, useState } from 'react';
import styles from './FilterBar.module.css';

function FilterBar({ onChangeFilters }) {
  const [area, setArea] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [minRating, setMinRating] = useState('');

  function handleApply() {
    onChangeFilters({
      area: area || '',
      cuisine: cuisine || '',
      minRating: minRating || ''
    });
  }

  function handleReset() {
    setArea('');
    setCuisine('');
    setMinRating('');
    onChangeFilters({
      area: '',
      cuisine: '',
      minRating: ''
    });
  }

  return (
    <div className={styles.filterBarRoot}>
      <div className={styles.filterRow}>
        <input
          className={styles.filterInput}
          placeholder="Area (e.g. Gandhipuram)"
          value={area}
          onChange={e => setArea(e.target.value)}
        />
        <input
          className={styles.filterInput}
          placeholder="Cuisine (e.g. North Indian)"
          value={cuisine}
          onChange={e => setCuisine(e.target.value)}
        />
        <input
          className={styles.filterInput}
          placeholder="Min rating (e.g. 4.0)"
          value={minRating}
          onChange={e => setMinRating(e.target.value)}
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