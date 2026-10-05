import numpy as np
import matplotlib.pyplot as plt

x = np.arange(1, 11)
y = np.array([2.1, 3.8, 6.2, 7.7, 10.4, 11.8, 14.1, 16.3, 17.8, 20.2])

plt.scatter(x, y)
plt.xlabel("x")
plt.ylabel("y")
plt.title("Scatter plot")
plt.tight_layout()
plt.show()
