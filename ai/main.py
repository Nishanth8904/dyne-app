from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib

# =====================
# APP INIT
# =====================
app = FastAPI(title="SmartDine AI")

# ✅ CORS FIX (THIS IS THE IMPORTANT PART)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite / React
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# LOAD DATA & MODEL
# =====================
df = pd.read_csv("coimbatore_restaurants_comprehensive_dataset.csv")
model = joblib.load("model.pkl")
encoder = joblib.load("encoder.pkl")

print("✅ SmartDine AI ready")

# =====================
# HELPERS
# =====================
def score_row(row, age):
    base = row["overall_rating"]

    # age preference logic (simple personalization)
    if age < 25 and row["price_range"] == "$":
        base += 0.3
    if age > 30 and row["ambience_type"] in ["Family-style", "Luxury"]:
        base += 0.3

    return round(min(base, 5.0), 2)

# =====================
# RECOMMENDATION API
# =====================
@app.get("/recommendations")
def get_recommendations(
    age: int = Query(...),
    location: str = "",
    cuisine: str = "",
    price: str = "",
    ambience: str = "",
):
    data = df.copy()

    # ---- FILTERS ----
    if location:
        data = data[data["location_area"] == location]

    if cuisine:
        data = data[data["cuisine_type"] == cuisine]

    if price:
        data = data[data["price_range"] == price]

    if ambience:
        data = data[data["ambience_type"] == ambience]

    # ---- SCORING (AI-ish logic) ----
    data["ai_score"] = data.apply(lambda r: score_row(r, age), axis=1)

    top = data.sort_values("ai_score", ascending=False).head(10)

    results = []
    for _, r in top.iterrows():
        results.append({
            "restaurant": r["restaurant_name"],
            "location": r["location_area"],
            "cuisine": r["cuisine_type"],
            "price_range": r["price_range"],
            "avg_cost_for_two": int(r["avg_cost_for_two"]),
            "rating": r["overall_rating"],
            "ai_score": r["ai_score"],
            "popular_dishes": r["popular_dishes"],
            "address": r["address"],
            "opening_hours": r["opening_hours"],
            "contact": r["contact_number"],
        })

    return {"recommendations": results}


# =====================
# HEALTH CHECK
# =====================
@app.get("/")
def root():
    return {"status": "SmartDine AI running"}