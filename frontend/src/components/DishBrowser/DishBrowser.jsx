import { useState, useMemo } from 'react';
import styles from './DishBrowser.module.css';
import RestaurantCard from '../RestaurantCard/RestaurantCard';

const DISH_CONFIG = [
  { id: 'biryani', label: 'Biryani', matchTags: ['biryani'], matchCuisine: ['biryani'] },
  {
    id: 'vegMeals',
    label: 'Veg meals',
    matchTags: ['pure-veg', 'meals', 'veg'],
    matchCuisine: ['vegetarian', 'south indian']
  },
  {
    id: 'tiffin',
    label: 'Breakfast / Tiffin',
    matchTags: ['tiffin', 'breakfast'],
    matchCuisine: ['south indian']
  },
  {
    id: 'dessert',
    label: 'Dessert & sweets',
    matchTags: ['dessert', 'sweets', 'ice cream', 'cafe'],
    matchCuisine: ['dessert', 'cafe']
  },
  {
    id: 'pizza',
    label: 'Pizza & fast food',
    matchTags: ['pizza', 'fast-food', 'burger'],
    matchCuisine: ['pizza', 'fast food', 'burgers']
  },
  {
    id: 'buffet',
    label: 'Buffet & grill',
    matchTags: ['buffet', 'grill'],
    matchCuisine: ['barbecue', 'buffet']
  }
];

function DishBrowser({ restaurants }) {
  const [activeDishId, setActiveDishId] = useState('biryani');

  const activeDish = DISH_CONFIG.find(d => d.id === activeDishId);

  const matchingRestaurants = useMemo(() => {
    if (!activeDish) return [];

    const tags = (activeDish.matchTags || []).map(t => t.toLowerCase());
    const cuisines = (activeDish.matchCuisine || []).map(c => c.toLowerCase());

    return restaurants.filter(r => {
      const cuisineLower = (r.cuisine || '').toLowerCase();
      const tagList = Array.isArray(r.tags) ? r.tags : [];
      const tagLower = tagList.map(t => (t || '').toLowerCase());

      const tagMatch = tags.some(t => tagLower.includes(t));
      const cuisineMatch = cuisines.some(c => cuisineLower.includes(c));

      return tagMatch || cuisineMatch;
    });
  }, [restaurants, activeDish]);

  return (
    <div className={styles.dishBrowserRoot}>
      <div className={styles.dishHeaderRow}>
        <h2 className={styles.dishTitle}>Pick a dish</h2>
        <p className={styles.dishSubtitle}>
          Tap a dish to see restaurants that serve it.
        </p>
      </div>

      <ul className={styles.menuBar}>
  {DISH_CONFIG.map(dish => (
    <li
      key={dish.id}
      className={
        activeDishId === dish.id
          ? `${styles.menuItem} ${styles.menuItemActive}`
          : styles.menuItem
      }
      onClick={() => setActiveDishId(dish.id)}
    >
      {dish.label}
    </li>
  ))}
</ul>

      <div className={styles.dishResultBlock}>
        {matchingRestaurants.length === 0 ? (
          <p className={styles.noResultText}>
            No restaurants found for this dish in your current list.
          </p>
        ) : (
          <div className={styles.cardGridLike}>
            {matchingRestaurants.map(r => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DishBrowser;