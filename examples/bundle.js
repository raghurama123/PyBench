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
          },
          {
            "title": "Read CSV and Select Columns",
            "file": "pandas/read_csv_columns.py",
            "description": "Read CSV data, inspect column headers, and select specific columns by name.",
            "tags": [
              "csv",
              "read_csv",
              "columns",
              "selection",
              "filtering"
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
    "pandas/read_csv_columns.py": "import pandas as pd\nfrom io import StringIO\n\n# Sample CSV data\ncsv_data = \"\"\"Name,Age,Department,Score\nAlice,24,Physics,85\nBob,30,Chemistry,92\nCharlie,22,Physics,78\nDiana,28,Biology,95\nEva,26,Chemistry,88\n\"\"\"\n\n# For the sample data defined above, use:\ndf = pd.read_csv(StringIO(csv_data))\n\n# Read CSV into a DataFrame\n\n# To read your own CSV file, replace the line above with:\n# df = pd.read_csv(\"mydata.csv\")\n#\n# Change \"mydata.csv\" to your actual CSV filename.\n# Example:\n# df = pd.read_csv(\"experiment.csv\")\n#\n# If the file is in another folder, specify its path:\n# df = pd.read_csv(\"data/experiment.csv\")\n#\n# Note: In PyPLab (Pyodide), the CSV file must first be\n# uploaded or made available in the virtual filesystem.\n\n\nprint(\"Original CSV data:\")\nprint(df)\n\n# Display available column titles\nprint(\"\\nAvailable columns:\")\nprint(df.columns.tolist())\n\n# Select a single column by title\nprint(\"\\nSelect 'Name':\")\nprint(df[\"Name\"])\n\n# Select multiple columns by titles\nprint(\"\\nSelect Name and Score:\")\nselected = df[[\"Name\", \"Score\"]]\nprint(selected)\n\n# Select columns and filter rows\nprint(\"\\nStudents with Score > 85:\")\nprint(df.loc[df[\"Score\"] > 85, [\"Name\", \"Score\"]])\n\n",
    "matplotlib/line_plot.py": "import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(0, 2*np.pi, 200)\ny = np.sin(x)\n\nplt.plot(x, y)\nplt.xlabel(\"x\")\nplt.ylabel(\"sin(x)\")\nplt.title(\"A simple sine curve\")\nplt.tight_layout()\nplt.show()\n",
    "matplotlib/scatter_plot.py": "import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.arange(1, 11)\ny = np.array([2.1, 3.8, 6.2, 7.7, 10.4, 11.8, 14.1, 16.3, 17.8, 20.2])\n\nplt.scatter(x, y)\nplt.xlabel(\"x\")\nplt.ylabel(\"y\")\nplt.title(\"Scatter plot\")\nplt.tight_layout()\nplt.show()\n",
    "scikit-learn/linear_regression.py": "Linear Regression using Scikit-learn\n-----------------------------------\nThis example demonstrates:\n1. Creating a simple dataset\n2. Training a linear regression model\n3. Making predictions\n4. Evaluating model performance\n5. Visualizing the regression line\n\nRequired packages:\n    numpy\n    matplotlib\n    scikit-learn\n\"\"\"\n\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.metrics import mean_squared_error, r2_score\n\n\n# -----------------------------------\n# 1. Create sample data\n# -----------------------------------\n\n# X represents the input feature\n# y represents the target variable\n\nX = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).reshape(-1, 1)\n\ny = np.array([2.1, 4.2, 5.8, 8.3, 10.1,\n              12.2, 13.9, 16.1, 18.2, 19.8])\n\n\n# -----------------------------------\n# 2. Create and train the model\n# -----------------------------------\n\nmodel = LinearRegression()\n\nmodel.fit(X, y)\n\n\n# -----------------------------------\n# 3. Model parameters\n# -----------------------------------\n\nslope = model.coef_[0]\nintercept = model.intercept_\n\nprint(\"Linear Regression Model\")\nprint(\"-----------------------\")\nprint(f\"Slope       : {slope:.4f}\")\nprint(f\"Intercept   : {intercept:.4f}\")\n\nprint(f\"\\nRegression equation:\")\nprint(f\"y = {slope:.4f}x + {intercept:.4f}\")\n\n\n# -----------------------------------\n# 4. Make predictions\n# -----------------------------------\n\ny_pred = model.predict(X)\n\n# Predict for a new input value\nnew_X = np.array([[12]])\n\nnew_prediction = model.predict(new_X)\n\nprint(f\"\\nPrediction for x = 12:\")\nprint(f\"Predicted y = {new_prediction[0]:.4f}\")\n\n\n# -----------------------------------\n# 5. Evaluate the model\n# -----------------------------------\n\nmse = mean_squared_error(y, y_pred)\nr2 = r2_score(y, y_pred)\n\nprint(\"\\nModel Evaluation\")\nprint(\"----------------\")\nprint(f\"Mean Squared Error : {mse:.4f}\")\nprint(f\"R-squared Score    : {r2:.4f}\")\n\n\n# -----------------------------------\n# 6. Visualize results\n# -----------------------------------\n\nplt.figure(figsize=(8, 5))\n\n# Original data\nplt.scatter(\n    X.ravel(),\n    y,\n    color=\"blue\",\n    label=\"Original Data\",\n    s=60\n)\n\n# Regression line\nplt.plot(\n    X.ravel(),\n    y_pred,\n    color=\"red\",\n    linewidth=2,\n    label=\"Linear Regression Fit\"\n)\n\n# New prediction\nplt.scatter(\n    new_X.ravel(),\n    new_prediction,\n    color=\"green\",\n    marker=\"*\",\n    s=180,\n    label=\"Prediction at x=12\"\n)\n\nplt.title(\"Linear Regression using Scikit-learn\")\nplt.xlabel(\"Input Feature (X)\")\nplt.ylabel(\"Target Variable (y)\")\n\nplt.legend()\nplt.grid(True, alpha=0.3)\nplt.tight_layout()\n\nplt.show()\n"
  }
};
