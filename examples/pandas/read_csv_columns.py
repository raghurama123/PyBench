import pandas as pd
from io import StringIO

# Sample CSV data
csv_data = """Name,Age,Department,Score
Alice,24,Physics,85
Bob,30,Chemistry,92
Charlie,22,Physics,78
Diana,28,Biology,95
Eva,26,Chemistry,88
"""

# For the sample data defined above, use:
df = pd.read_csv(StringIO(csv_data))

# Read CSV into a DataFrame

# To read your own CSV file, replace the line above with:
# df = pd.read_csv("mydata.csv")
#
# Change "mydata.csv" to your actual CSV filename.
# Example:
# df = pd.read_csv("experiment.csv")
#
# If the file is in another folder, specify its path:
# df = pd.read_csv("data/experiment.csv")
#
# Note: In PyPLab (Pyodide), the CSV file must first be
# uploaded or made available in the virtual filesystem.


print("Original CSV data:")
print(df)

# Display available column titles
print("\nAvailable columns:")
print(df.columns.tolist())

# Select a single column by title
print("\nSelect 'Name':")
print(df["Name"])

# Select multiple columns by titles
print("\nSelect Name and Score:")
selected = df[["Name", "Score"]]
print(selected)

# Select columns and filter rows
print("\nStudents with Score > 85:")
print(df.loc[df["Score"] > 85, ["Name", "Score"]])

