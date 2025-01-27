from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class FuelMonitor:
    """Handles fuel monitoring and calculations"""

    def __init__(self, max_history: int = 5):
        self.current_lap_start_fuel: Optional[float] = None
        self.last_fuel_reading: float = 0

    def update_fuel_reading(self, current_fuel: float, lap_number: int) -> None:
        """Update fuel reading and track consumption when lap changes"""
        if self.current_lap_start_fuel is None:
            self.current_lap_start_fuel = current_fuel

        if current_fuel != self.last_fuel_reading:
            self.last_fuel_reading = current_fuel

    def calculate_fuel_percentage(self, current_fuel: float, max_fuel: float) -> float:
        """Calculate remaining fuel as percentage"""
        if max_fuel <= 0:
            return 0.0
        return (current_fuel / max_fuel) * 100

    def get_current_lap_consumption(self) -> float:
        """Get fuel consumed in current lap so far"""
        if self.current_lap_start_fuel is None:
            return 0.0
        return self.current_lap_start_fuel - self.last_fuel_reading
