# Core Python: functions
def kinetic_energy(mass, velocity=1.0):
    """Return 1/2 m v^2."""
    return 0.5 * mass * velocity**2

print(kinetic_energy(2.0, 3.0))
print(kinetic_energy(2.0))
