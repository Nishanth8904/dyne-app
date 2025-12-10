
import { useState, useMemo } from 'react';
import styles from './AdminPanel.module.css';

function AdminPanel({ admin, onLogout, reloadRestaurants }) {
  const [activeTab, setActiveTab] = useState('restaurant');
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    cuisine: '',
    area: '',
    avgCostForTwo: '',
    landmark: '',
    rating: '',
    latitude: '',
    longitude: '',
  });

  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    tags: '',
    basePrice: '',
    restaurantIds: '',
  });

  const adminToken = useMemo(
    () => admin?.token || localStorage.getItem('smartdine_admin_token'),
    [admin]
  );

  const hasValidToken = Boolean(adminToken);

  function handleRestaurantChange(e) {
    const { name, value } = e.target;
    setRestaurantForm(prev => ({ ...prev, [name]: value }));
  }

  function handleDishChange(e) {
    const { name, value } = e.target;
    setDishForm(prev => ({ ...prev, [name]: value }));
  }

  async function submitRestaurant(e) {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');

    if (!hasValidToken) {
      setErrorText('Invalid admin token. Please log in again as admin.');
      return;
    }

    try {
      const body = {
        name: restaurantForm.name,
        cuisine: restaurantForm.cuisine,
        area: restaurantForm.area,
        avgCostForTwo: restaurantForm.avgCostForTwo
          ? Number(restaurantForm.avgCostForTwo)
          : undefined,
        landmark: restaurantForm.landmark,
        rating: restaurantForm.rating
          ? Number(restaurantForm.rating)
          : undefined,
        latitude: restaurantForm.latitude
          ? Number(restaurantForm.latitude)
          : undefined,
        longitude: restaurantForm.longitude
          ? Number(restaurantForm.longitude)
          : undefined,
      };

      const res = await fetch('http://localhost:3000/api/admin/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorText(data.error || 'Failed to add restaurant');
        return;
      }

      setSuccessText(`Restaurant created with id ${data.id}`);
      setRestaurantForm({
        name: '',
        cuisine: '',
        area: '',
        avgCostForTwo: '',
        landmark: '',
        rating: '',
        latitude: '',
        longitude: '',
      });
      reloadRestaurants();
    } catch (err) {
      console.error('Add restaurant error', err);
      setErrorText('Network error adding restaurant');
    }
  }

  async function submitDish(e) {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');

    if (!hasValidToken) {
      setErrorText('Invalid admin token. Please log in again as admin.');
      return;
    }

    try {
      const restaurantIds = dishForm.restaurantIds
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(Number);

      const body = {
        name: dishForm.name,
        description: dishForm.description,
        tags: dishForm.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        basePrice: dishForm.basePrice ? Number(dishForm.basePrice) : undefined,
        restaurantIds,
      };

      const res = await fetch('http://localhost:3000/api/admin/dishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorText(data.error || 'Failed to add dish');
        return;
      }

      setSuccessText(`Dish created with id ${data.id}`);
      setDishForm({
        name: '',
        description: '',
        tags: '',
        basePrice: '',
        restaurantIds: '',
      });
    } catch (err) {
      console.error('Add dish error', err);
      setErrorText('Network error adding dish');
    }
  }

  return (
    <section className={styles.adminRoot}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h2 className={styles.adminTitle}>Admin dashboard</h2>
          <p className={styles.adminSubtitle}>
            Logged in as {admin?.email || 'admin'}.
          </p>
          {!hasValidToken && (
            <p className={styles.adminError}>
              Invalid admin token. Please log out and log in again.
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={onLogout}
        >
          Logout
        </button>
      </div>

      <div className={styles.adminTabs}>
        <button
          type="button"
          className={
            activeTab === 'restaurant'
              ? `${styles.adminTabBtn} ${styles.adminTabBtnActive}`
              : styles.adminTabBtn
          }
          onClick={() => setActiveTab('restaurant')}
        >
          Add restaurant
        </button>
        <button
          type="button"
          className={
            activeTab === 'dish'
              ? `${styles.adminTabBtn} ${styles.adminTabBtnActive}`
              : styles.adminTabBtn
          }
          onClick={() => setActiveTab('dish')}
        >
          Add dish
        </button>
      </div>

      {errorText && <p className={styles.adminError}>{errorText}</p>}
      {successText && <p className={styles.adminSuccess}>{successText}</p>}

      {activeTab === 'restaurant' && (
        <form onSubmit={submitRestaurant} className={styles.formGrid}>
          <div className={styles.formCol}>
            <label className={styles.formLabel}>
              Name
              <input
                name="name"
                value={restaurantForm.name}
                onChange={handleRestaurantChange}
                className={styles.formInput}
              />
            </label>
            <label className={styles.formLabel}>
              Cuisine
              <input
                name="cuisine"
                value={restaurantForm.cuisine}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="e.g. North Indian, South Indian"
              />
            </label>
            <label className={styles.formLabel}>
              Area
              <input
                name="area"
                value={restaurantForm.area}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="e.g. Gandhipuram"
              />
            </label>
            <label className={styles.formLabel}>
              Landmark
              <input
                name="landmark"
                value={restaurantForm.landmark}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="Near PSG, above TOVO, etc."
              />
            </label>
          </div>

          <div className={styles.formCol}>
            <label className={styles.formLabel}>
              Avg cost for two
              <input
                name="avgCostForTwo"
                value={restaurantForm.avgCostForTwo}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="e.g. 400"
              />
            </label>
            <label className={styles.formLabel}>
              Rating
              <input
                name="rating"
                value={restaurantForm.rating}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="e.g. 4.3"
              />
            </label>
            <label className={styles.formLabel}>
              Latitude
              <input
                name="latitude"
                value={restaurantForm.latitude}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="11.02…"
              />
            </label>
            <label className={styles.formLabel}>
              Longitude
              <input
                name="longitude"
                value={restaurantForm.longitude}
                onChange={handleRestaurantChange}
                className={styles.formInput}
                placeholder="76.99…"
              />
            </label>
          </div>

          <button type="submit" className={styles.submitButton}>
            Add restaurant
          </button>
        </form>
      )}

      {activeTab === 'dish' && (
        <form onSubmit={submitDish} className={styles.formGridSingle}>
          <label className={styles.formLabel}>
            Dish name
            <input
              name="name"
              value={dishForm.name}
              onChange={handleDishChange}
              className={styles.formInput}
            />
          </label>

          <label className={styles.formLabel}>
            Description
            <textarea
              name="description"
              value={dishForm.description}
              onChange={handleDishChange}
              className={styles.formInput}
              rows={3}
            />
          </label>

          <label className={styles.formLabel}>
            Tags (comma separated)
            <input
              name="tags"
              value={dishForm.tags}
              onChange={handleDishChange}
              className={styles.formInput}
              placeholder="biryani, veg, budget"
            />
          </label>

          <label className={styles.formLabel}>
            Base price
            <input
              name="basePrice"
              value={dishForm.basePrice}
              onChange={handleDishChange}
              className={styles.formInput}
              placeholder="e.g. 120"
            />
          </label>

          <label className={styles.formLabel}>
            Restaurant IDs (comma separated)
            <input
              name="restaurantIds"
              value={dishForm.restaurantIds}
              onChange={handleDishChange}
              className={styles.formInput}
              placeholder="e.g. 1, 2, 5"
            />
          </label>

          <button type="submit" className={styles.submitButton}>
            Add dish
          </button>
        </form>
      )}
    </section>
  );
}

export default AdminPanel;