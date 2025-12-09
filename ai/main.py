from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
import numpy as np

app = FastAPI()

# CORS so frontend can call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Load dataset & train simple model ----------
df = pd.read_csv("food_dataset.csv")

X = df[["Age", "Food_Type", "Dish", "Spice_Level"]]
y = df["Rating"]

numeric_features = ["Age"]
categorical_features = ["Food_Type", "Dish", "Spice_Level"]

preprocess = ColumnTransformer(
    transformers=[
        ("num", "passthrough", numeric_features),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
    ]
)

model = RandomForestRegressor(n_estimators=200, random_state=42)

pipe = Pipeline(
    steps=[
        ("preprocess", preprocess),
        ("model", model),
    ]
)

pipe.fit(X, y)

unique_dishes = df["Dish"].unique()


def recommend_for_user(age: int, food_type: str, spice_level: str, top_n: int = 5):
    candidates = pd.DataFrame(
        {
            "Age": [age] * len(unique_dishes),
            "Food_Type": [food_type] * len(unique_dishes),
            "Dish": unique_dishes,
            "Spice_Level": [spice_level] * len(unique_dishes),
        }
    )

    preds = pipe.predict(candidates)
    candidates["Predicted_Rating"] = preds

    result = (
        candidates.sort_values("Predicted_Rating", ascending=False)
        .head(top_n)
        .to_dict(orient="records")
    )

    return result


@app.get("/recommendations")
def get_recommendations(age: int, food_type: str = "Non-Veg", spice_level: str = "Spicy"):
    """
    Example: /recommendations?age=21&food_type=Non-Veg&spice_level=Spicy
    """
    if age <= 0:
        raise HTTPException(status_code=400, detail="Invalid age")

    recs = recommend_for_user(age, food_type, spice_level, top_n=5)
    return {"recommendations": recs}