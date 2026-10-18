Linear Regression using Scikit-learn
-----------------------------------
This example demonstrates:
1. Creating a simple dataset
2. Training a linear regression model
3. Making predictions
4. Evaluating model performance
5. Visualizing the regression line

Required packages:
    numpy
    matplotlib
    scikit-learn
"""

import numpy as np
import matplotlib.pyplot as plt

from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score


# -----------------------------------
# 1. Create sample data
# -----------------------------------

# X represents the input feature
# y represents the target variable

X = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).reshape(-1, 1)

y = np.array([2.1, 4.2, 5.8, 8.3, 10.1,
              12.2, 13.9, 16.1, 18.2, 19.8])


# -----------------------------------
# 2. Create and train the model
# -----------------------------------

model = LinearRegression()

model.fit(X, y)


# -----------------------------------
# 3. Model parameters
# -----------------------------------

slope = model.coef_[0]
intercept = model.intercept_

print("Linear Regression Model")
print("-----------------------")
print(f"Slope       : {slope:.4f}")
print(f"Intercept   : {intercept:.4f}")

print(f"\nRegression equation:")
print(f"y = {slope:.4f}x + {intercept:.4f}")


# -----------------------------------
# 4. Make predictions
# -----------------------------------

y_pred = model.predict(X)

# Predict for a new input value
new_X = np.array([[12]])

new_prediction = model.predict(new_X)

print(f"\nPrediction for x = 12:")
print(f"Predicted y = {new_prediction[0]:.4f}")


# -----------------------------------
# 5. Evaluate the model
# -----------------------------------

mse = mean_squared_error(y, y_pred)
r2 = r2_score(y, y_pred)

print("\nModel Evaluation")
print("----------------")
print(f"Mean Squared Error : {mse:.4f}")
print(f"R-squared Score    : {r2:.4f}")


# -----------------------------------
# 6. Visualize results
# -----------------------------------

plt.figure(figsize=(8, 5))

# Original data
plt.scatter(
    X.ravel(),
    y,
    color="blue",
    label="Original Data",
    s=60
)

# Regression line
plt.plot(
    X.ravel(),
    y_pred,
    color="red",
    linewidth=2,
    label="Linear Regression Fit"
)

# New prediction
plt.scatter(
    new_X.ravel(),
    new_prediction,
    color="green",
    marker="*",
    s=180,
    label="Prediction at x=12"
)

plt.title("Linear Regression using Scikit-learn")
plt.xlabel("Input Feature (X)")
plt.ylabel("Target Variable (y)")

plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()

plt.show()
