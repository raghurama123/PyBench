import pandas as pd

data = {
    "student": ["A", "B", "C", "D"],
    "score": [72, 85, 91, 68],
    "hours": [3.0, 4.5, 5.0, 2.5]
}

df = pd.DataFrame(data)
print(df)
print("\nSummary:")
print(df.describe(numeric_only=True))
print("\nScores >= 80:")
print(df[df["score"] >= 80])
