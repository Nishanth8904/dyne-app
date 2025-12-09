// src/components/FoodGame/FoodGame.jsx
import { useEffect, useState } from "react";
import styles from "./FoodGame.module.css";

const DISHES = [
  { id: "biryani", label: "Biryani", img: "/dishes/biryani.png" },
  { id: "shawarma", label: "Shawarma & Rolls", img: "/dishes/shawarma.png" },
  { id: "veg", label: "Veg Meals", img: "/dishes/meals.png" },
  { id: "tiffin", label: "Breakfast / Tiffin", img: "/dishes/tiffin.png" },
  { id: "dessert", label: "Dessert & Sweets", img: "/dishes/dessert.png" },
  { id: "pizza", label: "Pizza & Fast Food", img: "/dishes/pizza.png" },
];

function FoodGame() {
  // which dish is chosen
  const [selectedDish, setSelectedDish] = useState(null);

  // player & falling item state
  const [x, setX] = useState(210); // player x
  const [fallY, setFallY] = useState(0);
  const [fallX, setFallX] = useState(210);
  const [size, setSize] = useState(56);

  // gameplay state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [speed, setSpeed] = useState(5);
  const [alive, setAlive] = useState(true);

  const [highScore, setHighScore] = useState(
    Number(localStorage.getItem("dyne_drop_runner_highscore") || 0)
  );

  // helper: reset the falling dish
  const resetDrop = () => {
    setFallY(0);
    setFallX(60 + Math.random() * 300); // somewhere within board
    setSize(40 + Math.random() * 28); // random size → harder/easier
  };

  // start new game for a dish
  const startWithDish = (dish) => {
    setSelectedDish(dish);
    setScore(0);
    setCombo(0);
    setLives(3);
    setSpeed(5);
    setAlive(true);
    setX(210);
    resetDrop();
  };

  // player movement
  useEffect(() => {
    if (!selectedDish || !alive) return;

    const handleKey = (e) => {
      if (e.key === "ArrowLeft") {
        setX((prev) => Math.max(60, prev - 24));
      } else if (e.key === "ArrowRight") {
        setX((prev) => Math.min(360, prev + 24));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedDish, alive]);

  // falling loop
  useEffect(() => {
    if (!selectedDish || !alive) return;

    const id = setInterval(() => {
      setFallY((y) => y + speed);
    }, 30);

    return () => clearInterval(id);
  }, [selectedDish, alive, speed]);

  // collision + scoring + lives
  useEffect(() => {
    if (!selectedDish || !alive) return;

    // bottom of board (rough)
    if (fallY > 320) {
      const hit = Math.abs(fallX - x) < 60;

      if (hit) {
        const newCombo = combo + 1;
        const base = 1;
        const comboBonus = newCombo % 5 === 0 ? 3 : 0;
        const gained = base + comboBonus;

        const newScore = score + gained;

        setCombo(newCombo);
        setScore(newScore);

        // difficulty step every 10 points
        if (newScore % 10 === 0) {
          setSpeed((s) => Math.min(s + 1, 14));
        }

        resetDrop();
      } else {
        // missed → lose life
        setCombo(0);
        setLives((prev) => {
          const next = prev - 1;

          if (next <= 0) {
            // game over
            setAlive(false);

            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem(
                "dyne_drop_runner_highscore",
                String(score)
              );
            }
          } else {
            // still alive, drop a new item
            resetDrop();
          }

          return next;
        });
      }
    }
  }, [fallY, selectedDish, alive, fallX, x, combo, score, highScore]);

  // =======================
  //  SELECTION SCREEN
  // =======================
  if (!selectedDish) {
    return (
      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <span className={styles.smallTag}>Mini game</span>
            <h2 className={styles.mainTitle}>🍽 Choose Your Dish</h2>
            <p className={styles.subtitle}>
              Pick a dish and catch as many as you can. Use ← → to move the
              plate.
            </p>
          </div>

          <div className={styles.menu}>
            {DISHES.map((d) => (
              <button
                key={d.id}
                className={styles.tile}
                type="button"
                onClick={() => startWithDish(d)}
              >
                <div className={styles.tileImageWrap}>
                  <img
                    src={d.img}
                    alt={d.label}
                    className={styles.tileImage}
                  />
                </div>
                <span className={styles.tileLabel}>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // =======================
  //  GAME SCREEN
  // =======================
  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.gameHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              setSelectedDish(null);
              setAlive(false);
            }}
          >
            ← Change dish
          </button>

          <div className={styles.gameTitleBlock}>
            <h3 className={styles.gameTitle}>Drop Runner</h3>
            <span className={styles.chip}>{selectedDish.label}</span>
          </div>

          <div className={styles.scoreBadge}>Score: {score}</div>
        </div>

        <div className={styles.metaRow}>
          ❤️ Lives: {lives} &nbsp;·&nbsp; 🔥 Combo: {combo} &nbsp;·&nbsp; 🚀
          Speed: {speed} &nbsp;·&nbsp; 🏆 High score: {highScore}
        </div>

        <div className={styles.gameCard}>
          <div className={styles.gameArea}>
            {/* Falling dish */}
            <img
              src={selectedDish.img}
              alt=""
              className={styles.falling}
              style={{
                left: fallX,
                top: fallY,
                width: size,
                height: size,
              }}
            />

            {/* Player plate */}
            <div className={styles.player} style={{ left: x }} />

            {!alive && (
              <div className={styles.overlay}>
                <h2>Game Over 😢</h2>
                <p>Your score: {score}</p>
                <p>Best: {highScore}</p>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    setScore(0);
                    setCombo(0);
                    setLives(3);
                    setSpeed(5);
                    setAlive(true);
                    resetDrop();
                  }}
                >
                  Play again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FoodGame;