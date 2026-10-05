# Core Python: variables, lists and loops
temperatures = [298.0, 310.0, 325.0, 350.0]

for temperature in temperatures:
    kelvin = temperature
    celsius = kelvin - 273.15
    print(f"{kelvin:6.1f} K = {celsius:5.1f} °C")
