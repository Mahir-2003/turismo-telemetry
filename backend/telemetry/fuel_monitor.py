from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class FuelConsumptionData(BaseModel):
    """Model for tracking fuel consumption data"""
    timestamp: datetime
    lap_number: int
    fuel_start: float
    fuel_end: float
    consumption: float


class FuelMonitor:
    """Handles fuel monitoring and calculations"""

    def __init__(self, max_history: int = 5):
        self.consumption_history: List[FuelConsumptionData] = []
        self.max_history = max_history
        self.current_lap_start_fuel: Optional[float] = None
        self.last_fuel_reading: float = 0

    def update_fuel_reading(self, current_fuel: float, lap_number: int) -> None:
        """Update fuel reading and track consumption when lap changes"""
        if self.current_lap_start_fuel is None:
            self.current_lap_start_fuel = current_fuel

        if current_fuel != self.last_fuel_reading:
            self.last_fuel_reading = current_fuel

    def on_lap_complete(self, lap_number: int) -> None:
        """Record fuel consumption for completed lap"""
        if self.current_lap_start_fuel is not None:
            consumption = FuelConsumptionData(
                timestamp=datetime.now(),
                lap_number=lap_number,
                fuel_start=self.current_lap_start_fuel,
                fuel_end=self.last_fuel_reading,
                consumption=self.current_lap_start_fuel - self.last_fuel_reading
            )

            self.consumption_history.append(consumption)
            if len(self.consumption_history) > self.max_history:
                self.consumption_history.pop(0)

            # Reset for next lap
            self.current_lap_start_fuel = self.last_fuel_reading

    def get_average_consumption(self) -> float:
        """Calculate average fuel consumption per lap"""
        if not self.consumption_history:
            return 0.0

        total = sum(data.consumption for data in self.consumption_history)
        return total / len(self.consumption_history)

    def calculate_remaining_laps(self, current_fuel: float) -> float:
        """Estimate remaining laps based on current fuel and consumption history"""
        avg_consumption = self.get_average_consumption()
        if avg_consumption <= 0:
            return 0.0
        return current_fuel / avg_consumption

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
