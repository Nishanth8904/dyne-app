// src/App.jsx
import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Filter,
  MessageSquare,
  Sparkles,
  X,
  ChevronRight,
} from 'lucide-react';
import styles from './App.module.css';

// Component Imports
import NearMePanel from './components/NearMePanel/NearMePanel';
import DishBrowser from './components/DishBrowser/DishBrowser';
import StoreLocatorMap from './components/StoreLocatorMap/StoreLocatorMap';
import AuthPanel from './components/AuthPanel/AuthPanel';
import AdminPanel from './components/AdminPanel/AdminPanel';
import AIAssistant from './components/AIAssistant/AIAssistant';
import ScrollingRestaurants from './components/ScrollingRestaurants/ScrollingRestaurants';
import AiRecommendations from './components/AiRecommendations/AiRecommendations';
import PriceCalculator from './components/PriceCalculator/PriceCalculator';

import FoodGame from './components/FoodGame/FoodGame';

const API_BASE = 'http://localhost:3000';

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [filters, setFilters] = useState({
    area: '',
    cuisine: '',
    minRating: '',
  });

  const [activeTab, setActiveTab] = useState('hotels');
  const [showAuth, setShowAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isDark, setIsDark] = useState(true);

  // Floating Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');



  function buildQueryString(activeFilters) {
    const params = new URLSearchParams();
    if (activeFilters.area) params.append('area', activeFilters.area);
    if (activeFilters.cuisine) params.append('cuisine', activeFilters.cuisine);
    if (activeFilters.minRating)
      params.append('minRating', activeFilters.minRating);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function loadRestaurants(activeFilters = filters) {
    try {
      setLoading(true);
      setLoadError('');

      const queryString = buildQueryString(activeFilters);
      const res = await fetch(`${API_BASE}/api/restaurants${queryString}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const rawData = await res.json();

      const mappedData = rawData.map(r => ({
        ...r,
        avgCostForTwo: Number(r.avgCostForTwo || r.avg_cost_for_two || 0),
        rating: r.rating !== null ? Number(r.rating) : null,
        latitude: r.latitude !== null ? Number(r.latitude) : null,
        longitude: r.longitude !== null ? Number(r.longitude) : null,
        tags: Array.isArray(r.tags)
          ? r.tags
          : r.tags
          ? r.tags.split(',')
          : [],
        isPureVeg: Boolean(r.is_pure_veg),
        opensAt: r.opens_at,
        closesAt: r.closes_at,
      }));

      setRestaurants(mappedData);
    } catch (err) {
      console.error('Failed to load restaurants', err);
      try {
        const MOCK = [
          {
            id: 1,
            name: "Sharma's Dhaba",
            area: 'Gandhipuram',
            cuisine: 'North Indian',
            rating: 4.5,
            avgCostForTwo: 300,
            isPureVeg: false,
            tags: ['Thali'],
          },
          {
            id: 2,
            name: 'Krishna Veg',
            area: 'Peelamedu',
            cuisine: 'South Indian',
            rating: 4.2,
            avgCostForTwo: 200,
            isPureVeg: true,
            tags: ['Breakfast'],
          },
          {
            id: 3,
            name: 'Spice Route',
            area: 'RS Puram',
            cuisine: 'Biryani',
            rating: 4.0,
            avgCostForTwo: 500,
            isPureVeg: false,
            tags: ['Biryani'],
          },
        ];
        setRestaurants(MOCK);
      } catch (e) {
        setLoadError('Failed to load restaurants from the server.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChangeFilters(key, value) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
  }

  function applyFilters() {
    loadRestaurants(filters);
  }

  function resetFilters() {
    const reset = { area: '', cuisine: '', minRating: '' };
    setFilters(reset);
    loadRestaurants(reset);
  }

  function handleLogoutAdmin() {
    localStorage.removeItem('smartdine_admin_token');
    setCurrentAdmin(null);
  }
  function handleCampusEmail() {
  // Optional: ask for college name
  const college = window.prompt("What's your college name?", "");

  const to = "dynestudentapp@gmail.com";
  const subject = "Request: Dyne app for our college";

  const bodyLines = [
    "Hi Dyne team,",
    "",
    "We would love to bring the Dyne student food app to our campus.",
    college ? `College name: ${college}` : "College name: __________",
    "",
    "We believe Dyne would help students discover nearby food spots, split bills easily,",
    "and make planning group meals much simpler.",
    "",
    "Please get in touch with us about the next steps.",
    "",
    "Thanks,",
    "A student interested in Dyne"
  ];

  const body = bodyLines.join("\n");

  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoUrl;
}

  const themeClass = isDark
    ? styles.appRoot
    : `${styles.appRoot} ${styles.lightTheme}`;

  return (
    <div className={themeClass}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.brandGroup}>
            <div className={styles.logoBox}>
              <span>D</span>
            </div>
            <div className={styles.brandText}>
              <h1 className={styles.brandTitle}>DYNE</h1>
              <span className={styles.brandSubtitle}>Student Eats</span>
            </div>
          </div>

          <div className={styles.navActions}>
            {(currentUser || currentAdmin) && (
              <span className={styles.statusText}>
                {currentAdmin
                  ? `Admin: ${currentAdmin?.name ?? currentAdmin?.email}`
                  : `Hi, ${
                      currentUser?.name ??
                      currentUser?.email?.split('@')[0]
                    }`}
              </span>
            )}
            <button
              onClick={() => setIsDark(!isDark)}
              className={styles.themeToggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              className={styles.loginButton}
              onClick={() => setShowAuth(true)}
            >
              {currentUser || currentAdmin ? 'Logout' : 'Login'}
            </button>
          </div>
        </div>
      </nav>

      {currentAdmin && (
        <AdminPanel
          admin={currentAdmin}
          onLogout={handleLogoutAdmin}
          reloadRestaurants={() => loadRestaurants(filters)}
        />
      )}

      {/* HERO VIDEO (top) */}
      <div className={styles.heroSection}>
        <div className={styles.videoOverlay} />
        <video autoPlay loop muted playsInline className={styles.heroVideo}>
          <source src="/Untitled.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroContent}>
          <h2 className={styles.heroWelcome}>Welcome to Dyne</h2>
          <p className={styles.heroHeadline}>Food for Students.</p>
        </div>
      </div>

    
       


      {/* MAIN CONTENT – everything scrollable / linked from footer */}
      <main id="nearby" className={styles.mainLayout}>
        {/* AI recommendations based on logged-in user's age */}
        <AiRecommendations currentUser={currentUser} />

        {/* Nearby header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Nearby spots</h1>
          <p className={styles.pageSubtitle}>
            Real places from your Dyne database.
          </p>
        </div>

        {/* Tabs + filters + results */}
        <div className={styles.zapierLayout}>
          {/* SIDEBAR */}
          <aside className={styles.sidebar}>
            <nav className={styles.sideNav}>
              {[
                { id: 'hotels', label: 'Hotels' },
                { id: 'dishes', label: 'Dishes' },
                { id: 'nearMe', label: 'Near Me' },
                { id: 'storeLocator', label: 'Store Locator' },
                { id: 'priceCalc', label: 'Price calculator' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${styles.sideNavLink} ${
                    activeTab === tab.id ? styles.sideNavActive : ''
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && <ChevronRight size={16} />}
                </button>
              ))}
            </nav>

            <div className={styles.filterWidget}>
              <div className={styles.filterHeader}>
                <Filter size={16} />
                <span>Filters</span>
              </div>
              <div className={styles.filterInputs}>
                <input
                  type="text"
                  placeholder="Area..."
                  value={filters.area}
                  onChange={e => handleChangeFilters('area', e.target.value)}
                  className={styles.filterInput}
                />
                <input
                  type="text"
                  placeholder="Cuisine..."
                  value={filters.cuisine}
                  onChange={e =>
                    handleChangeFilters('cuisine', e.target.value)
                  }
                  className={styles.filterInput}
                />
                <input
                  type="number"
                  placeholder="Min Rating..."
                  value={filters.minRating}
                  onChange={e =>
                    handleChangeFilters('minRating', e.target.value)
                  }
                  className={styles.filterInput}
                />
              </div>
              <div className={styles.filterActions}>
                <button onClick={applyFilters} className={styles.applyBtn}>
                  Apply
                </button>
                <button onClick={resetFilters} className={styles.resetBtn}>
                  Reset
                </button>
              </div>
            </div>
          </aside>

          {/* CONTENT: scrollable column */}
          <div className={styles.contentArea}>
            {loading && <p className={styles.loadingText}>Loading...</p>}
            {loadError && <p className={styles.errorText}>{loadError}</p>}

            {!loading && !loadError && (
              <>
                {activeTab === 'hotels' && (
                  <div className={styles.resultsContainer}>
                    <div className={styles.resultsHeader}>
                      <h2>Found {restaurants.length} hotels</h2>
                      <p>Scroll down to see each spot one by one.</p>
                    </div>

                    <ScrollingRestaurants restaurants={restaurants} />
                  </div>
                )}

                {activeTab === 'dishes' && (
                  <DishBrowser restaurants={restaurants} />
                )}

                {activeTab === 'nearMe' && (
                  <NearMePanel restaurants={restaurants} />
                )}

                {activeTab === 'storeLocator' && (
                  <div
                    id="store-locator-section"
                    className={styles.mapContainer}
                  >
                    <StoreLocatorMap restaurants={restaurants} />
                  </div>
                )}

                {activeTab === 'priceCalc' && (
                  <PriceCalculator restaurants={restaurants} />
                )}
              </>
            )}
          </div>
        </div>
      


        {/* WHY DYNE SECTION */}
        <section id="why-dyne" className={styles.storySection}>
          <div className={styles.storyInner}>
            <div className={styles.storyVideoWrapper}>
              <video
                autoPlay
                loop
                muted
                playsInline
                className={styles.storyVideo}
              >
                <source src="/hero2.mp4" type="video/mp4" />
              </video>
            </div>

            <div className={styles.storyContent}>
              <p className={styles.storyEyebrow}>Why Dyne</p>
              <h2
                className={`${styles.storyTitle} ${styles.nablaTitle}`}
              >
                We&apos;re on a mission to make everyday eating easier
                <span className={styles.nablaTitleHighlight}>
                  {' '}
                  for every student
                </span>
                .
              </h2>
              <p className={styles.storyText}>
                Dyne maps your campus, favourite hangouts, and budget
                spots into one simple view – so instead of scrolling 20
                apps, you just ask &quot;Where do we eat?&quot; and go.
              </p>

              <ul className={styles.storyList}>
                <li>
                  <span className={styles.storyBulletDot} />
                  Smart suggestions based on price, distance, and time
                  of day.
                </li>
                <li>
                  <span className={styles.storyBulletDot} />
                  Real spots – not ads – curated from your Dyne
                  database.
                </li>
                <li>
                  <span className={styles.storyBulletDot} />
                  Built for group plans, late-night cravings, and
                  exam-week rush.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SPLIT HERO – VOICE SEARCH / CAMPUS LIFE */}
        <section id="voice" className={styles.splitHero}>
          <div className={styles.splitText}>
            <p className={styles.splitEyebrow}>Made for campus life</p>
            <h2 className={styles.splitTitle}>
              We&apos;re on a mission to make eating
              <br />
              feel effortless for students.
            </h2>
            <p className={styles.splitBody}>
              Dyne understands late-night cravings, tight budgets and
              exam weeks. We surface spots that match your mood, your
              wallet, and your walkable radius around campus.
            </p>

            <div className={styles.splitBadges}>
              <span className={styles.splitBadge}>
                <span className={styles.splitBadgeDot} /> 25+ curated
                hotels near you
              </span>
              <span className={styles.splitBadge}>
                <span className={styles.splitBadgeDot} /> Tamil +
                English voice search
              </span>
              <span className={styles.splitBadge}>
                <span className={styles.splitBadgeDot} /> Built for
                student budgets
              </span>
            </div>
          </div>

          <div className={styles.splitMedia}>
            <video
              className={styles.splitVideo}
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/nearby.mp4" type="video/mp4" />
            </video>
          </div>
        </section>
        <FoodGame/>
<section id="voice" className={styles.brandBand}>
  <div className={styles.brandBandInner}>
    <div className={styles.brandBandText}>
      <p className={styles.brandBandEyebrow}>Built for student life</p>
      <h2 className={styles.brandBandTitle}>
        A system as dynamic as your campus cravings.
      </h2>
      <p className={styles.brandBandBody}>
        Dyne connects your favourite hangouts, late-night biryani spots,
        and budget-friendly messes into one simple view.
      </p>
    </div>
   

    <div className={styles.brandBandGrid}>
      {/* Card 1 */}
      <div className={`${styles.brandCard} ${styles.brandCardData}`}>
        <div className={styles.brandCardImage} />
        <div className={styles.brandCardContent}>
          <h3>Real student data</h3>
          <p>
            We map hotspots from real student behaviour, not ads – so every
            suggestion actually makes sense for campus life.
          </p>
        </div>
      </div>

      {/* Card 2 */}
      <div className={`${styles.brandCard} ${styles.brandCardGroups}`}>
        <div className={styles.brandCardImage} />
        <div className={styles.brandCardContent}>
          <h3>Made for groups</h3>
          <p>
            From “let&apos;s split a bucket” to last-minute class treats, Dyne
            surfaces places that work for everyone.
          </p>
        </div>
      </div>
      

      {/* Card 3 */}
      <div className={`${styles.brandCard} ${styles.brandCardWallet}`}>
        <div className={styles.brandCardImage} />
        <div className={styles.brandCardContent}>
          <h3>Wallet-friendly</h3>
          <p>
            Filters by budget, distance and time of day – so you never have to
            scroll ten apps to find one good option.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>




        {/* BIG ORANGE CTA STRIP */}
        <section className={styles.brandCta}>
          <div className={styles.brandCtaInner}>
            <h2 className={styles.brandCtaTitle}>
              Ready to make “Where do we eat?” effortless?
            </h2>
           <button
  className={styles.brandCtaButton}
  onClick={handleCampusEmail}
>
  Get Dyne for your campus
</button>
          </div>
        </section>

        {/* CONTACT STRIP FOR FOOTER LINK */}
        <section id="contact" className={styles.contactSection}>
          <div className={styles.contactInner}>
            <h2>Contact</h2>
            <p>
              Have ideas for Dyne or want it in your campus? Mail us at{' '}
              <strong>hello@dyne.app</strong>.
            </p>
          </div>
        </section>
      </main>

      {/* FLOATING Ask Dyne */}
      <div className={styles.fabContainer}>
        {isChatOpen && (
          <div className={styles.chatPopup}>
            <div className={styles.chatHeader}>
              <h3>
                <Sparkles size={16} /> Ask Dyne
              </h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className={styles.closeChatBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.chatBody}>
              <AIAssistant />
            </div>
          </div>
        )}

        <button
          className={styles.fabButton}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {/* FOOTER – Zapier-style */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogoBox}>D</div>
            <span className={styles.footerLogoText}>Dyne</span>
          </div>
         

          <nav className={styles.footerNav}>
            <a href="#nearby">Nearby spots</a>
            <a href="#why-dyne">Why Dyne</a>
            <a href="#voice">Voice search</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className={styles.footerMeta}>
            <span>© {new Date().getFullYear()} Dyne Labs.</span>
            <span className={styles.footerMetaDivider}>•</span>
            <span>Food for Students.</span>
          </div>
        </div>
      </footer>

    {showAuth && (
  <AuthPanel
    isDark={isDark}
    onUserLogin={user => {
      console.log('LOGIN USER FROM BACKEND:', user);  // 🔍 debug
      setCurrentUser(user);
      setCurrentAdmin(null);
      setShowAuth(false);
    }}
    onAdminLogin={admin => {
      setCurrentAdmin(admin);
      setCurrentUser(null);
      setShowAuth(false);
    }}
    onClose={() => setShowAuth(false)}
  />
)}
    </div>
  );
}

export default App;