import os
import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score


# Get the directory containing this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.join(BASE_DIR, "data", "training_data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")

os.makedirs(MODEL_DIR, exist_ok=True)


# Load training dataset
data = pd.read_csv(DATA_PATH)

# Clean the dataset
data = data.dropna(subset=["description", "category"])
data["description"] = data["description"].astype(str).str.strip()
data["category"] = data["category"].astype(str).str.strip()
data = data[
    (data["description"] != "") &
    (data["category"] != "")
]

print("Training examples:", len(data))
print("\nCategory counts:")
print(data["category"].value_counts())


# Input and target
X = data["description"]
y = data["category"]


# TF-IDF + Logistic Regression pipeline
pipeline = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            sublinear_tf=True
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            random_state=42
        )
    )
])


# Train the model
pipeline.fit(X, y)

print("\nModel trained successfully!")


# Test representative descriptions
test_descriptions = [
    "Purchased a new laptop",
    "ASUS GT-TP3402VAO AP1600 ASUS BACKPACK CW101-KB+MS/BK",
    "Laptop computer and computer accessories",
    "Hotel reservation for business trip",
    "Dinner at a restaurant",
    "Bought office stationery"
]

print("\nTest predictions:")

for description in test_descriptions:
    prediction = pipeline.predict([description])[0]
    print(f"{description} -> {prediction}")


# Save the complete pipeline
MODEL_PATH = os.path.join(MODEL_DIR, "expense_pipeline.pkl")
joblib.dump(pipeline, MODEL_PATH)

print("\nComplete model pipeline saved to:")
print(MODEL_PATH)
