from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
import numpy as np

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


df = pd.read_csv("food_dataset.csv")

X = df[["Age", "Food_Type", "Dish", "Spice_Level", "Time"]]
y = df["Rating"]

preprocess = ColumnTransformer(
    transformers=[
        ("num", "passthrough", ["Age"]),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["Food_Type", "Dish", "Spice_Level", "Time"]),
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


def recommend_for_user(age, food_type, spice_level, time):
    candidates = pd.DataFrame({
        "Age": [age] * len(unique_dishes),
        "Food_Type": [food_type] * len(unique_dishes),
        "Dish": unique_dishes,
        "Spice_Level": [spice_level] * len(unique_dishes),
        "Time": [time] * len(unique_dishes)
    })

    preds = pipe.predict(candidates)
    candidates["Predicted_Rating"] = preds

    return (
        candidates.sort_values("Predicted_Rating", ascending=False)
        .head(5)
        .to_dict(orient="records")
    )


@app.get("/recommendations")
def get_recommendations(
    age: int,
    food_type: str = "Biryani",
    spice_level: str = "Spicy",
    time: str = "Afternoon"
):
    if age <= 0:
        raise HTTPException(400, "Invalid age")

    recs = recommend_for_user(age, food_type, spice_level, time)
    return {"recommendations": recs}