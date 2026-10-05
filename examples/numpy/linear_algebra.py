import numpy as np

A = np.array([[2.0, 1.0], [1.0, -1.0]])
b = np.array([5.0, 1.0])

solution = np.linalg.solve(A, b)
print("solution =", solution)
print("check =", A @ solution)
