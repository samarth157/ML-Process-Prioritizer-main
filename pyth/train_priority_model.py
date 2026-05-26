import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os

DATA_CSV = "process_data.csv"
MODEL_FILE = "priority_model.pkl"

def simulate_process_data(n=500, seed=42):
    np.random.seed(seed)
    data = []
    for _ in range(n):
        cpu_util = np.random.uniform(0, 100)
        mem_usage = np.random.randint(100000, 2000000)
        sys_load = np.random.uniform(0, 10)
        age = np.random.randint(0, 20)
        # Example rule for priority: higher cpu/mem/age = higher priority
        priority = int(
            1 + (cpu_util > 70) + (mem_usage > 1000000) + (sys_load > 5) + (age > 10)
        )
        priority = min(priority, 5)
        data.append([cpu_util, mem_usage, sys_load, age, priority])
    df = pd.DataFrame(data, columns=["cpu_util", "mem_usage", "sys_load", "age", "priority"])
    return df

def save_data(df, path=DATA_CSV):
    df.to_csv(path, index=False)

def load_data(path=DATA_CSV):
    return pd.read_csv(path)

def preprocess(df):
    X = df[["cpu_util", "mem_usage", "sys_load", "age"]]
    y = df["priority"]
    return X, y

def train_and_evaluate(X, y):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    print("Classification Report:\n", classification_report(y_test, y_pred))
    return clf

def save_model(clf, path=MODEL_FILE):
    joblib.dump(clf, path)
    print(f"Model saved to {path}")

def load_model(path=MODEL_FILE):
    return joblib.load(path)

def predict_priority(model, cpu_util, mem_usage, sys_load, age):
    X_new = np.array([[cpu_util, mem_usage, sys_load, age]])
    return int(model.predict(X_new)[0])

if __name__ == "__main__":
    # 1. Simulate and save data if not exists
    if not os.path.exists(DATA_CSV):
        df = simulate_process_data(n=1000)
        save_data(df)
        print(f"Simulated data saved to {DATA_CSV}")
    else:
        df = load_data()
        print(f"Loaded data from {DATA_CSV}")

    # 2. Preprocess
    X, y = preprocess(df)

    # 3. Train and evaluate
    clf = train_and_evaluate(X, y)

    # 4. Save model
    save_model(clf)

    # 5. Example prediction
    print("Example prediction:")
    example = X.iloc[0]
    pred = predict_priority(clf, *example)
    print(f"Input: {example.values}, Predicted priority: {pred}")
