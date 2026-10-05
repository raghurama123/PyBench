import numpy as np
from scipy.optimize import curve_fit

x = np.array([0, 1, 2, 3, 4], dtype=float)
y = np.array([1.1, 2.9, 5.2, 6.8, 9.1])

def line(x, m, c):
    return m*x + c

params, covariance = curve_fit(line, x, y)
print("slope, intercept =", params)
