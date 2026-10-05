import numpy as np
from scipy.integrate import quad

f = lambda x: np.exp(-x**2)
value, error = quad(f, 0, 1)

print("Integral =", value)
print("Estimated error =", error)
