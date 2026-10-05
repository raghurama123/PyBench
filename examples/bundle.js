window.PY_EXAMPLE_BUNDLE = {
  "catalog": {
    "modules": [
      {
        "name": "Core Python",
        "slug": "core",
        "examples": [
          {
            "title": "Variables, lists and loops",
            "file": "core/variables_lists_loops.py",
            "description": "A compact introduction to values, lists, loops and formatted output.",
            "tags": [
              "variables",
              "lists",
              "loops"
            ]
          },
          {
            "title": "Functions",
            "file": "core/functions.py",
            "description": "Define and call a function, including a default argument.",
            "tags": [
              "functions",
              "arguments"
            ]
          }
        ]
      },
      {
        "name": "NumPy",
        "slug": "numpy",
        "examples": [
          {
            "title": "Arrays and vectorized operations",
            "file": "numpy/arrays.py",
            "description": "Create arrays and compare vectorized expressions with scalar-style thinking.",
            "tags": [
              "array",
              "vectorization"
            ]
          },
          {
            "title": "Linear algebra",
            "file": "numpy/linear_algebra.py",
            "description": "Solve a small system of simultaneous linear equations.",
            "tags": [
              "linalg",
              "solve"
            ]
          }
        ]
      },
      {
        "name": "SciPy",
        "slug": "scipy",
        "examples": [
          {
            "title": "Numerical integration",
            "file": "scipy/integration.py",
            "description": "Use scipy.integrate.quad to evaluate a definite integral.",
            "tags": [
              "integrate",
              "quad"
            ]
          },
          {
            "title": "Curve fitting",
            "file": "scipy/curve_fit.py",
            "description": "Fit a straight line to noisy data with scipy.optimize.curve_fit.",
            "tags": [
              "optimize",
              "fit"
            ]
          }
        ]
      },
      {
        "name": "pandas",
        "slug": "pandas",
        "examples": [
          {
            "title": "Create and inspect a DataFrame",
            "file": "pandas/dataframe_basics.py",
            "description": "Construct a DataFrame and inspect columns, summary statistics and filtered rows.",
            "tags": [
              "DataFrame",
              "describe",
              "filter"
            ]
          }
        ]
      },
      {
        "name": "Matplotlib",
        "slug": "matplotlib",
        "examples": [
          {
            "title": "Line plot",
            "file": "matplotlib/line_plot.py",
            "description": "Make a labelled line plot. It appears in the Plot panel below the editor.",
            "tags": [
              "plot",
              "labels"
            ]
          },
          {
            "title": "Scatter plot",
            "file": "matplotlib/scatter_plot.py",
            "description": "Create a scatter plot from NumPy arrays.",
            "tags": [
              "scatter",
              "numpy"
            ]
          }
        ]
      },
      {
        "name": "Scikit-learn",
        "slug": "scikit-learn",
        "examples": [
          {
            "title": "Linear regression",
            "file": "scikit-learn/linear_regression.py",
            "description": "Fit a simple linear regression model using scikit-learn and use it to make predictions.",
            "tags": [
              "linear regression",
              "machine learning",
              "regression",
              "numpy",
              "sklearn"
            ]
          }
        ]
      }
    ]
  },
  "files": {
    "core/variables_lists_loops.py": "# Core Python: variables, lists and loops\ntemperatures = [298.0, 310.0, 325.0, 350.0]\n\nfor temperature in temperatures:\n    kelvin = temperature\n    celsius = kelvin - 273.15\n    print(f\"{kelvin:6.1f} K = {celsius:5.1f} °C\")\n",
    "core/functions.py": "# Core Python: functions\ndef kinetic_energy(mass, velocity=1.0):\n    \"\"\"Return 1/2 m v^2.\"\"\"\n    return 0.5 * mass * velocity**2\n\nprint(kinetic_energy(2.0, 3.0))\nprint(kinetic_energy(2.0))\n",
    "numpy/arrays.py": "import numpy as np\n\nx = np.linspace(0, 5, 6)\ny = x**2 + 2*x + 1\n\nprint(\"x =\", x)\nprint(\"y =\", y)\nprint(\"mean(y) =\", np.mean(y))\n",
    "numpy/linear_algebra.py": "import numpy as np\n\nA = np.array([[2.0, 1.0], [1.0, -1.0]])\nb = np.array([5.0, 1.0])\n\nsolution = np.linalg.solve(A, b)\nprint(\"solution =\", solution)\nprint(\"check =\", A @ solution)\n",
    "scipy/integration.py": "import numpy as np\nfrom scipy.integrate import quad\n\nf = lambda x: np.exp(-x**2)\nvalue, error = quad(f, 0, 1)\n\nprint(\"Integral =\", value)\nprint(\"Estimated error =\", error)\n",
    "scipy/curve_fit.py": "import numpy as np\nfrom scipy.optimize import curve_fit\n\nx = np.array([0, 1, 2, 3, 4], dtype=float)\ny = np.array([1.1, 2.9, 5.2, 6.8, 9.1])\n\ndef line(x, m, c):\n    return m*x + c\n\nparams, covariance = curve_fit(line, x, y)\nprint(\"slope, intercept =\", params)\n",
    "pandas/dataframe_basics.py": "import pandas as pd\n\ndata = {\n    \"student\": [\"A\", \"B\", \"C\", \"D\"],\n    \"score\": [72, 85, 91, 68],\n    \"hours\": [3.0, 4.5, 5.0, 2.5]\n}\n\ndf = pd.DataFrame(data)\nprint(df)\nprint(\"\\nSummary:\")\nprint(df.describe(numeric_only=True))\nprint(\"\\nScores >= 80:\")\nprint(df[df[\"score\"] >= 80])\n",
    "matplotlib/line_plot.py": "import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(0, 2*np.pi, 200)\ny = np.sin(x)\n\nplt.plot(x, y)\nplt.xlabel(\"x\")\nplt.ylabel(\"sin(x)\")\nplt.title(\"A simple sine curve\")\nplt.tight_layout()\nplt.show()\n",
    "matplotlib/scatter_plot.py": "import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.arange(1, 11)\ny = np.array([2.1, 3.8, 6.2, 7.7, 10.4, 11.8, 14.1, 16.3, 17.8, 20.2])\n\nplt.scatter(x, y)\nplt.xlabel(\"x\")\nplt.ylabel(\"y\")\nplt.title(\"Scatter plot\")\nplt.tight_layout()\nplt.show()\n",
    "scikit-learn/linear_regression.py": "from sklearn.linear_model import LinearRegression\nimport numpy as np\n\nX = np.array([[1], [2], [3], [4], [5]])\ny = np.array([2.1, 4.0, 6.2, 8.1, 10.2])\n\nmodel = LinearRegression()\nmodel.fit(X, y)\n\nprint(\"Slope:\", model.coef_[0])\nprint(\"Intercept:\", model.intercept_)\nprint(\"Prediction for x=6:\", model.predict([[6]])[0])\n\n"
  }
};
