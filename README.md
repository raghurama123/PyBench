# PyPLab

**PyPLab** is a browser-based interactive environment for learning and practicing Python programming.

It provides ready-to-run examples organized by module and allows students to load an example into the editor, modify the code, run it directly in the browser, and inspect the output.

The current example library includes:

- Core Python
- NumPy
- SciPy
- pandas
- Matplotlib

PyPLab can also be used as a lightweight Python workbench for writing and running your own code. Python runs locally in the browser using Pyodide, so no local Python installation is required.

## Adding a New Example

Examples are stored as ordinary Python (`.py`) files inside the `examples/` directory.

For example, suppose you want to add a NumPy example demonstrating random-number generation.

### 1. Create the Python file

Create:

```text
examples/numpy/random_numbers.py
```

with the following code:

```python
import numpy as np

rng = np.random.default_rng(42)

x = rng.normal(
    loc=0.0,
    scale=1.0,
    size=10
)

print("Random values:")
print(x)

print("\nMean =", x.mean())
print("Standard deviation =", x.std())
```

### 2. Add the example to the catalog

Add an entry under the NumPy section of:

```text
examples/catalog.json
```

For example:

```json
{
  "title": "Random numbers",
  "file": "numpy/random_numbers.py",
  "description": "Generate normally distributed random numbers and calculate simple statistics.",
  "tags": [
    "random",
    "normal distribution",
    "mean",
    "standard deviation"
  ]
}
```

### 3. Rebuild the example library

From the main PyPLab directory, run:

```bash
python build_examples.py
```

This regenerates:

```text
examples/bundle.js
```

which makes the examples available to the browser interface.

### 4. Reload PyPLab

After reloading the page, the new example should appear as:

```text
Module: NumPy
Example: Random numbers
```

The example can then be loaded into the editor, modified, and executed.

## Example Directory Structure

A typical example library may look like:

```text
examples/
├── catalog.json
├── bundle.js
├── core/
│   ├── functions.py
│   └── variables_lists_loops.py
├── numpy/
│   ├── arrays.py
│   ├── linear_algebra.py
│   └── random_numbers.py
├── scipy/
│   ├── integration.py
│   └── curve_fit.py
├── pandas/
│   └── dataframe_basics.py
└── matplotlib/
    ├── line_plot.py
    └── scatter_plot.py
```

Thus, adding teaching material generally requires only:

```text
1. Add a .py example file.
2. Add its entry to examples/catalog.json.
3. Run python build_examples.py.
4. Reload PyPLab.
```
