import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./WishFab.module.css";
import { Star, X } from "lucide-react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

// Register GSAP Plugin
gsap.registerPlugin(MotionPathPlugin);

const STORAGE_KEY = "dyne_wishlist_final_v9";

// --- Sub-Component for Individual Roaming Stars ---
const RoamingStar = ({ wish }) => {
  const starRef = useRef(null);

  useEffect(() => {
    if (!starRef.current) return;

    // Create a wandering animation
    // The jar inner bounds are roughly: X: 110-140, Y: 280-330
    const wander = () => {
      gsap.to(starRef.current, {
        duration: 2 + Math.random() * 3, // Random speed (2-5s)
        x: 110 + Math.random() * 30,     // Random X inside glass
        y: 280 + Math.random() * 50,     // Random Y at bottom
        rotation: Math.random() * 360,   // Gentle spin
        ease: "sine.inOut",
        onComplete: wander, // Loop forever to new random spots
      });
    };

    // Start wandering
    wander();

    return () => {
      gsap.killTweensOf(starRef.current);
    };
  }, []);

  return (
    <g ref={starRef} transform={`translate(${wish.x}, ${wish.y}) scale(0.45)`}>
      {/* Path is centered so transforms work perfectly */}
      <path 
        fill="#ffed93" 
        stroke="#de9e44" 
        strokeWidth="2"
        transform="translate(-122, -22)"
        d="M123.636,2.703l6.979,14.141c0.116,0.232,0.339,0.396,0.596,0.431 l15.604,2.267c0.648,0.096,0.905,0.89,0.438,1.345l-11.294,11.008c-0.187,0.181-0.271,0.443-0.227,0.699l2.665,15.544 c0.111,0.643-0.563,1.135-1.143,0.832l-13.959-7.337c-0.229-0.122-0.503-0.122-0.734,0l-13.958,7.337 c-0.579,0.303-1.255-0.188-1.144-0.832l2.666-15.544c0.044-0.256-0.041-0.518-0.227-0.699L98.605,20.887 c-0.469-0.455-0.209-1.249,0.436-1.345l15.608-2.267c0.256-0.036,0.478-0.199,0.593-0.431l6.98-14.141 C122.511,2.116,123.347,2.116,123.636,2.703z"
      />
    </g>
  );
};

export default function WishFab() {
  const [open, setOpen] = useState(false);
  const [wishes, setWishes] = useState([]);
  const [wishText, setWishText] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for animation targets
  const lidRef = useRef(null);
  const starGroupRef = useRef(null); 
  const jarRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setWishes(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
  }, [wishes]);

  const handleDrop = () => {
    if (!wishText.trim() || isAnimating) return;
    setIsAnimating(true);

    const currentWishText = wishText.trim();
    const currentRestaurant = restaurant.trim();

    // 1. Initial Landing Spot (The roaming animation will take over after this)
    const finalX = 125; 
    const finalY = 300; 

    // 2. Reset Flying Star
    gsap.set(starGroupRef.current, { 
      display: "block", 
      opacity: 1, 
      scale: 1, 
      x: 125, 
      y: 380, 
      rotation: 0
    });

    const tl = gsap.timeline({
      onComplete: () => {
        // 3. Save Wish
        const newWish = {
          id: Date.now(),
          text: currentWishText,
          restaurant: currentRestaurant,
          x: finalX,
          y: finalY,
          createdAt: new Date().toISOString(),
        };
        
        setWishes((p) => [newWish, ...p]);
        setWishText("");
        setRestaurant("");
        setIsAnimating(false);
        
        // Hide flying star
        gsap.set(starGroupRef.current, { display: "none" });
      },
    });

    // 4. Animation Sequence
    tl.to(lidRef.current, { duration: 0.4, rotation: -85, transformOrigin: "10% 50%", ease: "back.out(1.7)" }, "start");
    
    tl.to(starGroupRef.current, {
      duration: 0.8,
      motionPath: {
        path: [
          { x: 125, y: 380 }, 
          { x: 190, y: 140 }, 
          { x: 125, y: 160 }, 
          { x: finalX, y: finalY } 
        ],
        curviness: 1.5,
        autoRotate: false
      },
      rotation: 360, 
      scale: 0.45, 
      ease: "power1.inOut"
    }, "start+=0.05");

    tl.to(lidRef.current, { duration: 0.4, rotation: 0, ease: "bounce.out" }, "-=0.2");
  };

  const removeWish = (id) => {
    setWishes((p) => p.filter((w) => w.id !== id));
  };

  return (
    <>
      <button className={styles.wishFab} onClick={() => setOpen(true)} aria-label="Open Wishlist">
        <Star size={20} />
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.card} onClick={(e) => e.stopPropagation()}>
            <header className={styles.header}>
              <h3>Wishlist</h3>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.content}>
              <div className={styles.inputSection}>
                <div className={styles.fieldGroup}>
                  <label>Your wish</label>
                  <input 
                    value={wishText} 
                    onChange={(e) => setWishText(e.target.value)} 
                    placeholder="I wish ... (e.g. more biryani deals)" 
                    disabled={isAnimating}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Restaurant (optional)</label>
                  <input 
                    value={restaurant} 
                    onChange={(e) => setRestaurant(e.target.value)} 
                    placeholder="e.g. Sharma's Dhaba" 
                    disabled={isAnimating}
                  />
                </div>
              </div>

              <div className={styles.jarSection}>
                <div className={styles.jarWrapper}>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 251.063 362.542" className={styles.svgJar}>
                    <g id="jar-group">
                      
                      {/* Layer 1: Back Glass Background */}
                      <path fill="rgba(239, 250, 254, 0.3)" d="M127.189,357.152c-21.828,0-31.697-8.172-34.202-10.678c-6.001-6.001-5.63-28.776-5.303-48.871 c0.073-4.479,0.142-8.711,0.142-12.657c0-10.315,0.576-34.882,5.913-40.219c4.458-4.458,2.015-18.768,1.989-18.911 c-0.026-0.148,0.016-0.301,0.115-0.415c0.099-0.113,0.25-0.179,0.394-0.173l57.389,1.672c0.149,0.004,0.289,0.074,0.381,0.192 c0.092,0.117,0.127,0.27,0.095,0.415c-0.026,0.123-2.613,12.332,2.274,17.22c6.078,6.078,6.916,22.922,6.916,40.219 c0,3.616,0.068,7.649,0.141,11.92c0.315,18.551,0.707,41.638-4.485,49.53C155.684,351.358,145.407,357.152,127.189,357.152z" />

                      {/* Layer 2: Persistent Stars (Now Roaming) */}
                      <g id="persistent-stars">
                        {wishes.map((w) => (
                          <RoamingStar key={w.id} wish={w} />
                        ))}
                      </g>

                      {/* Layer 3: Jar Front Glass + Lid */}
                      <g id="jar" ref={jarRef} style={{ pointerEvents: 'none' }}>
                         <path fill="none" stroke="#27525C" strokeWidth="3" d="M127.189,357.152c-21.828,0-31.697-8.172-34.202-10.678c-6.001-6.001-5.63-28.776-5.303-48.871 c0.073-4.479,0.142-8.711,0.142-12.657c0-10.315,0.576-34.882,5.913-40.219c4.458-4.458,2.015-18.768,1.989-18.911 c-0.026-0.148,0.016-0.301,0.115-0.415c0.099-0.113,0.25-0.179,0.394-0.173l57.389,1.672c0.149,0.004,0.289,0.074,0.381,0.192 c0.092,0.117,0.127,0.27,0.095,0.415c-0.026,0.123-2.613,12.332,2.274,17.22c6.078,6.078,6.916,22.922,6.916,40.219 c0,3.616,0.068,7.649,0.141,11.92c0.315,18.551,0.707,41.638-4.485,49.53C155.684,351.358,145.407,357.152,127.189,357.152z M94.095,245.082l0.354,0.354c-5.214,5.214-5.619,31.559-5.619,39.51c0,3.954-0.069,8.19-0.142,12.674 c-0.324,19.895-0.692,42.445,5.009,48.146c1.424,1.425,4.707,4.166,10.693,6.521c6.512,2.563,14.182,3.862,22.799,3.862 c8.131,0,15.461-1.204,21.198-3.481c4.501-1.786,8.046-4.273,9.723-6.822c5.022-7.635,4.634-30.55,4.32-48.962 c-0.072-4.274-0.141-8.313-0.141-11.938c0-16.263-0.787-33.674-6.623-39.51c-4.686-4.687-3.144-14.951-2.661-17.551 l-56.191-1.637c0.438,2.874,1.958,14.864-2.366,19.188L94.095,245.082z" />
                         {/* Shine */}
                         <path fill="#ffffff" opacity=".3" d="M142.733,255.863c0,0,6.562,25.823,5.308,46.131c-1.254,20.309-2.243,41.619-6.909,46.132 c2.856,0,6.617,0,6.617,0s8.546-17.048,6.532-59.419c-1.507-31.725-6.24-32.844-6.24-32.844H142.733z"/>
                         
                         <g id="jar-lid" ref={lidRef} style={{ transformBox: "fill-box" }}> 
                            <path fill="#66A8B8" d="M123.915,238.544c-20.448,0-27.468-2.229-29.251-4.012c-1.783-1.783,0.223-3.789,0-5.349 c-0.223-1.561-1.56-3.454,0-5.795c1.56-2.34,14.441-3.454,30.901-3.454s28.717,1.783,30.166,4.123 c1.449,2.34-0.334,2.897-0.445,5.182s1.003,3.51,0.223,4.847C154.728,235.424,144.141,238.544,123.915,238.544z"/>
                            <path fill="#27525C" d="M123.915,239.046c-22.141,0-28.053-2.605-29.606-4.159c-1.362-1.362-0.864-2.848-0.464-4.041 c0.198-0.591,0.385-1.149,0.322-1.592c-0.05-0.352-0.17-0.744-0.297-1.16c-0.413-1.351-0.925-3.031,0.376-4.983 c2.133-3.199,20.537-3.678,31.318-3.678c13.883,0,28.727,1.349,30.592,4.361c1.042,1.683,0.595,2.664,0.162,3.613 c-0.243,0.535-0.495,1.089-0.534,1.856c-0.045,0.921,0.128,1.671,0.28,2.332c0.215,0.934,0.418,1.814-0.124,2.743 c-0.836,1.432-6.984,2.637-8.849,2.972C142.687,238.102,135.088,239.046,123.915,239.046z M125.564,220.436 c-20.91,0-29.49,1.741-30.483,3.231c-1.038,1.557-0.638,2.867-0.251,4.135c0.138,0.453,0.27,0.882,0.331,1.311 c0.097,0.678-0.137,1.377-0.364,2.052c-0.376,1.122-0.701,2.09,0.222,3.014c1.163,1.162,6.304,3.865,28.897,3.865 c21.123,0,30.635-3.353,31.16-4.21c0.326-0.559,0.229-1.074,0.014-2.012c-0.159-0.689-0.356-1.547-0.305-2.606 c0.047-0.96,0.353-1.631,0.622-2.224c0.41-0.9,0.658-1.442-0.102-2.67C154.137,222.438,143.318,220.436,125.564,220.436z"/>
                         </g>
                      </g>

                      {/* Layer 4: Flying Star (Top) */}
                      <g ref={starGroupRef} style={{ display: "none" }}>
                        <path 
                           fill="#ffd36b" stroke="#ffb84d" strokeWidth="2" 
                           transform="translate(-122, -22)"
                           d="M123.636,2.703l6.979,14.141c0.116,0.232,0.339,0.396,0.596,0.431 l15.604,2.267c0.648,0.096,0.905,0.89,0.438,1.345l-11.294,11.008c-0.187,0.181-0.271,0.443-0.227,0.699l2.665,15.544 c0.111,0.643-0.563,1.135-1.143,0.832l-13.959-7.337c-0.229-0.122-0.503-0.122-0.734,0l-13.958,7.337 c-0.579,0.303-1.255-0.188-1.144-0.832l2.666-15.544c0.044-0.256-0.041-0.518-0.227-0.699L98.605,20.887 c-0.469-0.455-0.209-1.249,0.436-1.345l15.608-2.267c0.256-0.036,0.478-0.199,0.593-0.431l6.98-14.141 C122.511,2.116,123.347,2.116,123.636,2.703z" 
                        />
                      </g>
                    </g>
                  </svg>
                </div>
                
                <button className={styles.dropBtn} onClick={handleDrop} disabled={!wishText.trim() || isAnimating}>
                  {isAnimating ? "Dropping..." : "Drop into bottle"}
                </button>
                <p className={styles.helper}>Enter a wish above.</p>
              </div>
            </div>

            {wishes.length > 0 && <div className={styles.sep} />}
            
            <div className={styles.listWrap}>
              {wishes.length === 0 ? (
                <div className={styles.empty}>No wishes yet — be the first!</div>
              ) : (
                <ul className={styles.wishList}>
                  {wishes.map((w) => (
                    <li key={w.id} className={styles.wishItem}>
                      <div>
                        <div className={styles.wishText}>{w.text}</div>
                        {w.restaurant && <div className={styles.wishSub}>{w.restaurant}</div>}
                      </div>
                      <button className={styles.deleteBtn} onClick={() => removeWish(w.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}