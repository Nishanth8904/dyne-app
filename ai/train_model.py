import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.ensemble import HistGradientBoostingRegressor

# ==========================
# LOAD DATA
# ==========================
df = pd.read_csv("coimbatore_food_ai_dataset.csv")
print("✅ Dataset Loaded:", df.shape)

# ==========================
# FEATURE ENGINEERING (CRITICAL)
# ==========================

# Budget match score
df["budget_match"] = df["budget_range"].map({
    "budget-friendly": 1.0,
    "mid-range": 0.7,
    "premium": 0.4
})

# Cuisine match (proxy signal)
df["cuisine_match"] = np.where(
    df["food_preference"].isin(["vegetarian", "vegan"]) &
    df["cuisine_type"].isin(["Vegetarian", "South Indian"]),
    1.0,
    0.6
)

# Location signal
df["location_score"] = df["location_area"].map(
    df["location_area"].value_counts(normalize=True)
)

# Normalize restaurant rating
df["restaurant_rating_norm"] = df["restaurant_rating"] / 5.0

# ==========================
# TARGET: RELEVANCE SCORE
# ==========================
df["relevance_score"] = (
    0.4 * df["restaurant_rating_norm"] +
    0.3 * df["budget_match"] +
    0.2 * df["cuisine_match"] +
    0.1 * df["location_score"]
)

# ==========================
# FEATURES
# ==========================
FEATURES = [
    "age",
    "food_preference",
    "budget_range",
    "location_area",
    "time_of_day",
    "mood_craving",
    "occasion",
    "health_preference",
    "cuisine_type",
    "spice_level",
    "price_category",
    "ambience"
]

X = df[FEATURES]
y = df["relevance_score"]

# ==========================
# ENCODING
# ==========================
encoder = ColumnTransformer(
    [
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            X.columns.tolist()
        )
    ]
)

# ==========================
# MODEL
# ==========================
model = HistGradientBoostingRegressor(
    max_depth=8,
    learning_rate=0.07,
    max_iter=300,
    min_samples_leaf=30,
    random_state=42
)

pipeline = Pipeline(
    steps=[
        ("encoder", encoder),
        ("model", model)
    ]
)

# ==========================
# SPLIT & TRAIN
# ==========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

pipeline.fit(X_train, y_train)

# ==========================
# EVALUATION
# ==========================
preds = pipeline.predict(X_test)

rmse = np.sqrt(mean_squared_error(y_test, preds))
r2 = r2_score(y_test, preds)

print("\n✅ MODEL PERFORMANCE (RELEVANCE MODEL)")
print(f"RMSE: {rmse:.3f}")
print(f"R² : {r2:.3f}")
# ==========================
# SAVE (FINAL)
# ==========================
joblib.dump(pipeline, "model.pkl")
print("\n💾 Saved: model.pkl")