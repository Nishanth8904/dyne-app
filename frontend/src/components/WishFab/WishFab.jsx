import React, { useEffect, useRef, useState } from "react";
import styles from "./WishFab.module.css";
import { Star, X } from "lucide-react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

const STORAGE_KEY = "dyne_wishlist_v1";

export default function WishFab() {
  const [open, setOpen] = useState(false);
  const [wishes, setWishes] = useState([]);
  const [wishText, setWishText] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const starLayerRef = useRef(null);
  const jarRef = useRef(null);
  const lidRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setWishes(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
  }, [wishes]);

  // create flying star, then leave an in-jar animated star
  function animateStarDrop() {
    if (!jarRef.current || !starLayerRef.current) return;

    const fab = document.querySelector(`.${styles.wishFab}`);
    const fabRect = fab.getBoundingClientRect();
    const jarRect = jarRef.current.getBoundingClientRect();

    // create flying star node (fixed so it can travel across screen)
    const star = document.createElement("div");
    star.className = styles.tempStar;
    star.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="#ffd86b" stroke="#ffb84d" stroke-width="0.6" >
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.856 1.402-8.168L.132 9.21l8.2-1.192z"/>
    </svg>`;
    document.body.appendChild(star);

    gsap.set(star, {
      position: "fixed",
      left: fabRect.left + fabRect.width / 2,
      top: fabRect.top + fabRect.height / 2,
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      rotate: -20,
      zIndex: 99999,
      pointerEvents: "none",
      filter: "drop-shadow(0 6px 14px rgba(255,200,90,0.28))",
    });

    const targetX = jarRect.left + jarRect.width * (0.52 + (Math.random() - 0.5) * 0.14);
    const targetY = jarRect.top + jarRect.height * (0.52 + (Math.random() - 0.15) * 0.18);

    const tl = gsap.timeline({
      onComplete: () => {
        // create persistent in-jar star
        const inside = document.createElement("div");
        inside.className = styles.inJarStar;
        // position inside relative to jar container
        const offsetLeft = targetX - jarRect.left;
        const offsetTop = targetY - jarRect.top;
        inside.style.left = `${offsetLeft}px`;
        inside.style.top = `${offsetTop}px`;
        inside.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#ffd86b" stroke="#ffb84d" stroke-width="0.4">
          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.856 1.402-8.168L.132 9.21l8.2-1.192z"/>
        </svg>`;
        starLayerRef.current.appendChild(inside);

        // small float/orbit animation inside jar
        const randX = (Math.random() - 0.5) * 10; // px
        const randY = (Math.random() - 0.5) * 8; // px
        gsap.to(inside, {
          duration: 3 + Math.random() * 2,
          x: randX,
          y: randY,
          rotation: 360,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "center",
        });

        // gentle scale pulse to make it glow
        gsap.to(inside, {
          duration: 1.6,
          scale: 1.06,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        // cleanup flying star node
        if (star && star.parentNode) star.parentNode.removeChild(star);
      },
    });

    tl.to(star, { duration: 0.22, scale: 1.06, ease: "power2.out" });
    tl.to(
      star,
      {
        duration: 0.9,
        ease: "power1.inOut",
        motionPath: {
          path: [
            { x: fabRect.left + fabRect.width / 2, y: fabRect.top + fabRect.height / 2 },
            { x: (fabRect.left + targetX) / 2 + (Math.random() - 0.5) * 90, y: fabRect.top - 80 },
            { x: targetX, y: targetY },
          ],
          curviness: 0.9,
        },
        rotation: 360,
      },
      "<"
    );
    tl.to(star, { duration: 0.32, scale: 0.9, y: "+=4", ease: "bounce.out" }, "+=0");
    tl.to(star, { duration: 0.36, opacity: 0, scale: 0.3, ease: "power2.in" }, "+=0.12");
  }

  // drop handler (open lid -> animate star -> close lid and save wish)
  function handleDrop() {
    if (!wishText.trim()) return;

    // open lid
    gsap.to(lidRef.current, { duration: 0.45, rotation: -75, transformOrigin: "50% 70%", ease: "back.out(1.2)" });

    // animate drop
    animateStarDrop();

    // after short delay, close lid and persist wish
    setTimeout(() => {
      gsap.to(lidRef.current, { duration: 0.7, rotation: 0, transformOrigin: "50% 70%", ease: "elastic.out(1, 0.7)" });

      const newWish = {
        id: Date.now(),
        text: wishText.trim(),
        restaurant: restaurant.trim(),
        createdAt: new Date().toISOString(),
      };
      setWishes((p) => [newWish, ...p]);
      setWishText("");
      setRestaurant("");
    }, 900);
  }

  function removeWish(id) {
    setWishes((p) => p.filter((w) => w.id !== id));
  }

  return (
    <>
      <button aria-label="Wishlist" className={styles.wishFab} onClick={() => setOpen(true)} title="Wishlist">
        <Star size={20} />
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.card} onClick={(e) => e.stopPropagation()}>
            <header className={styles.header}>
              <h3>Wish Jar</h3>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <div className={styles.content}>
              <div className={styles.left}>
                <label className={styles.label}>
                  Your wish
                  <input className={styles.input} value={wishText} onChange={(e) => setWishText(e.target.value)} placeholder="I wish … (e.g. more biryani deals)" />
                </label>
                <label className={styles.label}>
                  Restaurant (optional)
                  <input className={styles.input} value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="e.g. Sharma's Dhaba" />
                </label>
              </div>

              <div className={styles.right}>
                <div className={styles.jarArea}>
                  <div className={styles.jarInner} ref={jarRef}>
                    <svg viewBox="0 0 160 240" className={styles.jarSvg} aria-hidden>
                      <g id="jarBase">
                        <ellipse cx="80" cy="28" rx="34" ry="11" fill="#cfeef4" />
                        <g id="lid-group" ref={lidRef}>
                          <ellipse cx="80" cy="26" rx="38" ry="10" fill="#cfeef4" />
                        </g>
                        <rect x="50" y="40" rx="26" width="60" height="150" fill="#ffffff" stroke="#16393a" strokeWidth="2.6" />
                        <ellipse cx="80" cy="196" rx="34" ry="10" fill="#eaf6f7" />
                      </g>
                    </svg>

                    <div className={styles.starLayer} ref={starLayerRef} />
                  </div>

                  <div className={styles.controls}>
                    <button className={styles.dropBtn} onClick={handleDrop} disabled={!wishText.trim()}>
                      Drop into bottle
                    </button>
                    <p className={styles.helper}>Click the bottle to drop a random star. Enter a wish above.</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className={styles.sep} />

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
                      <button className={styles.deleteBtn} onClick={() => removeWish(w.id)}>
                        ✕
                      </button>
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